<script setup lang="ts">
import type { AppUser } from "@yowell/shared";

definePageMeta({
  middleware: ["admin"],
});

const { data, pending, refresh } = await useApiFetch<AppUser[]>(
  useApiUrl("/users"),
  { key: "users-list" },
);

const showForm = ref(false);
const UserFormLazy = defineAsyncComponent(
  () => import("~/components/UserForm.vue"),
);

function roleLabel(role: AppUser["role"]) {
  return role === "admin" ? "Administrateur" : "Utilisateur";
}

async function deactivateUser(user: AppUser) {
  if (!confirm(`Désactiver le compte de ${user.name} ?`)) return;
  await apiFetch(useApiUrl(`/users/${user.id}`), { method: "DELETE" });
  await refresh();
}
</script>

<template>
  <div>
    <PageHeader
      title="Utilisateurs"
      description="Comptes ayant accès à l'administration — chaque action est journalisée."
    />

    <p v-if="pending" class="loading">Chargement des utilisateurs</p>

    <template v-else>
      <div class="stock-actions">
        <button
          type="button"
          class="btn btn--primary"
          @click="showForm = !showForm"
        >
          {{ showForm ? "Masquer le formulaire" : "+ Nouvel utilisateur" }}
        </button>
      </div>

      <section v-if="showForm" class="panel collapsible-panel">
        <h2 class="panel__title">Nouveau compte</h2>
        <UserFormLazy @success="refresh(); showForm = false" />
      </section>

      <section class="panel">
        <h2 class="panel__title">Comptes actifs</h2>
        <div v-if="data?.length" class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>E-mail</th>
                <th>Rôle</th>
                <th>Créé le</th>
                <th />
              </tr>
            </thead>
            <tbody>
              <tr v-for="user in data" :key="user.id">
                <td>{{ user.name }}</td>
                <td>{{ user.email }}</td>
                <td>
                  <span
                    class="badge"
                    :class="{ 'badge--paid': user.role === 'admin' }"
                  >
                    {{ roleLabel(user.role) }}
                  </span>
                </td>
                <td>
                  {{ new Date(user.createdAt).toLocaleDateString("fr-FR") }}
                </td>
                <td class="table-actions">
                  <button
                    type="button"
                    class="btn btn--ghost btn--sm"
                    @click="deactivateUser(user)"
                  >
                    Désactiver
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <EmptyState v-else message="Aucun utilisateur actif." />
      </section>
    </template>
  </div>
</template>
