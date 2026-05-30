<script setup lang="ts">
import type {
  ClientsOverview,
  JuiceProduct,
  Sale,
  SalePaymentStatus,
  SalesOverview,
} from "@yowell/shared";
import { formatCfa } from "@yowell/shared";

const { data, pending, refresh } = await useApiFetch<SalesOverview>(
  useApiUrl("/sales/overview"),
  { key: "sales-overview" },
);

const { data: clientsData } = await useApiFetch<ClientsOverview>(
  useApiUrl("/clients/overview"),
  { key: "clients-for-sales" },
);

const { data: products } = await useApiFetch<JuiceProduct[]>(
  useApiUrl("/stock/products"),
  { key: "products-for-sales" },
);

const showSaleForm = ref(false);
const showQuoteForm = ref(false);
const editingSaleId = ref<string | null>(null);
const SaleFormLazy = defineAsyncComponent(
  () => import("~/components/SaleForm.vue"),
);
const SaleEditFormLazy = defineAsyncComponent(
  () => import("~/components/SaleEditForm.vue"),
);

const editingSale = computed<Sale | null>(() => {
  if (!editingSaleId.value) return null;
  return data.value?.sales.find((s) => s.id === editingSaleId.value) ?? null;
});

const clientOptions = computed(
  () => clientsData.value?.clients.map((c) => ({ id: c.id, name: c.name })) ?? [],
);

async function onSaleSuccess() {
  await Promise.all([
    refresh(),
    refreshNuxtData("clients-overview"),
  ]);
  showSaleForm.value = false;
}

async function onQuoteSuccess() {
  await refresh();
  showQuoteForm.value = false;
}

function toggleSaleForm() {
  showSaleForm.value = !showSaleForm.value;
  if (showSaleForm.value) {
    showQuoteForm.value = false;
    editingSaleId.value = null;
  }
}

function toggleQuoteForm() {
  showQuoteForm.value = !showQuoteForm.value;
  if (showQuoteForm.value) {
    showSaleForm.value = false;
    editingSaleId.value = null;
  }
}

function startEditSale(sale: Sale) {
  editingSaleId.value = sale.id;
  showSaleForm.value = false;
  showQuoteForm.value = false;
}

function cancelEditSale() {
  editingSaleId.value = null;
}

async function onSaleEditSuccess() {
  await Promise.all([
    refresh(),
    refreshNuxtData("clients-overview"),
    refreshNuxtData("accounting-overview"),
  ]);
  editingSaleId.value = null;
}

const convertingId = ref<string | null>(null);
const updatingPaymentId = ref<string | null>(null);
const { generatingId: generatingInvoiceId, downloadInvoice } = useSaleInvoice();

async function convertToSale(sale: Sale) {
  if (sale.kind !== "quote") return;
  convertingId.value = sale.id;
  try {
    await apiFetch(useApiUrl(`/sales/${sale.id}/convert-to-sale`), {
      method: "POST",
      autoReload: false,
    });
    await Promise.all([
      refresh(),
      refreshNuxtData("stock-products"),
    ]);
  } catch {
    alert(
      "Impossible de convertir le devis — vérifie que le stock est suffisant.",
    );
  } finally {
    convertingId.value = null;
  }
}

function paymentLabel(status: SalePaymentStatus) {
  return status === "paid" ? "Payé" : "Non payé";
}

async function markAsPaid(sale: Sale) {
  if (sale.paymentStatus === "paid") return;
  updatingPaymentId.value = sale.id;
  try {
    await apiFetch(useApiUrl(`/sales/${sale.id}/payment-status`), {
      method: "PATCH",
      body: { paymentStatus: "paid" satisfies SalePaymentStatus },
    });
    await Promise.all([
      refresh(),
      refreshNuxtData("accounting-overview"),
      refreshNuxtData("clients-overview"),
    ]);
  } finally {
    updatingPaymentId.value = null;
  }
}
</script>

<template>
  <div>
    <PageHeader
      title="Ventes"
      description="Enregistre les ventes ou crée un devis sans stock — marque « Payé » pour comptabiliser l'encaissement."
    />

    <p v-if="pending" class="loading">Chargement des ventes</p>

    <template v-else>
      <div class="stats-grid">
        <StatCard
          label="Ventes aujourd'hui"
          :value="data?.salesToday ?? 0"
          icon="🛒"
          tone="green"
        />
        <StatCard
          label="Encaissé aujourd'hui"
          :value="formatCfa(data?.revenueToday ?? 0)"
          icon="💰"
          tone="orange"
        />
        <StatCard
          label="Encaissé (mois)"
          :value="formatCfa(data?.revenueMonth ?? 0)"
          icon="📈"
          tone="blue"
        />
      </div>

      <div class="stock-actions">
        <button
          type="button"
          class="btn btn--primary"
          @click="toggleSaleForm()"
        >
          {{ showSaleForm ? "Masquer le formulaire" : "+ Enregistrer une vente" }}
        </button>
        <button
          type="button"
          class="btn btn--secondary"
          @click="toggleQuoteForm()"
        >
          {{ showQuoteForm ? "Masquer le devis" : "+ Créer un devis" }}
        </button>
        <NuxtLink to="/clients" class="btn btn--secondary">
          Gérer les clients →
        </NuxtLink>
        <NuxtLink to="/stock" class="btn btn--secondary">
          Catalogue produits →
        </NuxtLink>
      </div>

      <section v-if="editingSale" class="panel collapsible-panel">
        <h2 class="panel__title">
          {{ editingSale.kind === "quote" ? "Modifier le devis" : "Modifier la vente" }}
        </h2>
        <SaleEditFormLazy
          :sale="editingSale"
          :clients="clientOptions"
          :products="products ?? []"
          @success="onSaleEditSuccess"
          @cancel="cancelEditSale"
        />
      </section>

      <section v-if="showSaleForm" class="panel collapsible-panel">
        <h2 class="panel__title">Nouvelle vente</h2>
        <p
          v-if="!clientOptions.length"
          class="form-error"
          style="margin-bottom: 1rem"
        >
          Aucun client —
          <NuxtLink to="/clients">crée un client</NuxtLink>
          avant d'enregistrer une vente.
        </p>
        <SaleFormLazy
          v-else
          :clients="clientOptions"
          :products="products ?? []"
          @success="onSaleSuccess"
        />
      </section>

      <section v-if="showQuoteForm" class="panel collapsible-panel">
        <h2 class="panel__title">Nouveau devis</h2>
        <p class="panel__hint" style="margin-bottom: 1rem">
          Le devis n'impacte pas le stock — idéal avant d'avoir de la production.
        </p>
        <p
          v-if="!clientOptions.length"
          class="form-error"
          style="margin-bottom: 1rem"
        >
          Aucun client —
          <NuxtLink to="/clients">crée un client</NuxtLink>
          avant de faire un devis.
        </p>
        <p
          v-else-if="!(products ?? []).length"
          class="form-error"
          style="margin-bottom: 1rem"
        >
          Aucun produit au catalogue —
          <NuxtLink to="/stock">crée un produit</NuxtLink>
          (quantité 0 possible) pour établir un devis.
        </p>
        <SaleFormLazy
          v-else
          mode="quote"
          :clients="clientOptions"
          :products="products ?? []"
          @success="onQuoteSuccess"
        />
      </section>

      <section class="panel">
        <h2 class="panel__title">Historique</h2>
        <div v-if="data?.recentSales.length" class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Client</th>
                <th>Commande</th>
                <th>Total</th>
                <th>Paiement</th>
                <th>Notes</th>
                <th />
              </tr>
            </thead>
            <tbody>
              <tr v-for="sale in data.recentSales" :key="sale.id">
                <td>
                  {{ new Date(sale.orderedAt).toLocaleDateString("fr-FR") }}
                </td>
                <td>{{ sale.clientName }}</td>
                <td>
                  <ul class="sale-items-list">
                    <li v-for="(item, i) in sale.items" :key="i">
                      {{ item.quantity }}× {{ item.productName }} ({{ item.volume }})
                      — {{ formatCfa(item.lineTotal) }}
                    </li>
                  </ul>
                </td>
                <td><strong>{{ formatCfa(sale.totalAmount) }}</strong></td>
                <td class="payment-cell">
                  <span
                    v-if="sale.personalization || sale.discountAmount > 0"
                    class="sale-adjustments"
                  >
                    <span v-if="sale.personalization">Perso.</span>
                    <span v-if="sale.discountAmount > 0">
                      Remise {{ formatCfa(sale.discountAmount) }}
                    </span>
                  </span>
                  <span
                    v-if="sale.kind === 'quote'"
                    class="badge badge--quote"
                  >
                    Devis
                  </span>
                  <template v-else>
                    <span
                      class="badge"
                      :class="{
                        'badge--paid': sale.paymentStatus === 'paid',
                        'badge--unpaid': sale.paymentStatus === 'unpaid',
                      }"
                    >
                      {{ paymentLabel(sale.paymentStatus) }}
                    </span>
                    <button
                      v-if="sale.paymentStatus === 'unpaid'"
                      type="button"
                      class="btn btn--primary btn--sm payment-cell__action"
                      :disabled="updatingPaymentId === sale.id"
                      @click="markAsPaid(sale)"
                    >
                      {{
                        updatingPaymentId === sale.id
                          ? "…"
                          : "Marquer payé"
                      }}
                    </button>
                  </template>
                  <button
                    v-if="sale.kind === 'quote'"
                    type="button"
                    class="btn btn--primary btn--sm payment-cell__action"
                    :disabled="convertingId === sale.id"
                    @click="convertToSale(sale)"
                  >
                    {{
                      convertingId === sale.id
                        ? "…"
                        : "Convertir en vente"
                    }}
                  </button>
                </td>
                <td>{{ sale.notes || "—" }}</td>
                <td class="table-actions">
                  <button
                    type="button"
                    class="btn btn--ghost btn--sm"
                    style="margin-right: 0.35rem"
                    @click="startEditSale(sale)"
                  >
                    Modifier
                  </button>
                  <button
                    type="button"
                    class="btn btn--ghost btn--sm"
                    :disabled="generatingInvoiceId === sale.id"
                    @click="downloadInvoice(sale)"
                  >
                    {{
                      generatingInvoiceId === sale.id
                        ? "PDF…"
                        : sale.kind === "quote"
                          ? "Devis"
                          : "Facture"
                    }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <EmptyState v-else message="Aucune vente enregistrée." />
      </section>
    </template>
  </div>
</template>
