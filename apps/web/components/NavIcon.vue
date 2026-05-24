<script setup lang="ts">
import type { NavIcon } from "~/constants/navigation";

defineProps<{ name: NavIcon }>();
</script>

<template>
  <svg
    class="nav-icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.75"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <template v-if="name === 'chart'">
      <path d="M3 3v18h18" />
      <path d="M7 14l4-4 4 4 5-6" />
    </template>
    <template v-else-if="name === 'box'">
      <path d="M12 2 3 7v10l9 5 9-5V7l-9-5Z" />
      <path d="M12 22V12" />
      <path d="m3 7 9 5 9-5" />
    </template>
    <template v-else-if="name === 'wallet'">
      <rect x="2" y="6" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
      <circle cx="16" cy="14" r="1.5" fill="currentColor" stroke="none" />
    </template>
    <template v-else-if="name === 'truck'">
      <path d="M1 6h12v9H1V6Z" />
      <path d="M13 9h4l3 3v3h-7V9Z" />
      <circle cx="5.5" cy="17.5" r="2" />
      <circle cx="17.5" cy="17.5" r="2" />
    </template>
    <template v-else-if="name === 'users'">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </template>
    <template v-else-if="name === 'cart'">
      <circle cx="8" cy="21" r="1" />
      <circle cx="19" cy="21" r="1" />
      <path d="M2 2h2l2.4 12.4a1 1 0 0 0 1 .8h9.2a1 1 0 0 0 1-.8L21 6H6" />
    </template>
    <template v-else-if="name === 'history'">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </template>
    <template v-else-if="name === 'shield'">
      <path d="M12 3 4 7v6c0 5 3.5 8 8 8s8-3 8-8V7l-8-4Z" />
    </template>
  </svg>
</template>

<style scoped>
.nav-icon {
  width: 1.15rem;
  height: 1.15rem;
  flex-shrink: 0;
}
</style>
