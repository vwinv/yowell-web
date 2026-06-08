<script setup lang="ts">
import { navigation } from "~/constants/navigation";

const route = useRoute();
const { user, logout, isAdmin, permissionSummary } = useAuth();
const { sidebarOpen, closeSidebar, toggleSidebar } = useSidebar();

const currentPage = computed(() =>
  navigation.find((item) => item.to === route.path),
);

watch(
  () => route.path,
  () => closeSidebar(),
);

function onKeydown(event: KeyboardEvent) {
  if (event.key === "Escape" && sidebarOpen.value) {
    closeSidebar();
  }
}

onMounted(() => {
  if (import.meta.client) {
    window.addEventListener("keydown", onKeydown);
  }
});

onBeforeUnmount(() => {
  if (import.meta.client) {
    window.removeEventListener("keydown", onKeydown);
  }
});
</script>

<template>
  <div class="dashboard">
    <button
      type="button"
      class="sidebar-backdrop"
      :class="{ 'sidebar-backdrop--visible': sidebarOpen }"
      aria-label="Fermer le menu"
      @click="closeSidebar"
    />

    <AppSidebar :open="sidebarOpen" @close="closeSidebar" />

    <div class="dashboard__body">
      <header class="topbar">
        <div class="topbar__row">
          <button
            type="button"
            class="topbar__menu-btn"
            aria-label="Ouvrir le menu"
            :aria-expanded="sidebarOpen"
            @click="toggleSidebar"
          >
            <span class="topbar__menu-icon" aria-hidden="true" />
          </button>
          <AppLogo size="sm" show-name class="topbar__logo" />
          <div class="topbar__breadcrumb">
            <span class="topbar__root">Administration</span>
            <span v-if="currentPage" class="topbar__sep">/</span>
            <span v-if="currentPage" class="topbar__page">{{ currentPage.label }}</span>
          </div>
          <div v-if="user" class="topbar__user">
            <span class="topbar__user-name">{{ user.name }}</span>
            <span
              class="badge"
              :class="{ 'badge--paid': isAdmin }"
              :title="permissionSummary"
            >
              {{ permissionSummary }}
            </span>
            <NuxtLink to="/compte" class="btn btn--ghost btn--sm">
              Mon compte
            </NuxtLink>
            <button type="button" class="btn btn--ghost btn--sm" @click="logout()">
              Déconnexion
            </button>
          </div>
        </div>
        <p v-if="currentPage" class="topbar__hint">{{ currentPage.description }}</p>
      </header>

      <main class="main">
        <slot />
      </main>
    </div>
  </div>
</template>
