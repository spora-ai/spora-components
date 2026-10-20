/**
 * ISO-8601 timestamp → human-readable relative-time string.
 *
 * Two in-tree implementations existed before the extraction:
 *
 *   - host DashboardAgentCard.vue:194 — minute / hour / day / week /
 *     month / year buckets, future-aware (`'in a moment'` for
 *     negative diffs)
 *   - plugin AgentDetailPanel.vue:165 — minute / hour / 'yesterday'
 *     only, no future handling
 *
 * The host's bucketing is more comprehensive and ships in the dashboard
 * already; this helper is its behaviour, lifted into the shared
 * package. Both call sites migrate to this function.
 *
 * Reactivity: **static** (one-shot render). The composable accepts a
 * reactive `MaybeRefOrGetter<string | null>` and resolves once. Callers
 * that need ticking updates re-invoke by binding to a reactive value
 * or by mounting on a `setInterval`.
 *
 * Usage:
 *   <span>{{ formatRelativeTime(task.updated_at) }}</span>
 *   <span>{{ formatRelativeTime(() => chat.lastMessageAt) }}</span>
 *   <span>{{ formatRelativeTime(stamp, locale) }}</span>
 */
import { type MaybeRefOrGetter, toValue } from 'vue'

/**
 * English renders through the compact templates below rather than
 * `Intl.RelativeTimeFormat`, because the compact form (`5m ago`) is what
 * the dashboard has always shipped and what its 8 assertions pin. Handing
 * English to `Intl` would return `5 minutes ago` and churn every one of
 * them for no gain in correctness — so the English branch is frozen and
 * every other locale goes through `Intl` for its plural forms.
 */
const COMPACT_ENGLISH = /^en\b/i

/**
 * `diff` is positive for the past and negative for the future, because it is
 * `now - then`. `Intl.RelativeTimeFormat` uses the opposite convention —
 * negative means past — so the value is negated on the way in.
 *
 * The English branch never needed this because it hardcodes the word `ago`
 * next to a signed number. That is also why English is wrong for future
 * timestamps: 5 minutes ahead renders as `-5m ago`. Correcting it is a
 * separate change, because `useRelativeTime.spec.ts` pins that behaviour on
 * purpose, so this function preserves it for English and renders other
 * locales correctly.
 */
function relative(locale: string, diff: number, unit: Intl.RelativeTimeFormatUnit): string {
    return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(-diff, unit)
}

/** The unit a diff is counted in, the count, and the compact English suffix. */
interface TimeBucket {
    /** The `Intl` unit the count is expressed in. */
    unit: Intl.RelativeTimeFormatUnit
    /** The signed count of those units — positive for the past, like `diff`. */
    count: number
    /** The suffix the compact English form appends to the count. */
    compactSuffix: string
}

/**
 * The bucket a diff of at least a minute falls into.
 *
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
 * The sub-minute bucket.
 *
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
 * A timestamp as a relative string, in `locale`.
 *
 * An empty locale falls back to English rather than reaching `Intl`: an empty
 * string is a missing locale, and `Intl` throws a `RangeError` on it.
 */
export function formatRelativeTime(
    iso: MaybeRefOrGetter<string | null | undefined>,
    locale: MaybeRefOrGetter<string> = 'en',
): string {
    const value = toValue(iso)
    if (typeof value !== 'string' || value === '') return ''

    const lang = toValue(locale) || 'en'
    const then = new Date(value).getTime()
    if (!Number.isFinite(then)) return value

    const diffSec = Math.round((Date.now() - then) / 1000)
    if (Math.abs(diffSec) < 60) return essentiallyNow(lang, diffSec)

    const bucket = bucketFor(diffSec)
    if (COMPACT_ENGLISH.test(lang)) return `${bucket.count}${bucket.compactSuffix} ago`
    return relative(lang, bucket.count, bucket.unit)
}

/**
 * Reactive alias for `formatRelativeTime`. Returns a function that
 * re-evaluates when the underlying ref changes.
 */
export function useRelativeTime(
    iso: MaybeRefOrGetter<string | null | undefined>,
    locale: MaybeRefOrGetter<string> = 'en',
): () => string {
    return () => formatRelativeTime(iso, locale)
}
