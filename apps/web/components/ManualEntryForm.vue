<script setup lang="ts">
import type { AccountingEntry, CreateManualAccountingEntryInput } from "@yowell/shared";
import { PAYMENT_CHANNEL_OPTIONS } from "@yowell/shared";

const props = withDefaults(
  defineProps<{
    readonly?: boolean;
    entry?: AccountingEntry | null;
  }>(),
  { readonly: false, entry: null },
);

const emit = defineEmits<{
  success: [];
  cancel: [];
}>();

const isEditing = computed(() => !!props.entry?.sourceId);

const date = ref(new Date().toISOString().slice(0, 10));
const label = ref("");
const amount = ref<number | "">("");
const type = ref<CreateManualAccountingEntryInput["type"]>("expense");
const paymentChannel = ref<CreateManualAccountingEntryInput["paymentChannel"]>("cash");

watch(
  () => props.entry,
  (entry) => {
    if (!entry?.sourceId) return;
    date.value = entry.date.slice(0, 10);
    label.value = entry.label;
    amount.value = entry.amount;
    type.value = entry.type;
    paymentChannel.value = entry.paymentChannel ?? "cash";
  },
  { immediate: true },
);

const submitting = ref(false);
const error = ref("");
const success = ref("");

function resetForm() {
  date.value = new Date().toISOString().slice(0, 10);
  label.value = "";
  amount.value = "";
  type.value = "expense";
  paymentChannel.value = "cash";
}

async function submit() {
  if (props.readonly) return;
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

  const body: CreateManualAccountingEntryInput = {
    date: date.value,
    label: label.value.trim(),
    amount: parsed,
    type: type.value,
    paymentChannel: paymentChannel.value,
  };

  submitting.value = true;
  try {
    if (isEditing.value && props.entry?.sourceId) {
      await apiFetch(useApiUrl(`/accounting/entries/${props.entry.sourceId}`), {
        method: "PATCH",
        body,
      });
      success.value = "Écriture modifiée.";
    } else {
      await apiFetch(useApiUrl("/accounting/entries"), {
        method: "POST",
        body,
      });
      success.value =
        type.value === "income"
          ? "Revenu manuel enregistré."
          : "Dépense manuelle enregistrée.";
      resetForm();
    }
    emit("success");
  } catch {
    error.value = isEditing.value
      ? "Impossible de modifier l'écriture."
      : "Impossible d'enregistrer l'écriture.";
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <form class="form-grid" @submit.prevent="submit">
    <fieldset class="form-fieldset" :disabled="readonly">
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
      <div class="form-field">
        <label for="entry-channel">Canal de paiement</label>
        <select id="entry-channel" v-model="paymentChannel" required>
          <option
            v-for="option in PAYMENT_CHANNEL_OPTIONS"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </option>
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
          {{
            submitting
              ? "Enregistrement…"
              : isEditing
                ? "Enregistrer les modifications"
                : "Enregistrer"
          }}
        </button>
        <button
          v-if="isEditing"
          type="button"
          class="btn btn--ghost"
          :disabled="submitting"
          @click="emit('cancel')"
        >
          Annuler
        </button>
      </div>
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
