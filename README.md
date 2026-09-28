# `@spora-ai/components`

Shared Vue 3 primitives for the Spora ecosystem — `Avatar`, `Icon`, the agent
palette, archetype iconography, and two composables that the host and each
plugin frontend were otherwise reimplementing.

Single source of truth for anything that has to look identical across the
admin app and every plugin. ESM, `vue@^3.5` as a peer dependency, no runtime
dependencies.

## Install

```sh
npm install @spora-ai/components
```

## Usage

```vue
<script setup lang="ts">
import '@spora-ai/components/styles' // required — see note below
import { AgentAvatar, STATUS_PALETTE } from '@spora-ai/components/avatar'
import { Icon } from '@spora-ai/components/icons'
</script>

<template>
  <AgentAvatar :agent="agent" size="md" />
  <Icon name="refresh" />
</template>
```

**The stylesheet import is required.** Components ship their own scoped CSS
rather than depending on your Tailwind utilities, so they are styled even if
you do not use Tailwind at all. Import it once, at your app entry:

```ts
// main.ts
import '@spora-ai/components/styles'
```

### Your utility classes win

Those component defaults are wrapped in `@layer components`, so your own
classes override them. On Tailwind v4 this is automatic: its
`@import "tailwindcss"` puts utilities in a layer that outranks
`components`. On Tailwind v3, or on no Tailwind at all, your unlayered classes
outrank the layer anyway.

```vue
<!-- renders at 3rem, not the 1rem default -->
<Icon name="refresh" class="h-12 w-12" />
```

This works because of the cascade's layer rule: **unlayered styles beat
layered styles regardless of specificity.** Before these defaults were
layered, `.spora-icon { width: 1rem }` outranked a consumer's `h-12` purely by
being unlayered, and every `<Icon class="h-…">` silently collapsed to 1rem. A
consumer that passes no sizing class still gets the package default.

## Subpaths

| Import | Exports |
|---|---|
| `@spora-ai/components/avatar` | `Avatar`, `AgentAvatar`, `GroupAvatar`, `ArchetypeIcon`, `STATUS_PALETTE`, `statusDisplay` |
| `@spora-ai/components/icons` | `Icon` |
| `@spora-ai/components/composables` | `useInitials`, `useRelativeTime`, `formatRelativeTime` |
| `@spora-ai/components/lib` | `PALETTES`, `paletteFor`, `archetypeElements`, `safeHex` |
| `@spora-ai/components/types` | `ProfilePicture` |
| `@spora-ai/components/styles` | the stylesheet |

## API

### `<Avatar>`

Renders a profile picture: uploaded image, archetype SVG, or an initials
fallback. Initials are derived from `name` — there is no `initials` prop.

```ts
{
  name?: string | null          // initials fallback
  profilePicture?: ProfilePicture | null
  size?: 'sm' | 'md' | 'lg' | 'xl'   // default 'md'
}
```

#### Theming the initials tile

The initials fallback paints a tile, and its two colours are the only
themable part of the component. They are exposed as custom properties rather
than props, so a theme-aware app re-themes them from its own stylesheet:

| Property | Default | Applies to |
|---|---|---|
| `--spora-avatar-bg` | `#475569` (slate-600) | `.avatar--initials` background |
| `--spora-avatar-fg` | `#f8fafc` (slate-50) | `.avatar--initials` text |

Set them anywhere that inherits to the avatar — a wrapper, `.dark`, `:root`.
Declare each pair twice only if the values differ per theme:

```css
/* matches `bg-muted text-foreground` */
:root {
  --spora-avatar-bg: hsl(0 0% 95.9%);
  --spora-avatar-fg: hsl(240 10% 3.9%);
}

.dark {
  --spora-avatar-bg: hsl(240 3.7% 15.9%);
  --spora-avatar-fg: hsl(240 10% 98%);
}
```

Leave them unset and the tile is the slate default, so an app that does
nothing looks exactly as it did before. Nothing else is themable this way —
the image and archetype branches take their colours from
`profilePicture`, and sizing is yours via utility classes (see above).

### `<AgentAvatar>` / `<GroupAvatar>`

Thin wrappers taking the wire payload directly:

```vue
<AgentAvatar :agent="agent" />          <!-- { name, profile_picture } -->
<GroupAvatar :group="group" />
```

### `<Icon>`

Inline SVG by name — `bell`, `refresh`, `chevron-right`, `plus`, and 60 more.
Glyphs are single-`d` path data only, so no raw SVG markup reaches the DOM.

### Composables

- `useInitials(name)` — `'Maria Rodriguez'` → `'MR'`, `'Fabian'` → `'FA'`,
  empty → `'?'`. Accepts a ref, getter, or plain string.
- `formatRelativeTime(iso)` — `'5m ago'`, `'2h ago'`, `'yesterday'`,
  `'in a moment'`.
- `useRelativeTime(iso)` — reactive wrapper over `formatRelativeTime`; returns
  a zero-arg function that re-reads the ref on each call.

### `lib`

- `PALETTES` / `paletteFor(key)` — the 10 agent palettes, mirroring
  `Spora\Services\AgentPictures\Palette`. Unknown keys fall back to slate.
- `archetypeElements(archetype, variant)` — 12 archetypes × 3 variants of
  inline SVG primitives, falling back to `assistant/v0`.
- `safeHex(color, fallback)` — hex validator for values that reach a style
  binding. Rejects anything that is not `#RGB` / `#RRGGBB` / `#RRGGBBAA`.

### `STATUS_PALETTE`

Maps a status string to its label and colour, so status pills look the same
in every consumer:

| Status | Label | Colour |
|---|---|---|
| `RUNNING` | running | `#10b981` |
| `PENDING_APPROVAL` | awaiting approval | `#6366f1` |
| `AWAITING_SUB_AGENTS` | awaiting sub-agent | `#f59e0b` |
| `FAILED` | failed | `#ef4444` |
| `COMPLETED` | idle | `#94a3b8` |
| `ABORTED` | aborted | `#d946ef` |

Unmapped statuses fall through to `idle`. Typed as
`string | null | undefined`, so any wire enum is accepted.

## Testing against this package

Vitest stubs CSS imports by default, so assertions on rendered size or colour
read `0px`. Set `test.css: true` and import the stylesheet in the spec if you
assert on layout.

`getComputedStyle` cannot be used to assert that a consumer class *overrides*
a component default. Neither happy-dom nor jsdom implements cascade layers —
jsdom flattens `@layer` blocks and resolves them by source order alone, which
answers a different question than the one a cascade-layer bug poses. Assert
layer membership in the emitted CSS instead, as `tests/cascadeLayer.spec.ts`
does, or check the built bundle in a real browser.

## Development

```sh
npm install
npm run lint       # ESLint
npm test           # Vitest
npm run test:coverage
npm run build      # vue-tsc declarations + Vite lib-mode → dist/
npm run lint:pkg   # publint, validates the exports map against the build
```

`node scripts/verify-exports.mjs` asserts every `exports` target survives into
the packed tarball — it catches a subpath that builds locally but the `files`
field excludes from the published artifact.

MIT
