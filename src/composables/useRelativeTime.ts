/**
 * ISO-8601 timestamp → human-readable relative-time string.
 *
 * Static: the timestamp is resolved at call time and never ticks, so a label
 * that must age re-invokes the function on a `setInterval`.
 *
 * Usage:
 *   <span>{{ formatRelativeTime(task.updated_at) }}</span>
 *   <span>{{ formatRelativeTime(() => chat.lastMessageAt) }}</span>
 *   <span>{{ formatRelativeTime(stamp, locale) }}</span>
 */
import { type MaybeRefOrGetter, toValue } from 'vue'

/**
 * English keeps the compact templates below (`5m ago`); every other locale
 * goes through `Intl.RelativeTimeFormat` for its plural forms.
 *
 * The compact form is what the host dashboard ships and what this package's
 * assertions pin. Handing English to `Intl` would return `5 minutes ago` and
 * churn them for no gain in correctness.
 */
const COMPACT_ENGLISH = /^en\b/i

/**
 * `diff` is positive for the past and negative for the future, because it is
 * `now - then`. `Intl.RelativeTimeFormat` uses the opposite convention —
 * negative means past — so the value is negated on the way in.
 *
 * English hardcodes the word `ago` next to the signed number, so a future
 * timestamp renders as `-5m ago`. `useRelativeTime.spec.ts` pins that on
 * purpose: correcting it is a separate change.
 */
function relative(locale: string, diff: number, unit: Intl.RelativeTimeFormatUnit): string {
    return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(-diff, unit)
}

interface TimeBucket {
    unit: Intl.RelativeTimeFormatUnit
    /** The signed count of those units — positive for the past, like `diff`. */
    count: number
    /** The suffix the English branch appends; other locales use `unit`. */
    compactSuffix: string
}

/**
 * The thresholds are on the rounded count rather than on the raw diff, so
 * 59.5 minutes reads as an hour and not as 60 minutes.
 *
 * Months and years are counted from the days, not from the weeks: the week
 * bucket ends at five weeks, and a year is not twelve weeks.
 */
function bucketFor(diffSec: number): TimeBucket {
    const minutes = Math.round(diffSec / 60)
    if (Math.abs(minutes) < 60) return { unit: 'minute', count: minutes, compactSuffix: 'm' }

    const hours = Math.round(minutes / 60)
    if (Math.abs(hours) < 24) return { unit: 'hour', count: hours, compactSuffix: 'h' }

    const days = Math.round(hours / 24)
    if (Math.abs(days) < 7) return { unit: 'day', count: days, compactSuffix: 'd' }

    const weeks = Math.round(days / 7)
    if (Math.abs(weeks) < 5) return { unit: 'week', count: weeks, compactSuffix: 'w' }

    const months = Math.round(days / 30)
    if (Math.abs(months) < 12) return { unit: 'month', count: months, compactSuffix: 'mo' }

    const years = Math.round(days / 365)
    return { unit: 'year', count: years, compactSuffix: 'y' }
}

/**
 * "Essentially now" on purpose: English says `just now` rather than
 * `30 seconds ago` to keep list rows quiet, so the other locales get the same
 * treatment instead of the literal value.
 */
function essentiallyNow(locale: string, diffSec: number): string {
    if (!COMPACT_ENGLISH.test(locale)) return relative(locale, 0, 'second')
    if (diffSec >= 0) return 'just now'
    return 'in a moment'
}

/**
 * A locale `Intl` will accept.
 *
 * `Intl` throws a `RangeError` on a structurally invalid tag — `'de_DE'` and
 * `'e'` are both invalid — so a malformed locale is a missing locale, not a
 * crash: it falls back to English.
 */
function safeLocale(locale: string): string {
    if (!locale) return 'en'
    try {
        return Intl.getCanonicalLocales(locale)[0] ?? 'en'
    } catch {
        return 'en'
    }
}

/**
 * A timestamp as a relative string, in `locale`.
 *
 * A locale `Intl` cannot use falls back to English rather than throwing.
 */
export function formatRelativeTime(
    iso: MaybeRefOrGetter<string | null | undefined>,
    locale: MaybeRefOrGetter<string> = 'en',
): string {
    const value = toValue(iso)
    if (typeof value !== 'string' || value === '') return ''

    const lang = safeLocale(toValue(locale))
    const then = new Date(value).getTime()
    if (!Number.isFinite(then)) return value

    const diffSec = Math.round((Date.now() - then) / 1000)
    if (Math.abs(diffSec) < 60) return essentiallyNow(lang, diffSec)

    const bucket = bucketFor(diffSec)
    if (COMPACT_ENGLISH.test(lang)) return `${bucket.count}${bucket.compactSuffix} ago`
    return relative(lang, bucket.count, bucket.unit)
}

/**
 * Reactive alias for `formatRelativeTime`. Returns a function that re-reads
 * the ref (or getter) on every call.
 */
export function useRelativeTime(
    iso: MaybeRefOrGetter<string | null | undefined>,
    locale: MaybeRefOrGetter<string> = 'en',
): () => string {
    return () => formatRelativeTime(iso, locale)
}
