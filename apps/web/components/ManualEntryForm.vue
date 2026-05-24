<script setup lang="ts">
import type { CreateManualAccountingEntryInput } from "@yowell/shared";

const emit = defineEmits<{
  success: [];
}>();

const date = ref(new Date().toISOString().slice(0, 10));
const label = ref("");
const amount = ref<number | "">("");
const type = ref<CreateManualAccountingEntryInput["type"]>("expense");

const submitting = ref(false);
const error = ref("");
const success = ref("");

function resetForm() {
  date.value = new Date().toISOString().slice(0, 10);
  label.value = "";
  amount.value = "";
  type.value = "expense";
}

async function submit() {
  error.value = "";
  success.value = "";

  if (!label.value.trim()) {
    error.value = "Le libellé est obligatoire.";
    return;
  }
  const parsed = Number(amount.value);
  if (!parsed || parsed <= 0) {
    error.value = "Indique un montant supérieur à zéro.";
    return;
  }

  submitting.value = true;
  try {
    await apiFetch(useApiUrl("/accounting/entries"), {
      method: "POST",
      body: {
        date: date.value,
        label: label.value.trim(),
        amount: parsed,
        type: type.value,
      } satisfies CreateManualAccountingEntryInput,
    });
    success.value =
      type.value === "income"
        ? "Revenu manuel enregistré."
        : "Dépense manuelle enregistrée.";
    resetForm();
    emit("success");
  } catch {
    error.value = "Impossible d'enregistrer l'écriture.";
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <form class="form-grid" @submit.prevent="submit">
    <div class="form-field">
      <label for="entry-date">Date</label>
      <input id="entry-date" v-model="date" type="date" required />
    </div>
    <div class="form-field">
      <label for="entry-type">Type</label>
      <select id="entry-type" v-model="type">
        <option value="income">Revenu (entrée)</option>
        <option value="expense">Dépense (sortie)</option>
      </select>
    </div>
    <div class="form-field form-field--wide">
      <label for="entry-label">Libellé</label>
      <input
        id="entry-label"
        v-model="label"
        type="text"
        placeholder="Ex. Achat emballages, don, frais divers…"
        required
      />
    </div>
    <div class="form-field">
      <label for="entry-amount">Montant (FCFA)</label>
      <input
        id="entry-amount"
        v-model="amount"
        type="number"
        min="1"
        step="1"
        placeholder="0"
        required
      />
    </div>

    <p v-if="error" class="form-message form-message--error">{{ error }}</p>
    <p v-if="success" class="form-message form-message--success">{{ success }}</p>

    <div class="form-actions">
      <button type="submit" class="btn btn--primary" :disabled="submitting">
        {{ submitting ? "Enregistrement…" : "Enregistrer" }}
      </button>
    </div>
  </form>
</template>
