<script setup lang="ts">
definePageMeta({
  layout: false,
});

const { login } = useAuth();

const email = ref("");
const password = ref("");
const submitting = ref(false);
const error = ref("");

async function submit() {
  error.value = "";
  submitting.value = true;
  try {
    await login({
      email: email.value.trim(),
      password: password.value,
    });
    await navigateTo("/");
  } catch {
    error.value = "E-mail ou mot de passe incorrect.";
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div class="login-page">
    <div class="login-card panel">
      <AppLogo size="lg" show-name class="login-card__logo" />
      <h1 class="login-card__title">Connexion</h1>
      <p class="login-card__subtitle">
        Accès à l'espace d'administration Yo'Well
      </p>

      <form class="login-form" @submit.prevent="submit">
        <div class="form-field form-field--wide">
          <label for="login-email">E-mail</label>
          <input
            id="login-email"
            v-model="email"
            type="email"
            autocomplete="username"
            required
          />
        </div>
        <div class="form-field form-field--wide">
          <label for="login-password">Mot de passe</label>
          <input
            id="login-password"
            v-model="password"
            type="password"
            autocomplete="current-password"
            required
          />
        </div>

        <p v-if="error" class="form-error">{{ error }}</p>

        <button
          type="submit"
          class="btn btn--primary login-form__submit"
          :disabled="submitting"
        >
          {{ submitting ? "Connexion…" : "Se connecter" }}
        </button>
      </form>

      <p class="login-card__hint">
        Premier démarrage : <code>admin@yowell.fr</code> / <code>admin123</code>
      </p>
    </div>
  </div>
</template>
