/// <reference types="node" />
// The project tsconfig pins `types` to vitest/globals, so this file opts into
// Node types locally rather than widening the ambient types for `src`.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { compileStyleAsync, parse } from '@vue/compiler-sfc'
import { mount } from '@vue/test-utils'
import Avatar from '@/avatar/Avatar.vue'

/**
 * Guards the theming contract on the initials fallback tile.
 *
 * `Avatar` has three render branches and only the third paints a background
 * of its own, so a colour prop would be inert on two branches out of three —
 * its effect would silently depend on which branch happened to fire. The
 * package therefore exposes the two tile colours as custom properties, with
 * the pre-existing slate hexes as fallbacks, and a consumer re-themes from
 * its own stylesheet.
 *
 * Two things about the test environment shape how this is asserted:
 *
 *  1. happy-dom drops `@layer` blocks wholesale, so a stylesheet assembled
 *     from the shipped CSS applies nothing at all. `cascadeLayer.spec.ts`
 *     owns the layer contract; for custom-property substitution the layer is
 *     orthogonal, so the injection below unwraps it. What is injected is
 *     still the compiler's own output — only the outer `@layer components
 *     { … }` wrapper is removed, and the compiled declarations are untouched.
 *  2. Scoped selectors are baked with an id at compile time, so the style is
 *     compiled against the scope id the mounted element actually carries
 *     rather than a guessed one — otherwise nothing would match.
 *
 * `import.meta.dirname` rather than `import.meta.url`: under Vitest the module
 * URL is not a `file:` URL, so fileURLToPath() throws on it.
 */

const PACKAGE_ROOT = resolve(import.meta.dirname, '..')
const AVATAR_SFC = resolve(PACKAGE_ROOT, 'src/avatar/Avatar.vue')

const SLATE_BG = '#475569'
const SLATE_FG = '#f8fafc'

/**
 * Removes the single `@layer components { … }` wrapper the whole stylesheet
 * sits in, so happy-dom will apply the rules inside it.
 */
function unwrapLayer(css: string): string {
    const open = css.indexOf('@layer components')
    expect(open, 'the Avatar stylesheet must be layered').not.toBe(-1)

    const body = css.indexOf('{', open)
    const close = css.lastIndexOf('}')
    expect(body, 'the layer must have a body').toBeLessThan(close)

    return css.slice(body + 1, close)
}

/**
 * Compiles the real SFC style block against a given scope id, exactly as
 * `@vitejs/plugin-vue` would.
 */
async function compileAvatarStyle(id: string): Promise<string> {
    const { descriptor } = parse(readFileSync(AVATAR_SFC, 'utf8'), { filename: AVATAR_SFC })
    expect(descriptor.styles.length).toBeGreaterThan(0)

    const compiled = await compileStyleAsync({
        source: descriptor.styles[0].content,
        filename: AVATAR_SFC,
        id,
        scoped: descriptor.styles[0].scoped,
    })

    expect(compiled.errors).toEqual([])
    return compiled.code
}

/**
 * Mounts the initials branch, injects the compiled stylesheet, and returns
 * the live element plus its computed style.
 */
async function mountInitialsTile(): Promise<{ tile: HTMLElement, computed: CSSStyleDeclaration }> {
    const wrapper = mount(Avatar, { props: { name: 'Max Mustermann' }, attachTo: document.body })
    const tile = wrapper.get('[data-testid="avatar-initials"]').element

    // The compiled selectors only match if they carry the scope id Vue
    // actually stamped on this render.
    const scopeId = Object.keys(wrapper.get('[data-testid="avatar-initials"]').attributes())
        .find((attr) => attr.startsWith('data-v-'))
    expect(scopeId, 'the mounted tile must carry a scoped-style attribute').toBeDefined()

    const style = document.createElement('style')
    style.textContent = unwrapLayer(await compileAvatarStyle(scopeId!.slice('data-v-'.length)))
    document.head.appendChild(style)

    return { tile, computed: getComputedStyle(tile) }
}

afterEach(() => {
    document.head.querySelectorAll('style').forEach((el) => el.remove())
    document.body.innerHTML = ''
    for (const name of ['--spora-avatar-bg', '--spora-avatar-fg']) {
        document.documentElement.style.removeProperty(name)
    }
})

describe('Avatar initials tile theming', () => {
    it('falls back to the slate tile when no custom property is set', async () => {
        const { tile, computed } = await mountInitialsTile()

        expect(tile.classList.contains('avatar--initials')).toBe(true)
        expect(computed.backgroundColor).toBe(SLATE_BG)
        expect(computed.color).toBe(SLATE_FG)
    })

    it('resolves the tile from --spora-avatar-bg / --spora-avatar-fg when a consumer sets them', async () => {
        const { computed } = await mountInitialsTile()

        document.documentElement.style.setProperty('--spora-avatar-bg', 'hsl(240 3.7% 15.9%)')
        document.documentElement.style.setProperty('--spora-avatar-fg', 'hsl(240 10% 98%)')

        expect(computed.backgroundColor).toBe('hsl(240 3.7% 15.9%)')
        expect(computed.color).toBe('hsl(240 10% 98%)')
    })

    it('keeps the fallback for whichever half the consumer leaves unset', async () => {
        const { computed } = await mountInitialsTile()

        document.documentElement.style.setProperty('--spora-avatar-bg', 'hsl(0 0% 95.9%)')

        expect(computed.backgroundColor).toBe('hsl(0 0% 95.9%)')
        expect(computed.color).toBe(SLATE_FG)
    })

    /**
     * The shipped stylesheet is the artifact consumers load, so the fallback
     * has to be visible in it and not only in a DOM assertion. Guarded
     * separately because the DOM assertions above inject a layer-stripped
     * copy, which would not notice if the layer stopped being applied.
     */
    it('ships the custom properties with the slate hexes as fallbacks, inside the layer', async () => {
        const css = await compileAvatarStyle('themeprobe')
        const rule = css.match(/\.avatar--initials\[data-v-themeprobe\]\s*\{[^}]*\}/)

        expect(rule, 'the scoped initials rule must be emitted').not.toBeNull()
        expect(rule![0]).toContain(`background-color: var(--spora-avatar-bg, ${SLATE_BG});`)
        expect(rule![0]).toContain(`color: var(--spora-avatar-fg, ${SLATE_FG});`)
        expect(rule![0]).toContain('border-radius: 9999px;')

        expect(css.indexOf(rule![0])).toBeGreaterThan(css.indexOf('@layer components'))
    })
})
