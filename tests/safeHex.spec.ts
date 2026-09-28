import { safeHex } from '@/lib/safeHex'

const FALLBACK = '#475569'

describe('safeHex', () => {
    it('accepts a 3-digit hex color (#RGB)', () => {
        expect(safeHex('#fff', FALLBACK)).toBe('#fff')
    })

    it('accepts a 6-digit hex color (#RRGGBB)', () => {
        expect(safeHex('#ffffff', FALLBACK)).toBe('#ffffff')
    })

    it('accepts uppercase hex digits (#RRGGBB case-insensitive)', () => {
        expect(safeHex('#FFFFFF', FALLBACK)).toBe('#FFFFFF')
    })

    it('accepts an 8-digit hex color with alpha (#RRGGBBAA)', () => {
        expect(safeHex('#ffffffff', FALLBACK)).toBe('#ffffffff')
    })

    it('falls back when the leading # is missing', () => {
        expect(safeHex('fff', FALLBACK)).toBe(FALLBACK)
    })

    it('falls back for rgb() syntax (not a hex literal)', () => {
        expect(safeHex('rgb(255, 0, 0)', FALLBACK)).toBe(FALLBACK)
    })

    it('falls back for a CSS-injection attempt', () => {
        expect(safeHex('javascript:alert(1)', FALLBACK)).toBe(FALLBACK)
    })

    it('falls back when the input is null', () => {
        expect(safeHex(null, FALLBACK)).toBe(FALLBACK)
    })

    it('falls back when the input is undefined', () => {
        expect(safeHex(undefined, FALLBACK)).toBe(FALLBACK)
    })

    it('falls back when the input is not a string (number)', () => {
        // @ts-expect-error — exercising the runtime guard for non-string input
        expect(safeHex(12345, FALLBACK)).toBe(FALLBACK)
    })

    it('falls back when the input is an empty string', () => {
        expect(safeHex('', FALLBACK)).toBe(FALLBACK)
    })
})