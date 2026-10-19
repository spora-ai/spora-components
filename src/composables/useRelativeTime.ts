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
 * `diff` is positive for the past and negative for the future, because it
 * is `now - then`. `Intl.RelativeTimeFormat` uses the opposite convention —
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

export function formatRelativeTime(
    iso: MaybeRefOrGetter<string | null | undefined>,
    locale: MaybeRefOrGetter<string> = 'en',
): string {
    const value = toValue(iso)
    if (typeof value !== 'string' || value === '') return ''

    const lang = toValue(locale) || 'en'
    const then = new Date(value).getTime()
    if (!Number.isFinite(then)) return value

    const now = Date.now()
    const diffSec = Math.round((now - then) / 1000)
    const abs = Math.abs(diffSec)

    if (abs < 60) {
        // The sub-minute bucket is "essentially now" on purpose — English says
        // 'just now' rather than '30 seconds ago' to keep list rows quiet, so
        // other locales get the same treatment instead of the literal value.
        return COMPACT_ENGLISH.test(lang)
            ? diffSec >= 0 ? 'just now' : 'in a moment'
            : relative(lang, 0, 'second')
    }

    const minutes = Math.round(diffSec / 60)
    if (Math.abs(minutes) < 60) {
        return COMPACT_ENGLISH.test(lang) ? `${minutes}m ago` : relative(lang, minutes, 'minute')
    }

    const hours = Math.round(minutes / 60)
    if (Math.abs(hours) < 24) {
        return COMPACT_ENGLISH.test(lang) ? `${hours}h ago` : relative(lang, hours, 'hour')
    }

    const days = Math.round(hours / 24)
    if (Math.abs(days) < 7) {
        return COMPACT_ENGLISH.test(lang) ? `${days}d ago` : relative(lang, days, 'day')
    }

    const weeks = Math.round(days / 7)
    if (Math.abs(weeks) < 5) {
        return COMPACT_ENGLISH.test(lang) ? `${weeks}w ago` : relative(lang, weeks, 'week')
    }

    const months = Math.round(days / 30)
    if (Math.abs(months) < 12) {
        return COMPACT_ENGLISH.test(lang) ? `${months}mo ago` : relative(lang, months, 'month')
    }

    const years = Math.round(days / 365)
    return COMPACT_ENGLISH.test(lang) ? `${years}y ago` : relative(lang, years, 'year')
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