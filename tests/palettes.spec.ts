import {
    PALETTES,
    paletteFor,
    archetypeElements,
    ARCHETYPES,
    VARIANTS,
} from '@/lib'
import { getPaletteKeys } from '@/lib/parity/checkPaletteParity'
import { STATUS_PALETTE, statusDisplay } from '@/avatar'

// Literal transcription of the `Spora\Services\AgentPictures\Palette`
// cases. This package cannot import the PHP enum, so the two repos are
// kept in lockstep by failing here when one gains or renames a case.
const PHP_PALETTE_CASES = [
    'slate',
    'red',
    'orange',
    'amber',
    'green',
    'teal',
    'blue',
    'indigo',
    'violet',
    'pink',
] as const

const PALETTE_KEYS = getPaletteKeys()

describe('PALETTES', () => {
    it('has exactly 10 entries with the canonical keys', () => {
        expect(PALETTES).toHaveLength(10)
        expect(PALETTES.map((p) => p.key)).toEqual([...PALETTE_KEYS])
    })

    it('has not drifted from the PHP Palette enum cases', () => {
        expect([...PALETTE_KEYS]).toEqual([...PHP_PALETTE_CASES])
    })

    it.each(PHP_PALETTE_CASES)('exposes non-empty background + foreground hex for "%s"', (key) => {
        const swatch = paletteFor(key)
        expect(swatch.background).toMatch(/^#[0-9A-Fa-f]{3,8}$/)
        expect(swatch.foreground).toMatch(/^#[0-9A-Fa-f]{3,8}$/)
        expect(swatch.background).not.toBe('')
        expect(swatch.foreground).not.toBe('')
    })

    it('paletteFor returns the teal swatch for the "teal" key', () => {
        expect(paletteFor('teal').key).toBe('teal')
        expect(paletteFor('teal').background).toBe('#0F766E')
    })

    it('paletteFor falls back to slate for an unknown key', () => {
        expect(paletteFor('unknown-key').key).toBe('slate')
    })
})

describe('STATUS_PALETTE', () => {
    const STATUS_KEYS = [
        'RUNNING',
        'PENDING_APPROVAL',
        'AWAITING_SUB_AGENTS',
        'FAILED',
        'COMPLETED',
        'ABORTED',
    ] as const

    it('exposes all six canonical status keys', () => {
        for (const key of STATUS_KEYS) {
            expect(STATUS_PALETTE).toHaveProperty(key)
            const entry = STATUS_PALETTE[key]
            expect(entry.color).toMatch(/^#[0-9A-Fa-f]{3,8}$/)
            expect(entry.label).not.toBe('')
            expect(entry.ringColor).toMatch(/^#[0-9A-Fa-f]{3,8}$/)
        }
    })
})

describe('statusDisplay', () => {
    it('returns null for null', () => {
        expect(statusDisplay(null)).toBeNull()
    })

    it('returns null for undefined', () => {
        expect(statusDisplay(undefined)).toBeNull()
    })

    it('returns null for an empty string', () => {
        expect(statusDisplay('')).toBeNull()
    })

    it('falls back to the idle bucket for an unmapped status', () => {
        const display = statusDisplay('UNKNOWN')
        expect(display).not.toBeNull()
        expect(display?.label).toBe(STATUS_PALETTE.COMPLETED.label)
    })
})

describe('archetypeElements', () => {
    it('falls back to assistant/v0 for unknown archetype and variant', () => {
        const elements = archetypeElements('unknown', 'unknown')
        expect(elements).toEqual(archetypeElements('assistant', 'v0'))
    })
})

describe('archetype registry', () => {
    it('ARCHETYPES has exactly 12 entries', () => {
        expect(ARCHETYPES).toHaveLength(12)
    })

    it('VARIANTS is exactly ["v0", "v1", "v2"]', () => {
        expect(VARIANTS).toEqual(['v0', 'v1', 'v2'])
    })
})