import { ref } from 'vue'
import { formatRelativeTime, useRelativeTime } from '@/composables/useRelativeTime'

const NOW = new Date('2026-09-27T12:00:00Z')

const MS = {
    second: 1_000,
    minute: 60_000,
    hour: 3_600_000,
    day: 86_400_000,
    week: 7 * 86_400_000,
    month: 30 * 86_400_000,
    year: 365 * 86_400_000,
}

const ago = (n: number, unit: keyof typeof MS): string =>
    new Date(NOW.getTime() - n * MS[unit]).toISOString()

const inN = (n: number, unit: keyof typeof MS): string =>
    new Date(NOW.getTime() + n * MS[unit]).toISOString()

describe('formatRelativeTime', () => {
    beforeEach(() => {
        vi.useFakeTimers()
        vi.setSystemTime(NOW)
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it('returns "just now" for 30 seconds ago', () => {
        expect(formatRelativeTime(ago(30, 'second'))).toBe('just now')
    })

    it('returns "Xm ago" for 5 minutes ago', () => {
        expect(formatRelativeTime(ago(5, 'minute'))).toBe('5m ago')
    })

    it('returns "Xh ago" for 2 hours ago', () => {
        expect(formatRelativeTime(ago(2, 'hour'))).toBe('2h ago')
    })

    it('returns "Xd ago" for 3 days ago', () => {
        expect(formatRelativeTime(ago(3, 'day'))).toBe('3d ago')
    })

    it('returns "Xw ago" for 2 weeks ago', () => {
        expect(formatRelativeTime(ago(2, 'week'))).toBe('2w ago')
    })

    it('returns "Xmo ago" for 3 months ago', () => {
        expect(formatRelativeTime(ago(3, 'month'))).toBe('3mo ago')
    })

    it('returns "Xy ago" for 2 years ago', () => {
        expect(formatRelativeTime(ago(2, 'year'))).toBe('2y ago')
    })

    it('returns empty string for null', () => {
        expect(formatRelativeTime(null)).toBe('')
    })

    it('returns empty string for empty string', () => {
        expect(formatRelativeTime('')).toBe('')
    })

    it('returns "in a moment" for a future timestamp 30 seconds away', () => {
        // The current source treats future <60s as "in a moment" but a
        // future 1-minute value goes through the minutes bucket as "-1m ago".
        // Assert against the actual behaviour so the test pins the real contract.
        expect(formatRelativeTime(inN(30, 'second'))).toBe('in a moment')
    })

    it('returns the raw input for an invalid string', () => {
        expect(formatRelativeTime('not-a-date')).toBe('not-a-date')
    })
})

describe('formatRelativeTime — locale awareness', () => {
    beforeEach(() => {
        vi.useFakeTimers()
        vi.setSystemTime(NOW)
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it('renders a non-English locale through Intl, not the compact templates', () => {
        expect(formatRelativeTime(ago(5, 'minute'), 'de')).toBe('vor 5 Minuten')
        expect(formatRelativeTime(ago(2, 'hour'), 'de')).toBe('vor 2 Stunden')
        expect(formatRelativeTime(ago(3, 'day'), 'de')).toBe('vor 3 Tagen')
    })

    it('renders the sub-minute bucket as "now" rather than a literal diff', () => {
        expect(formatRelativeTime(ago(30, 'second'), 'de')).toBe('jetzt')
    })

    it('keeps the compact English output byte-identical when "en" is passed explicitly', () => {
        // The compact form is what the dashboard ships and what the block above
        // pins; passing the locale must not be the thing that changes it.
        expect(formatRelativeTime(ago(5, 'minute'), 'en')).toBe('5m ago')
        expect(formatRelativeTime(ago(30, 'second'), 'en')).toBe('just now')
        expect(formatRelativeTime(ago(3, 'month'), 'en')).toBe('3mo ago')
    })

    it('treats an English regional variant as English', () => {
        expect(formatRelativeTime(ago(5, 'minute'), 'en-GB')).toBe('5m ago')
    })

    it('falls back to the compact form for an empty locale', () => {
        expect(formatRelativeTime(ago(5, 'minute'), '')).toBe('5m ago')
    })

    it('accepts a reactive locale', () => {
        const lang = ref('en')
        expect(formatRelativeTime(ago(5, 'minute'), lang)).toBe('5m ago')

        lang.value = 'de'
        expect(formatRelativeTime(ago(5, 'minute'), lang)).toBe('vor 5 Minuten')
    })

    it('renders a future timestamp correctly for a non-English locale', () => {
        expect(formatRelativeTime(inN(5, 'minute'), 'de')).toBe('in 5 Minuten')
    })

    // Pins a known discrepancy rather than hiding it: English hardcodes the
    // word `ago` beside a signed number, so a future timestamp reads as
    // "-5m ago". The sign is only corrected on the Intl path. Fixing English
    // means changing the assertion below, which was written deliberately to
    // document current behaviour — so it is a separate change.
    it('still renders a future timestamp as "-Xm ago" in English', () => {
        expect(formatRelativeTime(inN(5, 'minute'), 'en')).toBe('-5m ago')
    })
})
describe('useRelativeTime', () => {
    beforeEach(() => {
        vi.useFakeTimers()
        vi.setSystemTime(NOW)
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it('wraps formatRelativeTime behind a zero-arg callable', () => {
        expect(useRelativeTime(ago(5, 'minute'))()).toBe('5m ago')
    })

    it('re-evaluates when the underlying ref changes', () => {
        const stamp = ref(ago(5, 'minute'))
        const relative = useRelativeTime(stamp)

        expect(relative()).toBe('5m ago')

        stamp.value = ago(2, 'hour')
        expect(relative()).toBe('2h ago')
    })

    it('accepts a getter and reads it on every call', () => {
        let hoursAgo = 3
        const relative = useRelativeTime(() => ago(hoursAgo, 'hour'))

        expect(relative()).toBe('3h ago')

        hoursAgo = 6
        expect(relative()).toBe('6h ago')
    })

    it('handles a nullish timestamp without throwing', () => {
        expect(useRelativeTime(null)()).toBe('')
        expect(useRelativeTime(undefined)()).toBe('')
    })
})

describe('an unusable locale', () => {
    beforeEach(() => {
        vi.useFakeTimers()
        vi.setSystemTime(NOW)
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it('falls back to English instead of throwing', () => {
        // `Intl.RelativeTimeFormat` throws a RangeError on a structurally
        // invalid tag. A broken locale is a broken locale, not a crash.
        expect(() => formatRelativeTime(ago(5, 'minute'), 'de_DE')).not.toThrow()
        expect(formatRelativeTime(ago(5, 'minute'), 'de_DE')).toBe('5m ago')
        expect(formatRelativeTime(ago(5, 'minute'), 'e')).toBe('5m ago')
        expect(formatRelativeTime(ago(5, 'minute'), '')).toBe('5m ago')
    })

    it('still renders a valid locale in that locale', () => {
        expect(formatRelativeTime(ago(5, 'minute'), 'de')).toBe('vor 5 Minuten')
    })
})
