import { PALETTES, type PaletteKey } from '../palettes'

/**
 * The palette keys the JS layer knows about, derived from `PALETTES`
 * rather than hand-listed so the two cannot drift within this package.
 *
 * This does **not** verify parity with the backend: the canonical
 * `Spora\Services\AgentPictures\Palette` enum lives in a separate repo
 * and is unreachable from a published npm package. The parity contract
 * is enforced in `palettes.spec.ts`, which pins this list against a
 * literal transcription of the PHP cases — updating one without the
 * other fails that test.
 */
export const PALETTE_KEYS: readonly PaletteKey[] = PALETTES.map((p) => p.key)

export function getPaletteKeys(): readonly PaletteKey[] {
  return PALETTE_KEYS
}
