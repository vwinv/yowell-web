<script setup lang="ts">
import { navGroups } from "~/constants/navigation";

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
</script>

<template>
  <aside class="sidebar">
    <div class="sidebar__header">
      <AppLogo size="lg" />
      <p class="sidebar__admin-label">Espace administration</p>
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
