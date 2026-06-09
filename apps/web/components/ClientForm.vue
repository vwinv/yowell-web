<script setup lang="ts">
import type { Client, ClientSummary } from "@yowell/shared";

const props = withDefaults(
  defineProps<{
    client?: Client | ClientSummary | null;
    readonly?: boolean;
  }>(),
  { client: null, readonly: false },
);

const emit = defineEmits<{
  success: [];
  cancel: [];
}>();

const isEdit = computed(() => !!props.client);

const name = ref("");
const phone = ref("");
const email = ref("");
const address = ref("");
const notes = ref("");

const submitting = ref(false);
const error = ref("");
const success = ref("");

function fillFromClient(client: Client | ClientSummary) {
  name.value = client.name;
  phone.value = client.phone;
  email.value = client.email;
  address.value = client.address;
  notes.value = client.notes;
}

watch(
  () => props.client,
  (client) => {
    if (client) {
      fillFromClient(client);
    } else {
      resetForm();
    }
  },
  { immediate: true },
);

function resetForm() {
  name.value = "";
  phone.value = "";
  email.value = "";
  address.value = "";
  notes.value = "";
}

async function submit() {
  if (props.readonly) return;
  error.value = "";
  success.value = "";

  if (!name.value.trim()) {
    error.value = "Le nom du client est obligatoire.";
    return;
  }

  const body = {
    name: name.value.trim(),
    phone: phone.value.trim(),
    email: email.value.trim(),
    address: address.value.trim(),
    notes: notes.value.trim(),
  };

  submitting.value = true;
  try {
    if (isEdit.value && props.client) {
      await apiFetch(useApiUrl(`/clients/${props.client.id}`), {
        method: "PATCH",
        body,
      });
      success.value = "Client modifié.";
    } else {
      await apiFetch(useApiUrl("/clients"), {
        method: "POST",
        body,
      });
      success.value = "Client enregistré.";
      resetForm();
    }
    emit("success");
  } catch {
    error.value = isEdit.value
      ? "Impossible de modifier le client."
      : "Impossible d'enregistrer le client.";
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <form class="form-grid" @submit.prevent="submit">
    <fieldset class="form-fieldset" :disabled="readonly">
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
        {{
          submitting
            ? "Enregistrement…"
            : isEdit
              ? "Enregistrer les modifications"
              : "Enregistrer le client"
        }}
      </button>
      <button
        v-if="isEdit"
        type="button"
        class="btn btn--ghost"
        :disabled="submitting"
        @click="emit('cancel')"
      >
        Annuler
      </button>
      <button
        v-else
        type="button"
        class="btn btn--ghost"
        :disabled="submitting"
        @click="resetForm"
      >
        Réinitialiser
      </button>
    </div>
    <p v-if="error" class="form-error form-field--wide">{{ error }}</p>
    <p v-if="success" class="form-success form-field--wide">{{ success }}</p>
    </fieldset>
  </form>
</template>

<style scoped>
.form-fieldset {
  margin: 0;
  padding: 0;
  border: none;
  display: contents;
}
</style>
