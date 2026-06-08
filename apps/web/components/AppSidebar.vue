<script setup lang="ts">
import { navGroups } from "~/constants/navigation";

defineProps<{
  open?: boolean;
}>();

const emit = defineEmits<{
  close: [];
}>();

const route = useRoute();
const { isAdmin } = useAuth();

const visibleGroups = computed(() =>
  navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) => !item.adminOnly || isAdmin.value,
      ),
    }))
    .filter((group) => group.items.length > 0),
);

function isActive(path: string) {
  return route.path === path;
}

function onNavigate() {
  emit("close");
}
</script>

<template>
  <aside class="sidebar" :class="{ 'sidebar--open': open }">
    <div class="sidebar__header">
      <AppLogo size="lg" />
      <p class="sidebar__admin-label">Espace administration</p>
      <button
        type="button"
        class="sidebar__close"
        aria-label="Fermer le menu"
        @click="emit('close')"
      >
        ×
      </button>
    </div>

    <div
      v-for="group in visibleGroups"
      :key="group.id"
      class="sidebar__group"
    >
      <p class="sidebar__section-label">{{ group.title }}</p>
      <nav class="sidebar__nav" :aria-label="group.title">
        <NuxtLink
          v-for="item in group.items"
          :key="item.to"
          :to="item.to"
          class="sidebar__link"
          :class="{ 'sidebar__link--active': isActive(item.to) }"
          @click="onNavigate"
        >
          <span class="sidebar__link-icon">
            <NavIcon :name="item.icon" />
          </span>
          <span class="sidebar__link-text">
            <span class="sidebar__link-label">{{ item.label }}</span>
            <span class="sidebar__link-desc">{{ item.description }}</span>
          </span>
        </NuxtLink>
      </nav>
    </div>

    <div class="sidebar__footer">
      <p class="sidebar__footer-text">
        Ventes · Clients · Stock · Comptabilité
      </p>
    </div>
  </aside>
</template>
