<script setup lang="ts">
import logoUrl from "~/assets/logo.png";

withDefaults(
  defineProps<{
    size?: "sm" | "md" | "lg";
    showName?: boolean;
  }>(),
  {
    size: "md",
    showName: false,
  },
);
</script>

<template>
  <div class="app-logo" :class="`app-logo--${size}`">
    <img
      :src="logoUrl"
      alt="Yo'Well — jus de fruits"
      class="app-logo__img"
      width="80"
      height="80"
    />
    <div v-if="showName" class="app-logo__text">
      <span class="app-logo__name">YO'WELL</span>
      <span class="app-logo__tagline">Jus de fruits</span>
    </div>
  </div>
</template>

<style scoped>
.app-logo {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.app-logo__img {
  display: block;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

.app-logo--sm .app-logo__img {
  width: 2.25rem;
  height: 2.25rem;
}

.app-logo--md .app-logo__img {
  width: 3.5rem;
  height: 3.5rem;
}

.app-logo--lg .app-logo__img {
  width: 5rem;
  height: 5rem;
}

.app-logo__text {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  min-width: 0;
}

.app-logo__name {
  font-size: 1rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  line-height: 1.2;
}

.app-logo__tagline {
  font-size: 0.72rem;
  opacity: 0.75;
  letter-spacing: 0.02em;
}
</style>
