<script setup lang="ts">
defineProps<{
  message?: string;
}>();
</script>

<template>
  <div class="empty-state">
    <p>{{ message ?? "Aucune donnée pour le moment." }}</p>
  </div>
</template>
