<script setup lang="ts">
const emit = defineEmits<{
  success: [];
}>();

const name = ref("");
const phone = ref("");
const email = ref("");
const address = ref("");
const notes = ref("");

const submitting = ref(false);
const error = ref("");
const success = ref("");

function resetForm() {
  name.value = "";
  phone.value = "";
  email.value = "";
  address.value = "";
  notes.value = "";
}

async function submit() {
  error.value = "";
  success.value = "";

  if (!name.value.trim()) {
    error.value = "Le nom du client est obligatoire.";
    return;
  }

  submitting.value = true;
  try {
    await apiFetch(useApiUrl("/clients"), {
      method: "POST",
      body: {
        name: name.value.trim(),
        phone: phone.value.trim(),
        email: email.value.trim(),
        address: address.value.trim(),
        notes: notes.value.trim(),
      },
    });
    success.value = "Client enregistré.";
    resetForm();
    emit("success");
  } catch {
    error.value = "Impossible d'enregistrer le client.";
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <form class="form-grid" @submit.prevent="submit">
    <div class="form-field form-field--wide">
      <label for="client-name">Nom *</label>
      <input
        id="client-name"
        v-model="name"
        type="text"
        placeholder="Nom du client ou de l'entreprise"
        required
      />
    </div>
    <div class="form-field">
      <label for="client-phone">Téléphone</label>
      <input id="client-phone" v-model="phone" type="tel" placeholder="+221 …" />
    </div>
    <div class="form-field">
      <label for="client-email">E-mail</label>
      <input id="client-email" v-model="email" type="email" placeholder="email@…" />
    </div>
    <div class="form-field form-field--wide">
      <label for="client-address">Adresse</label>
      <input id="client-address" v-model="address" type="text" placeholder="Quartier, ville…" />
    </div>
    <div class="form-field form-field--wide">
      <label for="client-notes">Notes</label>
      <textarea
        id="client-notes"
        v-model="notes"
        rows="2"
        placeholder="Préférences, horaires de livraison…"
      />
    </div>
    <div class="form-field form-actions">
      <button type="submit" class="btn btn--primary" :disabled="submitting">
        {{ submitting ? "Enregistrement…" : "Enregistrer le client" }}
      </button>
      <button type="button" class="btn btn--ghost" :disabled="submitting" @click="resetForm">
        Réinitialiser
      </button>
    </div>
    <p v-if="error" class="form-error form-field--wide">{{ error }}</p>
    <p v-if="success" class="form-success form-field--wide">{{ success }}</p>
  </form>
</template>
