<script setup lang="ts">
import { formatCfa } from "@yowell/shared";

const emit = defineEmits<{
  success: [];
}>();

type LineDraft = {
  label: string;
  quantity: number;
  unitPrice: number | "";
};

const date = ref(new Date().toISOString().slice(0, 10));
const lines = ref<LineDraft[]>([
  { label: "", quantity: 1, unitPrice: "" },
]);

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

function addLine() {
  lines.value.push({ label: "", quantity: 1, unitPrice: "" });
}

function removeLine(index: number) {
  if (lines.value.length <= 1) return;
  lines.value.splice(index, 1);
}

function resetForm() {
  date.value = new Date().toISOString().slice(0, 10);
  lines.value = [{ label: "", quantity: 1, unitPrice: "" }];
}

async function submit() {
  error.value = "";
  success.value = "";

  const validLines = lines.value.filter(
    (l) => l.label.trim() && l.quantity > 0 && l.unitPrice !== "",
  );
  if (!validLines.length) {
    error.value = "Ajoute au moins une ligne avec libellé, quantité et prix.";
    return;
  }

  submitting.value = true;
  try {
    await apiFetch(useApiUrl("/deliveries"), {
      method: "POST",
      body: {
        date: date.value,
        items: validLines.map((l) => ({
          label: l.label.trim(),
          quantity: l.quantity,
          unitPrice: Number(l.unitPrice),
        })),
      },
    });
    success.value = "Course enregistrée.";
    resetForm();
    emit("success");
  } catch {
    error.value = "Impossible d'enregistrer la course.";
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <form @submit.prevent="submit">
    <div class="form-field" style="max-width: 220px; margin-bottom: 1.25rem">
      <label for="run-date">Date de la course *</label>
      <input id="run-date" v-model="date" type="date" required />
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
                  min="1"
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

    <div class="form-actions" style="margin-top: 1.25rem">
      <button type="submit" class="btn btn--primary" :disabled="submitting">
        {{ submitting ? "Enregistrement…" : "Enregistrer la course" }}
      </button>
      <button type="button" class="btn btn--ghost" :disabled="submitting" @click="resetForm">
        Réinitialiser
      </button>
    </div>

    <p v-if="error" class="form-error">{{ error }}</p>
    <p v-if="success" class="form-success">{{ success }}</p>
  </form>
</template>
