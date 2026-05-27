<script setup lang="ts">
const { user } = useAuth();

const currentPassword = ref("");
const newPassword = ref("");
const confirmPassword = ref("");
const submitting = ref(false);
const error = ref("");
const success = ref("");

function resetForm() {
  currentPassword.value = "";
  newPassword.value = "";
  confirmPassword.value = "";
}

async function submit() {
  error.value = "";
  success.value = "";

  if (!currentPassword.value) {
    error.value = "Indique ton mot de passe actuel.";
    return;
  }

  if (newPassword.value.length < 6) {
    error.value = "Le nouveau mot de passe doit contenir au moins 6 caracteres.";
    return;
  }

  if (newPassword.value !== confirmPassword.value) {
    error.value = "La confirmation du nouveau mot de passe ne correspond pas.";
    return;
  }

  submitting.value = true;
  try {
    await apiFetch(useApiUrl("/auth/password"), {
      method: "PATCH",
      body: {
        currentPassword: currentPassword.value,
        newPassword: newPassword.value,
      },
    });
    success.value = "Mot de passe mis a jour.";
    resetForm();
  } catch (err: unknown) {
    const message =
      err && typeof err === "object" && "data" in err
        ? (err as { data?: { message?: string | string[] } }).data?.message
        : undefined;

    if (Array.isArray(message) && message.length > 0) {
      error.value = message[0] ?? "Impossible de modifier le mot de passe.";
    } else if (typeof message === "string" && message) {
      error.value = message;
    } else {
      error.value = "Impossible de modifier le mot de passe.";
    }
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div>
    <PageHeader
      title="Compte"
      description="Consulte ton profil et change ton mot de passe."
    />

    <div class="account-grid">
      <section class="panel">
        <h2 class="panel__title">Informations du compte</h2>

        <dl v-if="user" class="account-info">
          <div class="account-info__row">
            <dt>Nom</dt>
            <dd>{{ user.name }}</dd>
          </div>
          <div class="account-info__row">
            <dt>E-mail</dt>
            <dd>{{ user.email }}</dd>
          </div>
          <div class="account-info__row">
            <dt>Role</dt>
            <dd>{{ user.role === "admin" ? "Administrateur" : "Equipe" }}</dd>
          </div>
        </dl>
      </section>

      <section class="panel">
        <h2 class="panel__title">Modifier le mot de passe</h2>

        <form class="account-form" @submit.prevent="submit">
          <div class="form-field form-field--wide">
            <label for="current-password">Mot de passe actuel</label>
            <input
              id="current-password"
              v-model="currentPassword"
              type="password"
              autocomplete="current-password"
              required
            />
          </div>

          <div class="form-field form-field--wide">
            <label for="new-password">Nouveau mot de passe</label>
            <input
              id="new-password"
              v-model="newPassword"
              type="password"
              autocomplete="new-password"
              minlength="6"
              required
            />
          </div>

          <div class="form-field form-field--wide">
            <label for="confirm-password">Confirmer le nouveau mot de passe</label>
            <input
              id="confirm-password"
              v-model="confirmPassword"
              type="password"
              autocomplete="new-password"
              minlength="6"
              required
            />
          </div>

          <p v-if="error" class="form-error">{{ error }}</p>
          <p v-if="success" class="form-success">{{ success }}</p>

          <div class="form-actions">
            <button type="submit" class="btn btn--primary" :disabled="submitting">
              {{ submitting ? "Mise a jour..." : "Mettre a jour le mot de passe" }}
            </button>
            <button type="button" class="btn btn--ghost" :disabled="submitting" @click="resetForm">
              Reinitialiser
            </button>
          </div>
        </form>
      </section>
    </div>
  </div>
</template>

<style scoped>
.account-grid {
  display: grid;
  gap: 1.25rem;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
}

.account-info {
  margin: 0;
  display: grid;
  gap: 0.9rem;
}

.account-info__row {
  display: grid;
  gap: 0.2rem;
}

.account-info__row dt {
  font-size: 0.8rem;
  color: var(--muted);
}

.account-info__row dd {
  margin: 0;
  font-weight: 600;
  color: var(--text);
}

.account-form {
  display: grid;
  gap: 0.25rem;
}
</style>
