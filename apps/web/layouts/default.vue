<script setup lang="ts">
import { navigation } from "~/constants/navigation";

const route = useRoute();
const { user, logout, isAdmin } = useAuth();

const currentPage = computed(() =>
  navigation.find((item) => item.to === route.path),
);
</script>

<template>
  <div class="dashboard">
    <AppSidebar />

    <div class="dashboard__body">
      <header class="topbar">
        <div class="topbar__row">
          <AppLogo size="sm" show-name class="topbar__logo" />
          <div class="topbar__breadcrumb">
            <span class="topbar__root">Administration</span>
            <span v-if="currentPage" class="topbar__sep">/</span>
            <span v-if="currentPage" class="topbar__page">{{ currentPage.label }}</span>
          </div>
          <div v-if="user" class="topbar__user">
            <span class="topbar__user-name">{{ user.name }}</span>
            <span v-if="isAdmin" class="badge badge--paid">Admin</span>
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
