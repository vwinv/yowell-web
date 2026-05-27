<script setup lang="ts">
import type {
  DeliveriesOverview,
  DeliveryRemainingItem,
  DeliveryRunLine,
} from "@yowell/shared";
import { deliveryRemainingCounts, formatCfa } from "@yowell/shared";

const { data, pending, refresh } = await useApiFetch<DeliveriesOverview>(
  useApiUrl("/deliveries/overview"),
  { key: "deliveries-overview" },
);

const showForm = ref(false);
const DeliveryRunFormLazy = defineAsyncComponent(
  () => import("~/components/DeliveryRunForm.vue"),
);

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function itemKey(runId: string, itemId: string) {
  return `${runId}:${itemId}`;
}

async function removeRun(id: string, dateLabel: string) {
  if (!confirm(`Supprimer la course du ${dateLabel} ?`)) return;
  await apiFetch(useApiUrl(`/deliveries/${id}`), { method: "DELETE" });
  await refresh();
}

const savingRemaining = ref<string | null>(null);
const editingRemaining = ref<string | null>(null);
const remainingDrafts = ref<Record<string, string>>({});

function openRemainingEditor(runId: string, item: DeliveryRunLine) {
  const key = itemKey(runId, item.id);
  editingRemaining.value = key;
  remainingDrafts.value[key] = item.remainingNote ?? "";
}

async function persistRemaining(
  runId: string,
  item: DeliveryRunLine,
  hasRemaining: boolean,
  remainingNote?: string,
) {
  const key = itemKey(runId, item.id);
  savingRemaining.value = key;

  try {
    await apiFetch(useApiUrl(`/deliveries/${runId}/remaining`), {
      method: "PATCH",
      body: {
        itemId: item.id,
        hasRemaining,
        ...(hasRemaining ? { remainingNote: remainingNote?.trim() } : {}),
      },
    });

    item.hasRemaining = hasRemaining;
    if (hasRemaining && remainingNote?.trim()) {
      item.remainingNote = remainingNote.trim();
    } else {
      delete item.remainingNote;
    }

    editingRemaining.value = null;
    await refresh();
  } catch {
    alert("Impossible d'enregistrer le restant pour cette ligne.");
  } finally {
    if (savingRemaining.value === key) savingRemaining.value = null;
  }
}

async function saveRemainingNote(runId: string, item: DeliveryRunLine) {
  const key = itemKey(runId, item.id);
  const note = remainingDrafts.value[key]?.trim();
  if (!note) {
    alert("Indique ce qu'il reste (ex. quantité ou conditionnement).");
    return;
  }
  await persistRemaining(runId, item, true, note);
}

async function markNoRemaining(runId: string, item: DeliveryRunLine) {
  if (item.hasRemaining === false && !item.remainingNote) return;
  await persistRemaining(runId, item, false);
}

async function markUsedFromList(entry: DeliveryRemainingItem) {
  const run = data.value?.runs.find((r) => r.id === entry.runId);
  const item = run?.items.find((i) => i.id === entry.itemId);
  if (!run || !item) return;
  await markNoRemaining(run.id, item);
}

function remainingSummary(items: DeliveryRunLine[]) {
  const { pending, withRemaining, usedUp } = deliveryRemainingCounts(items);
  if (pending === items.length) return "Restants à renseigner";
  const parts: string[] = [];
  if (withRemaining > 0) {
    parts.push(`${withRemaining} avec reste${withRemaining > 1 ? "s" : ""}`);
  }
  if (usedUp > 0) {
    parts.push(`${usedUp} épuisé${usedUp > 1 ? "s" : ""}`);
  }
  if (pending > 0) {
    parts.push(`${pending} en attente`);
  }
  return parts.join(" · ");
}

function isEditing(runId: string, item: DeliveryRunLine) {
  return editingRemaining.value === itemKey(runId, item.id);
}
</script>

<template>
  <div>
    <PageHeader
      title="Courses"
      description="Enregistre les courses, puis après production note ce qu'il reste. La liste des restants est toujours visible ci-dessous."
    />

    <p v-if="pending" class="loading">Chargement des courses</p>

    <template v-else>
      <div class="stats-grid">
        <StatCard
          label="Courses ce mois"
          :value="data?.totalRunsMonth ?? 0"
          icon="🚚"
          tone="blue"
        />
        <StatCard
          label="Articles restants"
          :value="data?.remainingItems.length ?? 0"
          icon="📦"
          tone="orange"
        />
        <StatCard
          label="Total courses (mois)"
          :value="formatCfa(data?.totalAmountMonth ?? 0)"
          icon="💰"
          tone="green"
        />
      </div>

      <section class="panel remaining-panel">
        <h2 class="panel__title">Liste des restants</h2>
        <p class="remaining-intro">
          Tous les articles encore en stock après production, toutes courses confondues.
        </p>

        <div v-if="data?.remainingItems.length" class="table-wrap">
          <table class="table remaining-list-table">
            <thead>
              <tr>
                <th>Article (course)</th>
                <th>Qté achetée</th>
                <th>Ce qu'il reste</th>
                <th>Course du</th>
                <th />
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="entry in data.remainingItems"
                :key="`${entry.runId}:${entry.itemId}`"
              >
                <td>{{ entry.label }}</td>
                <td>{{ entry.quantity }}</td>
                <td>
                  <strong v-if="entry.remainingNote" class="remaining-note-text">
                    {{ entry.remainingNote }}
                  </strong>
                  <span v-else class="remaining-note-missing">À préciser dans l'historique</span>
                </td>
                <td>{{ formatDate(entry.runDate) }}</td>
                <td>
                  <button
                    type="button"
                    class="btn btn--ghost remaining-btn"
                    :disabled="savingRemaining === itemKey(entry.runId, entry.itemId)"
                    @click="markUsedFromList(entry)"
                  >
                    Plus de reste
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <EmptyState
          v-else
          message="Aucun restant pour le moment — après une course, indique « Il reste » et ce qu'il reste encore."
        />
      </section>

      <div class="stock-actions">
        <button
          type="button"
          class="btn btn--primary"
          @click="showForm = !showForm"
        >
          {{ showForm ? "Masquer le formulaire" : "+ Enregistrer une course" }}
        </button>
      </div>

      <section v-if="showForm" class="panel collapsible-panel">
        <h2 class="panel__title">Nouvelle course</h2>
        <DeliveryRunFormLazy @success="refresh(); showForm = false" />
      </section>

      <section class="panel">
        <h2 class="panel__title">Historique des courses</h2>
        <div v-if="data?.runs.length" class="accordion-list">
          <details
            v-for="(run, index) in data.runs"
            :key="run.id"
            class="accordion"
            :open="index === 0"
          >
            <summary class="accordion__summary">
              <span class="accordion__summary-main">
                <time class="accordion__date">{{ formatDate(run.date) }}</time>
                <span class="accordion__meta">
                  {{ run.items.length }} ligne{{ run.items.length > 1 ? "s" : "" }}
                  · {{ remainingSummary(run.items) }}
                </span>
              </span>
              <strong class="accordion__total">{{ formatCfa(run.totalAmount) }}</strong>
              <span class="accordion__chevron" aria-hidden="true" />
            </summary>

            <div class="accordion__body">
              <p class="remaining-intro">
                Après la production : indique s'il reste quelque chose et précise quoi.
              </p>
              <div class="table-wrap">
                <table class="table">
                  <thead>
                    <tr>
                      <th>Libellé</th>
                      <th>Quantité</th>
                      <th>Prix</th>
                      <th>Total</th>
                      <th>Restants</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="item in run.items"
                      :key="item.id"
                      :class="{
                        'row--remaining-yes': item.hasRemaining === true,
                        'row--remaining-no': item.hasRemaining === false,
                      }"
                    >
                      <td>{{ item.label }}</td>
                      <td>{{ item.quantity }}</td>
                      <td>{{ formatCfa(item.unitPrice) }}</td>
                      <td>{{ formatCfa(item.lineTotal) }}</td>
                      <td class="remaining-cell">
                        <div
                          v-if="item.hasRemaining === true && !isEditing(run.id, item)"
                          class="remaining-saved"
                        >
                          <p class="remaining-note-display">
                            <span class="remaining-note-label">Reste :</span>
                            {{ item.remainingNote || "—" }}
                          </p>
                          <div class="remaining-actions">
                            <button
                              type="button"
                              class="btn btn--ghost remaining-btn"
                              @click="openRemainingEditor(run.id, item)"
                            >
                              Modifier
                            </button>
                            <button
                              type="button"
                              class="btn btn--ghost remaining-btn"
                              :disabled="savingRemaining === itemKey(run.id, item.id)"
                              @click="markNoRemaining(run.id, item)"
                            >
                              Plus de reste
                            </button>
                          </div>
                        </div>

                        <div
                          v-else-if="isEditing(run.id, item)"
                          class="remaining-form"
                        >
                          <label class="sr-only" :for="`remaining-${item.id}`">Ce qu'il reste</label>
                          <input
                            :id="`remaining-${item.id}`"
                            v-model="remainingDrafts[itemKey(run.id, item.id)]"
                            type="text"
                            class="table-input remaining-note-input"
                            placeholder="Ex. 2 kg d'oranges, 3 bouteilles…"
                            @keyup.enter="saveRemainingNote(run.id, item)"
                          />
                          <div class="remaining-actions">
                            <button
                              type="button"
                              class="btn btn--primary remaining-btn"
                              :disabled="savingRemaining === itemKey(run.id, item.id)"
                              @click="saveRemainingNote(run.id, item)"
                            >
                              Enregistrer
                            </button>
                            <button
                              type="button"
                              class="btn btn--ghost remaining-btn"
                              @click="editingRemaining = null"
                            >
                              Annuler
                            </button>
                            <button
                              v-if="item.hasRemaining !== true"
                              type="button"
                              class="btn btn--ghost remaining-btn"
                              :disabled="savingRemaining === itemKey(run.id, item.id)"
                              @click="markNoRemaining(run.id, item)"
                            >
                              Rien ne reste
                            </button>
                          </div>
                        </div>

                        <div
                          v-else
                          class="remaining-toggle"
                          role="group"
                          :aria-label="`Restants : ${item.label}`"
                        >
                          <button
                            type="button"
                            class="btn btn--ghost remaining-btn"
                            @click="openRemainingEditor(run.id, item)"
                          >
                            Il reste
                          </button>
                          <button
                            type="button"
                            class="btn btn--ghost remaining-btn remaining-btn--active-no"
                            :disabled="savingRemaining === itemKey(run.id, item.id)"
                            @click="markNoRemaining(run.id, item)"
                          >
                            Rien ne reste
                          </button>
                        </div>
                      </td>
                    </tr>
                    <tr v-for="fee in run.fees" :key="`fee-${fee.id}`" class="row--fee">
                      <td>
                        <em>Frais: {{ fee.label }}</em>
                      </td>
                      <td>—</td>
                      <td>—</td>
                      <td>{{ formatCfa(fee.amount) }}</td>
                      <td />
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colspan="3"><strong>Total course</strong></td>
                      <td><strong>{{ formatCfa(run.totalAmount) }}</strong></td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div class="accordion__footer">
                <button
                  type="button"
                  class="btn btn--ghost"
                  @click="removeRun(run.id, formatDate(run.date))"
                >
                  Supprimer
                </button>
              </div>
            </div>
          </details>
        </div>
        <EmptyState
          v-else
          message="Aucune course — enregistre ta première tournée avec le bouton ci-dessus."
        />
      </section>
    </template>
  </div>
</template>
