<script setup lang="ts">
import type { AccountingEntry, AccountingOverview } from "@yowell/shared";
import { formatCfa } from "@yowell/shared";

const { data, pending, refresh } = await useApiFetch<AccountingOverview>(
  useApiUrl("/accounting/overview"),
  { key: "accounting-overview" },
);

const showForm = ref(false);
const ManualEntryFormLazy = defineAsyncComponent(
  () => import("~/components/ManualEntryForm.vue"),
);

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function signedAmount(entry: AccountingEntry) {
  return entry.type === "expense" ? -entry.amount : entry.amount;
}

function formatEntryAmount(entry: AccountingEntry) {
  const amount = signedAmount(entry);
  if (amount < 0) {
    return `−${formatCfa(Math.abs(amount))}`;
  }
  return formatCfa(amount);
}

function formatAmount(amount: number) {
  if (amount < 0) {
    return `−${formatCfa(Math.abs(amount))}`;
  }
  return formatCfa(amount);
}

function sourceLabel(source: AccountingEntry["source"]) {
  if (source === "sale") return "Vente";
  if (source === "delivery") return "Course";
  if (source === "caisse") return "Caisse";
  return "Manuel";
}

const showCaisseForm = ref(false);
const caisseAmount = ref<number | "">("");
const savingCaisse = ref(false);

watch(
  () => data.value?.caisse,
  (value) => {
    if (value !== undefined) caisseAmount.value = value;
  },
  { immediate: true },
);

async function saveCaisse() {
  const parsed = Number(caisseAmount.value);
  if (parsed < 0 || Number.isNaN(parsed)) return;
  savingCaisse.value = true;
  try {
    await apiFetch(useApiUrl("/accounting/caisse"), {
      method: "PATCH",
      body: { amount: parsed },
    });
    showCaisseForm.value = false;
    await refresh();
  } finally {
    savingCaisse.value = false;
  }
}

async function removeManual(entry: AccountingEntry) {
  if (entry.source !== "manual" || !entry.sourceId) return;
  if (!confirm(`Supprimer l'écriture « ${entry.label} » ?`)) return;
  await apiFetch(useApiUrl(`/accounting/entries/${entry.sourceId}`), {
    method: "DELETE",
  });
  await refresh();
}
</script>

<template>
  <div>
    <PageHeader
      title="Comptabilité"
      description="Seules les ventes marquées payées comptent en revenu, avec la caisse et les saisies manuelles."
    />

    <p v-if="pending" class="loading">Chargement de la comptabilité</p>

    <template v-else>
      <div class="stats-grid stats-grid--4">
        <StatCard
          label="Caisse"
          :value="formatCfa(data?.caisse ?? 0)"
          icon="🏦"
          tone="green"
        />
        <StatCard
          label="Revenus (total)"
          :value="formatCfa(data?.incomeTotal ?? 0)"
          icon="↑"
          tone="blue"
        />
        <StatCard
          label="Revenus (mois)"
          :value="formatCfa(data?.incomeMonth ?? 0)"
          icon="📈"
          tone="blue"
        />
        <StatCard
          label="Solde"
          :value="formatAmount(data?.balance ?? 0)"
          icon="💰"
          :tone="(data?.balance ?? 0) >= 0 ? 'green' : 'orange'"
        />
        <StatCard
          label="Dépenses (mois)"
          :value="formatCfa(data?.expenseMonth ?? 0)"
          icon="↓"
          tone="orange"
        />
      </div>

      <p class="accounting-hint">
        Les <strong>revenus</strong> incluent la caisse
        ({{ formatCfa(data?.caisse ?? 0) }}), les <strong>ventes payées</strong>
        et les saisies manuelles. Une vente n'apparaît qu'après « Marquer payé » sur la page Ventes.
        Les <strong>dépenses</strong> viennent des courses (+ saisies manuelles).
      </p>

      <div class="stock-actions">
        <button
          type="button"
          class="btn btn--secondary"
          @click="showCaisseForm = !showCaisseForm"
        >
          {{ showCaisseForm ? "Annuler" : "Mettre à jour la caisse" }}
        </button>
      </div>

      <section v-if="showCaisseForm" class="panel collapsible-panel">
        <h2 class="panel__title">État actuel de la caisse</h2>
        <form class="form-grid form-grid--inline" @submit.prevent="saveCaisse">
          <div class="form-field">
            <label for="caisse-amount">Montant en caisse (FCFA)</label>
            <input
              id="caisse-amount"
              v-model="caisseAmount"
              type="number"
              min="0"
              step="1"
              required
            />
          </div>
          <div class="form-actions">
            <button type="submit" class="btn btn--primary" :disabled="savingCaisse">
              {{ savingCaisse ? "Enregistrement…" : "Enregistrer" }}
            </button>
          </div>
        </form>
      </section>

      <div class="stock-actions">
        <button
          type="button"
          class="btn btn--primary"
          @click="showForm = !showForm"
        >
          {{ showForm ? "Masquer le formulaire" : "+ Saisie manuelle" }}
        </button>
      </div>

      <section v-if="showForm" class="panel collapsible-panel">
        <h2 class="panel__title">Revenu ou dépense manuelle</h2>
        <ManualEntryFormLazy @success="refresh(); showForm = false" />
      </section>

      <section class="panel">
        <h2 class="panel__title">Journal des opérations</h2>
        <div v-if="data?.recentEntries.length" class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Libellé</th>
                <th>Origine</th>
                <th>Type</th>
                <th>Montant</th>
                <th />
              </tr>
            </thead>
            <tbody>
              <tr v-for="entry in data.recentEntries" :key="entry.id">
                <td>{{ formatDate(entry.date) }}</td>
                <td>{{ entry.label }}</td>
                <td>
                  <span
                    class="badge badge--source"
                    :class="`badge--source-${entry.source}`"
                  >
                    {{ sourceLabel(entry.source) }}
                  </span>
                </td>
                <td>
                  <span
                    class="badge"
                    :class="{ 'badge--expense': entry.type === 'expense' }"
                  >
                    {{ entry.type === "income" ? "Revenu" : "Dépense" }}
                  </span>
                </td>
                <td
                  class="amount-cell"
                  :class="{
                    'amount-cell--income': entry.type === 'income',
                    'amount-cell--expense': entry.type === 'expense',
                  }"
                >
                  {{ formatEntryAmount(entry) }}
                </td>
                <td class="table-actions">
                  <button
                    v-if="entry.source === 'manual'"
                    type="button"
                    class="btn btn--ghost btn--sm"
                    @click="removeManual(entry)"
                  >
                    Supprimer
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <EmptyState
          v-else
          message="Aucune opération — enregistre une vente, une course ou une saisie manuelle."
        />
      </section>
    </template>
  </div>
</template>
