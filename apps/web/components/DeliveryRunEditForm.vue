<script setup lang="ts">
import type { DeliveryRun } from "@yowell/shared";
import { formatCfa } from "@yowell/shared";

const props = defineProps<{
  run: DeliveryRun;
}>();

const emit = defineEmits<{
  success: [];
  cancel: [];
}>();

type LineDraft = {
  label: string;
  quantity: number;
  unitPrice: number | "";
};

type FeeDraft = {
  label: string;
  amount: number | "";
};

const date = ref(props.run.date.slice(0, 10));
const lines = ref<LineDraft[]>(
  props.run.items.map((item) => ({
    label: item.label,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
  })),
);
const fees = ref<FeeDraft[]>(
  props.run.fees.map((fee) => ({
    label: fee.label,
    amount: fee.amount,
  })),
);

const submitting = ref(false);
const error = ref("");
const success = ref("");

function lineTotal(line: LineDraft): number {
  if (line.unitPrice === "") return 0;
  return line.quantity * Number(line.unitPrice);
}

const courseTotal = computed(() =>
  lines.value.reduce((sum, line) => sum + lineTotal(line), 0),
);
const feesTotal = computed(() =>
  fees.value.reduce(
    (sum, fee) => sum + (fee.amount === "" ? 0 : Number(fee.amount)),
    0,
  ),
);
const grandTotal = computed(() => courseTotal.value + feesTotal.value);

function addLine() {
  lines.value.push({ label: "", quantity: 0.5, unitPrice: "" });
}

function removeLine(index: number) {
  if (lines.value.length <= 1) return;
  lines.value.splice(index, 1);
}

function addFee() {
  fees.value.push({ label: "", amount: "" });
}

function removeFee(index: number) {
  fees.value.splice(index, 1);
}

async function submit() {
  error.value = "";
  success.value = "";

  const validLines = lines.value.filter(
    (l) => l.label.trim() && l.quantity > 0 && l.unitPrice !== "",
  );
  const validFees = fees.value.filter(
    (f) => f.label.trim() && f.amount !== "" && Number(f.amount) >= 0,
  );
  if (!validLines.length) {
    error.value = "Ajoute au moins une ligne avec libellé, quantité et prix.";
    return;
  }

  submitting.value = true;
  try {
    await apiFetch(useApiUrl(`/deliveries/${props.run.id}`), {
      method: "PATCH",
      body: {
        date: date.value,
        items: validLines.map((l) => ({
          label: l.label.trim(),
          quantity: l.quantity,
          unitPrice: Number(l.unitPrice),
        })),
        fees: validFees.map((f) => ({
          label: f.label.trim(),
          amount: Number(f.amount),
        })),
      },
    });
    success.value = "Course modifiée.";
    emit("success");
  } catch {
    error.value = "Impossible de modifier la course.";
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <form @submit.prevent="submit">
    <div class="form-field" style="max-width: 220px; margin-bottom: 1.25rem">
      <label for="edit-run-date">Date de la course *</label>
      <input id="edit-run-date" v-model="date" type="date" required />
    </div>

    <fieldset class="order-lines">
      <legend class="order-lines__legend">Lignes de la course *</legend>

      <div class="table-wrap">
        <table class="table course-lines-table">
          <thead>
            <tr>
              <th>Libellé</th>
              <th>Quantité</th>
              <th>Prix (FCFA)</th>
              <th>Total</th>
              <th />
            </tr>
          </thead>
          <tbody>
            <tr v-for="(line, index) in lines" :key="index">
              <td>
                <input
                  v-model="line.label"
                  type="text"
                  class="table-input"
                  placeholder="Ex. Jus orange 1L"
                  required
                />
              </td>
              <td>
                <input
                  v-model.number="line.quantity"
                  type="number"
                  class="table-input table-input--narrow"
                  min="0.01"
                  step="0.01"
                  required
                />
              </td>
              <td>
                <input
                  v-model.number="line.unitPrice"
                  type="number"
                  class="table-input table-input--narrow"
                  min="0"
                  step="1"
                  placeholder="0"
                  required
                />
              </td>
              <td class="course-line-total">
                {{ formatCfa(lineTotal(line)) }}
              </td>
              <td>
                <button
                  v-if="lines.length > 1"
                  type="button"
                  class="btn btn--ghost"
                  style="padding: 0.25rem 0.5rem; font-size: 0.8rem"
                  @click="removeLine(index)"
                >
                  ×
                </button>
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td colspan="3" class="course-table-footer-label">
                <strong>Total de la course</strong>
              </td>
              <td colspan="2">
                <strong class="course-table-footer-total">{{ formatCfa(courseTotal) }}</strong>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <button type="button" class="btn btn--ghost" style="margin-top: 0.75rem" @click="addLine">
        + Ajouter une ligne
      </button>
    </fieldset>

    <fieldset class="order-lines" style="margin-top: 1rem">
      <legend class="order-lines__legend">Frais (optionnel)</legend>

      <div class="table-wrap">
        <table class="table course-lines-table">
          <thead>
            <tr>
              <th>Libellé du frais</th>
              <th>Montant (FCFA)</th>
              <th />
            </tr>
          </thead>
          <tbody>
            <tr v-for="(fee, index) in fees" :key="`fee-${index}`">
              <td>
                <input
                  v-model="fee.label"
                  type="text"
                  class="table-input"
                  placeholder="Ex. Transport, livraison..."
                />
              </td>
              <td>
                <input
                  v-model.number="fee.amount"
                  type="number"
                  class="table-input table-input--narrow"
                  min="0"
                  step="1"
                  placeholder="0"
                />
              </td>
              <td>
                <button
                  type="button"
                  class="btn btn--ghost"
                  style="padding: 0.25rem 0.5rem; font-size: 0.8rem"
                  @click="removeFee(index)"
                >
                  ×
                </button>
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td class="course-table-footer-label"><strong>Total frais</strong></td>
              <td colspan="2"><strong>{{ formatCfa(feesTotal) }}</strong></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <button type="button" class="btn btn--ghost" style="margin-top: 0.75rem" @click="addFee">
        + Ajouter un frais
      </button>
    </fieldset>

    <div class="form-actions" style="margin-top: 1.25rem">
      <p style="margin-right: auto; font-weight: 600">
        Total global : {{ formatCfa(grandTotal) }}
      </p>
      <button type="submit" class="btn btn--primary" :disabled="submitting">
        {{ submitting ? "Mise à jour…" : "Enregistrer les modifications" }}
      </button>
      <button
        type="button"
        class="btn btn--ghost"
        :disabled="submitting"
        @click="emit('cancel')"
      >
        Annuler
      </button>
    </div>

    <p v-if="error" class="form-error">{{ error }}</p>
    <p v-if="success" class="form-success">{{ success }}</p>
  </form>
</template>

