<script setup lang="ts">
import type { AppModulePermission, CreateUserInput, UserRole } from "@yowell/shared";

const emit = defineEmits<{
  success: [];
}>();

const email = ref("");
const name = ref("");
const password = ref("");
const role = ref<UserRole>("staff");
const permissions = ref<AppModulePermission[]>([]);

const submitting = ref(false);
const error = ref("");
const success = ref("");

function resetForm() {
  email.value = "";
  name.value = "";
  password.value = "";
  role.value = "staff";
  permissions.value = [];
}

async function submit() {
  error.value = "";
  success.value = "";

  if (!email.value.trim() || !name.value.trim() || password.value.length < 6) {
    error.value = "Remplis tous les champs (mot de passe min. 6 caractères).";
    return;
  }

  submitting.value = true;
  try {
    const body: CreateUserInput = {
      email: email.value.trim(),
      name: name.value.trim(),
      password: password.value,
      role: role.value,
    };
    if (role.value === "staff") {
      body.permissions = [...permissions.value];
    }

    await apiFetch(useApiUrl("/users"), {
      method: "POST",
      body,
    });
    success.value = "Utilisateur créé.";
    resetForm();
    emit("success");
  } catch {
    error.value = "Impossible de créer l'utilisateur (e-mail déjà utilisé ?).";
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <form class="form-grid" @submit.prevent="submit">
    <div class="form-field">
      <label for="user-name">Nom *</label>
      <input id="user-name" v-model="name" type="text" required />
    </div>
    <div class="form-field">
      <label for="user-email">E-mail *</label>
      <input id="user-email" v-model="email" type="email" required />
    </div>
    <div class="form-field">
      <label for="user-password">Mot de passe *</label>
      <input
        id="user-password"
        v-model="password"
        type="password"
        minlength="6"
        required
      />
    </div>
    <div class="form-field">
      <label for="user-role">Type de compte</label>
      <select id="user-role" v-model="role">
        <option value="staff">Utilisateur</option>
        <option value="admin">Administrateur</option>
      </select>
    </div>

    <PermissionCheckboxes
      v-if="role === 'staff'"
      v-model="permissions"
      class="form-field--wide"
    />

    <p v-if="error" class="form-message form-message--error">{{ error }}</p>
    <p v-if="success" class="form-message form-message--success">{{ success }}</p>

    <div class="form-actions">
      <button type="submit" class="btn btn--primary" :disabled="submitting">
        {{ submitting ? "Création…" : "Créer le compte" }}
      </button>
    </div>
  </form>
</template>
