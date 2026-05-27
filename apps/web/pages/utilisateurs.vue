<script setup lang="ts">
import type { AppUser, UpdateUserInput } from "@yowell/shared";

definePageMeta({
  middleware: ["admin"],
});

const { data, pending, refresh } = await useApiFetch<AppUser[]>(
  useApiUrl("/users"),
  { key: "users-list" },
);

const showForm = ref(false);
const editingUserId = ref<string | null>(null);
const editSubmitting = ref(false);
const editError = ref("");
const editSuccess = ref("");
const editForm = reactive({
  name: "",
  email: "",
  role: "staff" as AppUser["role"],
  password: "",
});

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

function startEditUser(user: AppUser) {
  showForm.value = false;
  editingUserId.value = user.id;
  editForm.name = user.name;
  editForm.email = user.email;
  editForm.role = user.role;
  editForm.password = "";
  editError.value = "";
  editSuccess.value = "";
}

function cancelEditUser() {
  editingUserId.value = null;
  editError.value = "";
  editSuccess.value = "";
  editForm.password = "";
}

async function submitEditUser() {
  if (!editingUserId.value) return;
  editError.value = "";
  editSuccess.value = "";

  if (!editForm.name.trim() || !editForm.email.trim()) {
    editError.value = "Nom et e-mail sont obligatoires.";
    return;
  }
  if (editForm.password && editForm.password.length < 6) {
    editError.value = "Le mot de passe doit contenir au moins 6 caracteres.";
    return;
  }

  editSubmitting.value = true;
  try {
    const body: UpdateUserInput = {
      name: editForm.name.trim(),
      email: editForm.email.trim(),
      role: editForm.role,
    };
    if (editForm.password) body.password = editForm.password;

    await apiFetch(useApiUrl(`/users/${editingUserId.value}`), {
      method: "PATCH",
      body,
    });
    editSuccess.value = "Utilisateur modifie.";
    await refresh();
    editingUserId.value = null;
  } catch {
    editError.value = "Impossible de modifier l'utilisateur (e-mail deja utilise ?).";
  } finally {
    editSubmitting.value = false;
  }
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

      <section v-if="editingUserId" class="panel collapsible-panel">
        <h2 class="panel__title">Modifier un utilisateur</h2>
        <form class="form-grid" @submit.prevent="submitEditUser">
          <div class="form-field">
            <label for="edit-user-name">Nom *</label>
            <input id="edit-user-name" v-model="editForm.name" type="text" required />
          </div>
          <div class="form-field">
            <label for="edit-user-email">E-mail *</label>
            <input id="edit-user-email" v-model="editForm.email" type="email" required />
          </div>
          <div class="form-field">
            <label for="edit-user-password">Nouveau mot de passe (optionnel)</label>
            <input
              id="edit-user-password"
              v-model="editForm.password"
              type="password"
              minlength="6"
              placeholder="Laisser vide pour conserver l'actuel"
            />
          </div>
          <div class="form-field">
            <label for="edit-user-role">Role</label>
            <select id="edit-user-role" v-model="editForm.role">
              <option value="staff">Utilisateur</option>
              <option value="admin">Administrateur</option>
            </select>
          </div>

          <p v-if="editError" class="form-error">{{ editError }}</p>
          <p v-if="editSuccess" class="form-success">{{ editSuccess }}</p>

          <div class="form-actions">
            <button type="submit" class="btn btn--primary" :disabled="editSubmitting">
              {{ editSubmitting ? "Mise a jour..." : "Enregistrer" }}
            </button>
            <button type="button" class="btn btn--ghost" :disabled="editSubmitting" @click="cancelEditUser">
              Annuler
            </button>
          </div>
        </form>
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
                    @click="startEditUser(user)"
                  >
                    Modifier
                  </button>
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
