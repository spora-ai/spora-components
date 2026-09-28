/**
 * Multi-word-aware two-letter initials.
 *
 * The host's original `useInitials` took a `User | null` (extracting
 * `name` / `email` from it). The shared package generalises the
 * helper to the raw name string — the host's call sites wrap their
 * `User` refs with `() => user.value?.name ?? ''`, plugin call sites
 * pass an agent name directly.
 *
 * Fallback chain:
 *   1. First letter of each of the first two whitespace-separated name
 *      parts ("Max Mustermann" → "MM")
 *   2. First 2 chars of the single part ("Jo" → "JO")
 *   3. Single char upper-cased ("A" → "A")
 *   4. `'?'` for empty / nullish input
 *
 * Always upper-case.
 *
 * Usage:
 *   const initials = useInitials(() => agent.name)
 *   // → ComputedRef<string>
 */
import { computed, type ComputedRef, type MaybeRefOrGetter, toValue } from 'vue'

export function useInitials(
  name: MaybeRefOrGetter<string | null | undefined>,
): ComputedRef<string> {
  return computed<string>(() => {
    const trimmed = (toValue(name) ?? '').trim()
    if (trimmed === '') return '?'
    const parts = trimmed.split(/\s+/u).filter((p) => p !== '')
    if (parts.length >= 2) {
      return ((parts[0][0] ?? '') + (parts[1][0] ?? '')).toUpperCase()
    }
    const first = parts[0] ?? ''
    if (first.length >= 2) return first.slice(0, 2).toUpperCase()
    return first.toUpperCase()
  })
}
