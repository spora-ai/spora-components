import { PALETTES, type PaletteKey } from '../palettes'

/**
 * Canonical palette list mirrored from
 * `Spora\Services\AgentPictures\Palette` on the backend. The mapping
 * is the contract for which palette keys are valid across the wire
 * (AgentPicture rows store `palette_key` only — the server resolves
 * the hex pairs at read time).
 *
 * This file is the source of truth for the JS side. `palettes.ts`
 * imports `PALETTES` from this module so the runtime data and the
 * parity contract live together; tests assert `PALETTES.map(p => p.key)`
 * matches the PHP enum.
 */
export const PALETTE_KEYS: readonly PaletteKey[] = PALETTES.map((p) => p.key)

/**
 * Returns the list of palette keys the JS layer knows about. Used by
 * `palettes.spec.ts` to assert parity against the canonical PHP
 * source — a single source of truth, asserted from one direction.
 */
export function getPaletteKeys(): readonly PaletteKey[] {
  return PALETTE_KEYS
}
