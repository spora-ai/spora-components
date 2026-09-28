<script setup lang="ts">
/**
 * GroupAvatar — thin wrapper over `<Avatar>` for group-shaped subjects.
 * Forwards `group.name` / `group.profile_picture` straight through; no
 * extra visual design. Mirrors `<AgentAvatar>` for the group domain.
 */
import Avatar from './Avatar.vue'
import type { ProfilePicture } from '../types/profilePicture'

withDefaults(defineProps<{
  group: { name?: string | null; profile_picture?: ProfilePicture | null }
  size?: 'sm' | 'md' | 'lg' | 'xl'
}>(), { size: 'md' })
</script>

<template>
  <Avatar
    :name="group.name"
    :profile-picture="group.profile_picture"
    :size="size"
  />
</template>
