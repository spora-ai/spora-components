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
 */
import { type MaybeRefOrGetter, toValue } from 'vue'

export function formatRelativeTime(iso: MaybeRefOrGetter<string | null | undefined>): string {
  const value = toValue(iso)
  if (typeof value !== 'string' || value === '') return ''

  const then = new Date(value).getTime()
  if (!Number.isFinite(then)) return value

  const now = Date.now()
  const diffSec = Math.round((now - then) / 1000)
  const abs = Math.abs(diffSec)

  if (abs < 60) return diffSec >= 0 ? 'just now' : 'in a moment'

  const minutes = Math.round(diffSec / 60)
  if (Math.abs(minutes) < 60) return `${minutes}m ago`

  const hours = Math.round(minutes / 60)
  if (Math.abs(hours) < 24) return `${hours}h ago`

  const days = Math.round(hours / 24)
  if (Math.abs(days) < 7) return `${days}d ago`

  const weeks = Math.round(days / 7)
  if (Math.abs(weeks) < 5) return `${weeks}w ago`

  const months = Math.round(days / 30)
  if (Math.abs(months) < 12) return `${months}mo ago`

  const years = Math.round(days / 365)
  return `${years}y ago`
}

/**
 * Reactive alias for `formatRelativeTime`. Returns a function that
 * re-evaluates when the underlying ref changes.
 */
export function useRelativeTime(
  iso: MaybeRefOrGetter<string | null | undefined>,
): () => string {
  return () => formatRelativeTime(iso)
}
