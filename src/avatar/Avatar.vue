<script setup lang="ts">
/**
 * Avatar — renders a subject's profile picture (archetype avatar or
 * uploaded image) with a fallback to initial letters.
 *
 * Resolution order:
 *   1. `profilePicture.kind === 'image'`  → `<img>` from `image_url`,
 *                                            with `image_updated_at` as
 *                                            a `?v=` cache buster
 *   2. `profilePicture.kind === 'avatar'` → inline SVG tile: `fg_color`
 *                                            flows through `currentColor`
 *                                            onto a `bg_color` gradient
 *                                            (135deg, color-mix 60% white)
 *   3. otherwise                          → uppercase initial letters
 *                                            derived from `name` via
 *                                            `useInitials`, on a slate
 *                                            tile (#475569 / #f8fafc)
 *
 * Tailwind-agnostic — every sizing / colour utility has been moved
 * into the scoped `<style>` block, so the package can be consumed by
 * callers that don't ship Tailwind.
 */
import { computed } from 'vue'
import type { ProfilePicture } from '../types/profilePicture'
import { useInitials } from '../composables/useInitials'
import ArchetypeIcon from './ArchetypeIcon.vue'

const props = withDefaults(defineProps<{
  /** Display name; the first letters become the initials fallback. */
  name?: string | null
  /** Optional profile picture. When provided, takes precedence over the initials fallback. */
  profilePicture?: ProfilePicture | null
  size?: 'sm' | 'md' | 'lg' | 'xl'
}>(), {
  size: 'md',
  name: null,
  profilePicture: null,
})

const initials = useInitials(() => props.name ?? '')

const isImage = computed<boolean>(
  () => props.profilePicture?.kind === 'image' && typeof props.profilePicture.image_url === 'string',
)

const isAvatar = computed<boolean>(
  () => props.profilePicture?.kind === 'avatar'
    && typeof props.profilePicture.archetype === 'string'
    && typeof props.profilePicture.variant_key === 'string'
    && typeof props.profilePicture.fg_color === 'string'
    && typeof props.profilePicture.bg_color === 'string',
)

const avatarBgStyle = computed<string | null>(() => {
  if (!isAvatar.value || props.profilePicture === null) return null
  const bg = props.profilePicture.bg_color
  const fg = props.profilePicture.fg_color
  return `background-color: ${bg}; background-image: linear-gradient(135deg, color-mix(in srgb, ${bg} 60%, white), ${bg}); color: ${fg};`
})

const avatarArchetype = computed<string>(() => {
  if (!isAvatar.value || props.profilePicture === null) return 'assistant'
  return props.profilePicture.archetype ?? 'assistant'
})

const avatarVariant = computed<string>(() => {
  if (!isAvatar.value || props.profilePicture === null) return 'v0'
  return props.profilePicture.variant_key ?? 'v0'
})

const ariaLabel = computed<string>(() => {
  if (isImage.value && props.profilePicture !== null) {
    return `Profile picture (uploaded at ${props.profilePicture.image_updated_at ?? 'unknown'})`
  }
  if (isAvatar.value && props.profilePicture !== null) {
    return `Profile picture (${props.profilePicture.archetype ?? 'avatar'})`
  }
  return initials.value
})

const imageSrc = computed<string>(() => {
  // image_updated_at as a query string forces a re-fetch — the MediaArchive
  // URL is stable across re-uploads, so without it the browser would serve
  // the cached image.
  if (!isImage.value || props.profilePicture === null) return ''
  const url = props.profilePicture.image_url ?? ''
  if (url === '') return ''
  const cacheBuster = props.profilePicture.image_updated_at ?? ''
  return cacheBuster === '' ? url : `${url}?v=${encodeURIComponent(cacheBuster)}`
})
</script>

<template>
  <span
    v-if="isImage && profilePicture"
    class="avatar"
    :class="`avatar--${size}`"
    :style="{ backgroundColor: '#f1f5f9' }"
    data-testid="avatar-image"
  >
    <img
      :src="imageSrc"
      class="avatar__image"
      :alt="ariaLabel"
      loading="lazy"
      :data-image-updated-at="profilePicture.image_updated_at ?? ''"
    >
  </span>
  <span
    v-else-if="isAvatar && profilePicture"
    class="avatar"
    :class="`avatar--${size}`"
    :style="avatarBgStyle"
    data-testid="avatar-archetype"
  >
    <ArchetypeIcon
      :archetype="avatarArchetype"
      :variant="avatarVariant"
      :aria-label="ariaLabel"
    />
  </span>
  <span
    v-else
    class="avatar avatar--initials"
    :class="`avatar--${size}`"
    :aria-label="ariaLabel"
    data-testid="avatar-initials"
  >
    {{ initials }}
  </span>
</template>

<style scoped>
.avatar {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  user-select: none;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  line-height: 1;
}

.avatar--sm {
  width: 2rem;
  height: 2rem;
  font-size: 0.65rem;
  border-radius: 0.5rem;
}

.avatar--md {
  width: 2.75rem;
  height: 2.75rem;
  font-size: 0.75rem;
  border-radius: 0.75rem;
}

.avatar--lg {
  width: 3.5rem;
  height: 3.5rem;
  font-size: 0.875rem;
  border-radius: 0.75rem;
}

.avatar--xl {
  width: 5rem;
  height: 5rem;
  font-size: 1rem;
  border-radius: 0.75rem;
}

.avatar__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Initials fallback: slate tile (slate-600 / slate-50), fully-rounded.
 * The 9999px radius overrides the size's border-radius to mirror the
 * host's `rounded-full` behaviour on the initials branch. */
.avatar--initials {
  background-color: #475569;
  color: #f8fafc;
  border-radius: 9999px;
}
</style>
