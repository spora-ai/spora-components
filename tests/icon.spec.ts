import { mount } from '@vue/test-utils'
import Icon from '@/icons/Icon.vue'

const REGISTERED_NAMES = [
    'bell',
    'download',
    'chevron-right',
    'refresh',
    'plus',
    'minus',
    'maximize',
    'minimize',
]

describe('<Icon>', () => {
    it.each(REGISTERED_NAMES)('renders an <svg> for the registered name "%s"', (name) => {
        const wrapper = mount(Icon, { props: { name } })
        expect(wrapper.find('svg').exists()).toBe(true)
    })

    it('renders the refresh glyph (regression for the missing-icon fallback bug)', () => {
        const wrapper = mount(Icon, { props: { name: 'refresh' } })
        expect(wrapper.find('svg').exists()).toBe(true)
        // The refresh glyph has 4 paths; the puzzle fallback has a single
        // path. Asserting on the multi-path count catches the regression
        // where "refresh" was missing from the bundled registry and the
        // component silently fell back to the puzzle glyph.
        const paths = wrapper.findAll('path')
        expect(paths.length).toBeGreaterThan(1)
        expect(paths[0].attributes('d')).toBeTruthy()
    })

    it('falls back to the puzzle glyph for unknown names', () => {
        const puzzleWrapper = mount(Icon, { props: { name: 'puzzle' } })
        const unknownWrapper = mount(Icon, { props: { name: 'does-not-exist' } })

        expect(unknownWrapper.find('svg').exists()).toBe(true)
        // Both renders must collapse to the same puzzle glyph; assert by
        // comparing path counts and the first path's `d` attribute rather
        // than the full outerHTML (Vue's class-binding can reorder the
        // wrapping <svg>'s class string between mounts).
        const puzzlePaths = puzzleWrapper.findAll('path')
        const unknownPaths = unknownWrapper.findAll('path')
        expect(unknownPaths.length).toBe(puzzlePaths.length)
        expect(unknownPaths[0].attributes('d')).toBe(puzzlePaths[0].attributes('d'))
    })

    it('renders a raw SVG path string as <path d="...">', () => {
        const path = 'M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0z'
        const wrapper = mount(Icon, { props: { name: path } })

        const rendered = wrapper.find('path')
        expect(rendered.exists()).toBe(true)
        expect(rendered.attributes('d')).toBe(path)
    })

    it('also accepts lowercase SVG path strings', () => {
        const path = 'm4 4 16 16'
        const wrapper = mount(Icon, { props: { name: path } })

        const rendered = wrapper.find('path')
        expect(rendered.exists()).toBe(true)
        expect(rendered.attributes('d')).toBe(path)
    })
})