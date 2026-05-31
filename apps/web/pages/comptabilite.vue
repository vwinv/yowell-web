<script setup lang="ts">
import type { AccountingEntry, AccountingOverview } from "@yowell/shared";
import { formatCfa, paymentChannelLabel } from "@yowell/shared";

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
const cashOpening = ref<number | "">("");
const omOpening = ref<number | "">("");
const waveOpening = ref<number | "">("");
const savingCaisse = ref(false);

watch(
  () => data.value?.openingBalances,
  (balances) => {
    if (!balances) return;
    cashOpening.value = balances.cash;
    omOpening.value = balances.om;
    waveOpening.value = balances.wave;
  },
  { immediate: true },
);

async function saveChannelBalances() {
  const cash = Number(cashOpening.value);
  const om = Number(omOpening.value);
  const wave = Number(waveOpening.value);
  if ([cash, om, wave].some((value) => value < 0 || Number.isNaN(value))) return;
  savingCaisse.value = true;
  try {
    await apiFetch(useApiUrl("/accounting/balances"), {
      method: "PATCH",
      body: { cash, om, wave },
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
      description="Suivi par canal Cash, Orange Money et Wave — ventes payées et courses."
    />

    <p v-if="pending" class="loading">Chargement de la comptabilité</p>

    <template v-else>
      <div class="stats-grid stats-grid--4">
        <StatCard
          label="Cash"
          :value="formatCfa(data?.channelBalances?.cash ?? 0)"
          icon="💵"
          tone="green"
        />
        <StatCard
          label="Orange Money"
          :value="formatCfa(data?.channelBalances?.om ?? 0)"
          icon="📱"
          tone="orange"
        />
        <StatCard
          label="Wave"
          :value="formatCfa(data?.channelBalances?.wave ?? 0)"
          icon="🌊"
          tone="blue"
        />
        <StatCard
          label="Solde global"
          :value="formatAmount(data?.balance ?? 0)"
          icon="💰"
          :tone="(data?.balance ?? 0) >= 0 ? 'green' : 'orange'"
        />
        <StatCard
          label="Revenus (mois)"
          :value="formatCfa(data?.incomeMonth ?? 0)"
          icon="📈"
          tone="blue"
        />
        <StatCard
          label="Dépenses (mois)"
          :value="formatCfa(data?.expenseMonth ?? 0)"
          icon="↓"
          tone="orange"
        />
      </div>

      <p class="accounting-hint">
        Les soldes par canal = solde d'ouverture + ventes payées sur ce canal − courses payées sur ce canal.
        Les saisies manuelles impactent le <strong>solde global</strong> uniquement.
        Une vente n'apparaît qu'après « Marquer payé » avec le canal choisi sur la page Ventes.
      </p>

      <div class="stock-actions">
        <button
          type="button"
          class="btn btn--secondary"
          @click="showCaisseForm = !showCaisseForm"
        >
          {{ showCaisseForm ? "Annuler" : "Mettre à jour les soldes d'ouverture" }}
        </button>
      </div>

      <section v-if="showCaisseForm" class="panel collapsible-panel">
        <h2 class="panel__title">Soldes d'ouverture par canal</h2>
        <p class="panel__hint" style="margin-bottom: 1rem">
          Montants déjà disponibles au démarrage du suivi (avant les opérations enregistrées).
        </p>
        <form class="form-grid" @submit.prevent="saveChannelBalances">
          <div class="form-field">
            <label for="opening-cash">Cash (FCFA)</label>
            <input
              id="opening-cash"
              v-model.number="cashOpening"
              type="number"
              min="0"
              step="1"
              required
            />
          </div>
          <div class="form-field">
            <label for="opening-om">Orange Money (FCFA)</label>
            <input
              id="opening-om"
              v-model.number="omOpening"
              type="number"
              min="0"
              step="1"
              required
            />
          </div>
          <div class="form-field">
            <label for="opening-wave">Wave (FCFA)</label>
            <input
              id="opening-wave"
              v-model.number="waveOpening"
              type="number"
              min="0"
              step="1"
              required
            />
          </div>
          <div class="form-actions form-field--wide">
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
                <th>Canal</th>
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
                <td>{{ entry.paymentChannel ? paymentChannelLabel(entry.paymentChannel) : "—" }}</td>
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
