/// <reference types="node" />
// The project tsconfig pins `types` to vitest/globals, so this file opts into
// Node types locally rather than widening the ambient types for `src`.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { compileStyleAsync, parse } from '@vue/compiler-sfc'

/**
 * Guards the cascade-layer contract.
 *
 * The components set their defaults in `@layer components` so that a
 * consumer's Tailwind utility classes win. Unlayered, they lose: an
 * unlayered declaration outranks every layered one regardless of
 * specificity, which is how `.spora-icon { width: 1rem }` came to beat a
 * consumer's `<Icon class="h-12">` and collapse 185 call sites in the host
 * app to 1rem.
 *
 * These assertions run the SFC style blocks through the same compiler
 * `@vitejs/plugin-vue` uses, so they test the CSS that actually ships rather
 * than the source formatting wrapped around it.
 */

const SCOPE_ID = 'data-v-cascadeprobe'

// `import.meta.dirname` rather than `import.meta.url`: under Vitest the
// module URL is not a `file:` URL, so fileURLToPath() throws on it.
const PACKAGE_ROOT = resolve(import.meta.dirname, '..')

const COMPONENTS = [
    { file: 'src/icons/Icon.vue', selectors: ['.spora-icon'] },
    { file: 'src/avatar/ArchetypeIcon.vue', selectors: ['.spora-archetype-svg'] },
    {
        file: 'src/avatar/Avatar.vue',
        selectors: [
            '.avatar',
            '.avatar--sm',
            '.avatar--md',
            '.avatar--lg',
            '.avatar--xl',
            '.avatar__image',
            '.avatar--initials',
        ],
    },
] as const

interface TopLevelItem {
    prelude: string
    isBlock: boolean
}

/**
 * Splits a stylesheet into its depth-0 items, skipping comments and strings
 * so a brace inside either cannot throw the depth off. Anything left at depth
 * 0 is by definition not inside a layer.
 */
function topLevelItems(css: string): TopLevelItem[] {
    const items: TopLevelItem[] = []
    let depth = 0
    let start = 0

    // The compiler keeps a block's leading comment attached to its prelude;
    // a comment is not a rule, so it must not count as a stray.
    const preludeOf = (from: number, to: number) => css.slice(from, to).replace(/\/\*[\s\S]*?\*\//g, '').trim()

    for (let i = 0; i < css.length; i++) {
        const c = css[i]

        if (c === '/' && css[i + 1] === '*') {
            i = css.indexOf('*/', i + 2)
            i = i === -1 ? css.length : i + 1
            continue
        }
        if (c === '"' || c === "'") {
            const quote = c
            i++
            while (i < css.length && css[i] !== quote) i += css[i] === '\\' ? 2 : 1
            continue
        }
        if (c === '{') {
            if (depth === 0) items.push({ prelude: preludeOf(start, i), isBlock: true })
            depth++
            continue
        }
        if (c === '}') {
            depth--
            start = i + 1
            continue
        }
        if (c === ';' && depth === 0) {
            const prelude = preludeOf(start, i)
            if (prelude !== '') items.push({ prelude, isBlock: false })
            start = i + 1
        }
    }

    return items
}

async function compileStyleBlocks(file: string): Promise<{ file: string, css: string }> {
    const path = resolve(PACKAGE_ROOT, file)
    const { descriptor } = parse(readFileSync(path, 'utf8'), { filename: path })

    expect(descriptor.styles.length, `${file} must have a <style> block`).toBeGreaterThan(0)
    expect(descriptor.styles.every((s) => s.scoped), `${file} styles must stay scoped`).toBe(true)

    const results = await Promise.all(
        descriptor.styles.map((style) =>
            compileStyleAsync({
                source: style.content,
                filename: path,
                id: SCOPE_ID,
                scoped: style.scoped,
            }),
        ),
    )

    for (const result of results) {
        expect(result.errors, `${file} style block must compile`).toEqual([])
    }

    return { file, css: results.map((r) => r.code).join('\n') }
}

const compiled = await Promise.all(COMPONENTS.map((c) => compileStyleBlocks(c.file)))

describe('component CSS is wrapped in @layer components', () => {
    it('covers every component that ships a style block', () => {
        expect(compiled.map((c) => c.file)).toEqual(COMPONENTS.map((c) => c.file))
    })

    for (const { file, css } of compiled) {
        describe(file, () => {
            it('emits rules inside a layer named components', () => {
                expect(css).toMatch(/@layer\s+components\s*\{/)
            })

            /**
             * The partial-fix guard: adding the layer but stranding one
             * declaration outside it would silently re-break the consumer
             * override for that rule alone, so no depth-0 item may exist.
             */
            it('leaves nothing at the top level, so every rule is inside the layer', () => {
                const strays = topLevelItems(css).filter((item) => item.prelude !== '@layer components')

                expect(strays.map((s) => s.prelude)).toEqual([])
            })

            it('still scopes the selectors to the component', () => {
                for (const selector of COMPONENTS.find((c) => c.file === file)!.selectors) {
                    expect(css).toContain(`${selector}[${SCOPE_ID}]`)
                }
            })

            it('does not claim a layer that would outrank the consumer', () => {
                // A layer named inside a comment is not a layer, so scan the
                // code with comments removed.
                const code = css.replace(/\/\*[\s\S]*?\*\//g, '')

                for (const layer of code.matchAll(/@layer\s+([\w-]+)/g)) {
                    expect(layer[1]).toBe('components')
                }
            })
        })
    }
})
