<script setup lang="ts">
withDefaults(
  defineProps<{
    label: string;
    value: string | number;
    icon?: string;
    tone?: "green" | "orange" | "gold" | "blue";
  }>(),
  { tone: "green" },
);
</script>

<template>
  <article class="stat-card" :class="`stat-card--${tone}`">
    <div class="stat-card__top">
      <p class="stat-card__label">{{ label }}</p>
      <span v-if="icon" class="stat-card__icon" aria-hidden="true">{{ icon }}</span>
    </div>
    <p class="stat-card__value">{{ value }}</p>
  </article>
</template>
