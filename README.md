# `@spora-ai/components`

Shared Vue 3 component primitives for the Spora ecosystem — `Avatar`, `Icon`,
the agent palette, archetype iconography, and a couple of composables that
host + plugins keep reinventing.

Built as a Vue 3 lib-mode ESM package with peer dependency on `vue@^3.5`. No
runtime styling dependencies — every component uses scoped CSS so consumers
do not need to extend their Tailwind `content` glob to pick up the package.

## Install

```sh
npm install @spora-ai/components
```

## Usage

```vue
<script setup lang="ts">
import '@spora-ai/components/styles'
import { Avatar } from '@spora-ai/components/avatar'
import { Icon } from '@spora-ai/components/icons'
import { paletteFor } from '@spora-ai/components/lib'
</script>

<template>
  <Avatar name="Marketing Lead" :profile-picture="picture" size="md" />
  <Icon name="refresh" />
</template>
```

The stylesheet import is required. Every component ships its own scoped CSS
rather than relying on consumer Tailwind utilities, and Vite emits that CSS to a
single file that nothing imports on your behalf.

### Subpaths

| Subpath | Exports |
|---|---|
| `@spora-ai/components/avatar` | `Avatar`, `ArchetypeIcon`, `AgentAvatar`, `GroupAvatar`, `STATUS_PALETTE` |
| `@spora-ai/components/icons` | `Icon` |
| `@spora-ai/components/composables` | `useInitials`, `useRelativeTime`, `formatRelativeTime` |
| `@spora-ai/components/lib` | `palettes`, `archetypeSvgs`, `safeHex`, `parity/checkPaletteParity` |
| `@spora-ai/components/types` | `ProfilePicture` |
| `@spora-ai/components/styles` | stylesheet (see above) |

## Components

### `<Avatar>`

Renders an agent's profile picture — uploaded image, archetype SVG, or
initials fallback.

```ts
defineProps<{
  name?: string | null
  profilePicture?: ProfilePicture | null
  size?: 'sm' | 'md' | 'lg' | 'xl'
  tone?: string   // CSS background-color for the initials fallback (default: #475569)
}>()
```

Initials are derived internally from `name` via `useInitials`. There is no
public `initials` prop — the dashboard's `Avatar.vue` accepted one, but the
archetype icons carry their own visual identity and the initials prop became
dead surface area.

### `<AgentAvatar>` / `<GroupAvatar>`

Convenience wrappers that take an `{ name?, profile_picture? }` payload
matching the wire shape and forward to `<Avatar>`. No new visual design.

### `<Icon>`

Inline icon registry. Resolution order:

1. Bundled-name lookup (`bell`, `download`, `chevron-right`, etc.)
2. Raw SVG path starting with `M` or `m` followed by a digit
3. Fallback to `puzzle`

60+ bundled glyphs covering the dashboard + plugin needs, including the
newly-added `refresh`, `plus`, `minus`, `maximize`, `minimize`. No raw SVG
blobs — single-`d` strings only (the security posture from the host's
`Icon.vue`).

### Composables

- **`useInitials(name)`** — multi-word-aware two-letter initials. Accepts a
  string (the host's original `useInitials` took a `User` object; this
  package generalises to the raw name). Returns a `ComputedRef<string>`.
- **`useRelativeTime(iso)`** — ISO-8601 → human-readable relative time.
  Static (one-shot) — caller re-renders on demand.

### `lib/`

- **`palettes`** — the canonical 10-colour agent palette
  (`Spora\Services\AgentPictures\Palette` mirror). `paletteFor(key)` returns
  the swatch with a slate fallback.
- **`archetypeSvgs`** — 12 archetypes × 3 variants = 36 inline SVG
  primitives (no `v-html`). `archetypeElements(archetype, variant)` returns
  the shape data.
- **`safeHex(color, fallback)`** — palette color validator (rejects CSS
  injection vectors, accepts `#RGB` / `#RRGGBB` / `#RRGGBBAA`).
- **`parity/checkPaletteParity`** — JS-side check that fails when this
  package's palette list drifts from the canonical PHP source. CI runs
  this on every PR.

## Status palettes (used by team-graph plugin)

`STATUS_PALETTE` in `@spora-ai/components/avatar` maps an `AgentStatus` string
to its display colour + label:

```ts
RUNNING              → 'running' · #10b981
PENDING_APPROVAL     → 'awaiting approval' · #6366f1
AWAITING_SUB_AGENTS  → 'awaiting sub-agent' · #f59e0b
FAILED               → 'failed' · #ef4444
COMPLETED            → 'idle' · #94a3b8
ABORTED              → 'aborted' · #d946ef
```

Unmapped statuses fall through to `'idle'`. The mapping is duck-typed —
`status: string | null | undefined` accepts any wire enum.

## Testing against this package

If your own suite asserts on rendered size or colour, Vitest stubs CSS imports
to empty by default, so those assertions read `0px` and fail. Enable
`test.css: true` in your Vitest config and import the stylesheet in the spec:

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: { css: true },
})
```

## Local development

```sh
npm install
npm run lint       # ESLint
npm test           # Vitest
npm run build      # vue-tsc + Vite lib-mode → dist/
```

## Publishing

`npm version patch && npm publish --access public` from `main`. The
`prepublishOnly` script runs `lint && test && build` first.

## Origin

Extracted from `spora-frontend` and the four shipped plugin frontends
(memories, typst, media-archive, team-graph) — see
`spora-workspace/plans/spora-components.md` for the migration plan.
