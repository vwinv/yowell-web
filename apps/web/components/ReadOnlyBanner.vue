<script setup lang="ts">
defineProps<{
  show?: boolean;
}>();
</script>

<template>
  <p v-if="show" class="readonly-banner" role="status">
    Consultation seule — vous n'avez pas les droits d'action sur ce module.
  </p>
</template>

<style scoped>
.readonly-banner {
  margin: 0 0 1rem;
  padding: 0.65rem 0.9rem;
  border-radius: 8px;
  background: var(--surface-2, #f4f4f5);
  border: 1px solid var(--border, #e4e4e7);
  color: var(--muted, #71717a);
  font-size: 0.9rem;
}
</style>
