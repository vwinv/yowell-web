<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    open: boolean;
    title: string;
    size?: "md" | "lg" | "xl";
  }>(),
  { size: "lg" },
);

const emit = defineEmits<{
  close: [];
}>();

function onBackdropClick(event: MouseEvent) {
  if (event.target === event.currentTarget) {
    emit("close");
  }
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === "Escape" && props.open) {
    emit("close");
  }
}

watch(
  () => props.open,
  (isOpen) => {
    if (!import.meta.client) return;
    document.body.style.overflow = isOpen ? "hidden" : "";
  },
  { immediate: true },
);

onMounted(() => {
  if (import.meta.client) {
    window.addEventListener("keydown", onKeydown);
  }
});

onUnmounted(() => {
  if (import.meta.client) {
    window.removeEventListener("keydown", onKeydown);
    document.body.style.overflow = "";
  }
});
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="modal-root"
      role="dialog"
      aria-modal="true"
      :aria-label="title"
      @click="onBackdropClick"
    >
      <div class="modal" :class="`modal--${size}`" @click.stop>
        <header class="modal__header">
          <h2 class="modal__title">
            {{ title }}
          </h2>
          <button
            type="button"
            class="modal__close"
            aria-label="Fermer"
            @click="emit('close')"
          >
            ×
          </button>
        </header>
        <div class="modal__body">
          <slot />
        </div>
      </div>
    </div>
  </Teleport>
</template>
