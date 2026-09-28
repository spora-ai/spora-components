/**
 * Status palette for @spora/components — single source of truth for
 * AgentAvatar's status dot + the plugin's status pill colour map.
 *
 * `ABORTED` uses fuchsia-500 instead of a near-violet: the host's
 * brand accent is violet (#6D28D9), so two near-blue swatches on
 * the same canvas read as duplicates and operators can't tell at a
 * glance whether an aborted node belongs to the same colour family
 * as the brand. Fuchsia lives far enough down the spectrum to remain
 * distinct under both light/dark and never collides with our accent.
 */
export interface StatusDisplay {
  color: string
  label: string
  ringColor: string
}

export const STATUS_PALETTE: Record<string, StatusDisplay> = {
  RUNNING:              { color: '#10b981', label: 'running',              ringColor: '#d1fae5' },
  PENDING_APPROVAL:     { color: '#6366f1', label: 'awaiting approval',    ringColor: '#e0e7ff' },
  AWAITING_SUB_AGENTS:  { color: '#f59e0b', label: 'awaiting sub-agent',   ringColor: '#fef3c7' },
  FAILED:               { color: '#ef4444', label: 'failed',               ringColor: '#fee2e2' },
  COMPLETED:            { color: '#94a3b8', label: 'idle',                 ringColor: '#f1f5f9' },
  ABORTED:              { color: '#d946ef', label: 'aborted',              ringColor: '#fae8ff' },
}

export function statusDisplay(status: string | null | undefined): StatusDisplay | null {
  if (typeof status !== 'string' || status === '') return null
  return STATUS_PALETTE[status] ?? { color: '#94a3b8', label: 'idle', ringColor: '#f1f5f9' }
}
