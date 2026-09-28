<script setup lang="ts">
/**
 * AgentAvatar — thin wrapper over `<Avatar>` for agent-shaped subjects.
 * Forwards `agent.name` / `agent.profile_picture` straight through; no
 * extra visual design. Exists so call sites read like the domain term
 * ("agent avatar") instead of spelling out the field mapping inline.
 */
import Avatar from './Avatar.vue'
import type { ProfilePicture } from '../types/profilePicture'

withDefaults(defineProps<{
  agent: { name?: string | null; profile_picture?: ProfilePicture | null }
  size?: 'sm' | 'md' | 'lg' | 'xl'
}>(), { size: 'md' })
</script>

<template>
  <Avatar
    :name="agent.name"
    :profile-picture="agent.profile_picture"
    :size="size"
  />
</template>
