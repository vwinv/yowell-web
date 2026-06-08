<script setup lang="ts">
import type {
  ClientsOverview,
  JuiceProduct,
  Sale,
  SaleDeliveryStatus,
  SalePaymentStatus,
  SalesOverview,
} from "@yowell/shared";
import { formatCfa, PAYMENT_CHANNEL_OPTIONS, paymentChannelLabel } from "@yowell/shared";

const { canWrite, readOnly } = useModulePermission("vente_clients");

const [
  { data, pending, refresh },
  { data: clientsData },
  { data: products },
] = await Promise.all([
  useApiFetch<SalesOverview>(useApiUrl("/sales/overview"), {
    key: "sales-overview",
  }),
  useApiFetch<ClientsOverview>(useApiUrl("/clients/overview"), {
    key: "clients-overview",
  }),
  useApiFetch<JuiceProduct[]>(useApiUrl("/stock/products"), {
    key: "products-for-sales",
  }),
]);

const showSaleForm = ref(false);
const showQuoteForm = ref(false);
const editingSaleId = ref<string | null>(null);
const viewingSale = ref<Sale | null>(null);
const SaleFormLazy = defineAsyncComponent(
  () => import("~/components/SaleForm.vue"),
);
const SaleEditFormLazy = defineAsyncComponent(
  () => import("~/components/SaleEditForm.vue"),
);

const editingSale = computed<Sale | null>(() => {
  if (!editingSaleId.value) return null;
  return (
    data.value?.recentSales.find((s) => s.id === editingSaleId.value) ?? null
  );
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

function openSaleForm() {
  if (!canWrite.value) return;
  showQuoteForm.value = false;
  editingSaleId.value = null;
  showSaleForm.value = true;
}

function openQuoteForm() {
  if (!canWrite.value) return;
  showSaleForm.value = false;
  editingSaleId.value = null;
  showQuoteForm.value = true;
}

function startEditSale(sale: Sale) {
  if (!canWrite.value) return;
  closeSaleDetail();
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
const deletingId = ref<string | null>(null);
const updatingPaymentId = ref<string | null>(null);
const updatingDeliveryId = ref<string | null>(null);
const pendingPaymentChannels = ref<Record<string, "cash" | "om" | "wave">>({});
const { generatingId: generatingInvoiceId, downloadInvoice } = useSaleInvoice();

function paymentChannelForSale(sale: Sale): "cash" | "om" | "wave" {
  return pendingPaymentChannels.value[sale.id] ?? "cash";
}

async function convertToSale(sale: Sale) {
  if (!canWrite.value || sale.kind !== "quote") return;
  convertingId.value = sale.id;
  try {
    await apiFetch(useApiUrl(`/sales/${sale.id}/convert-to-sale`), {
      method: "POST",
      autoReload: false,
    });
    await Promise.all([
      refresh(),
      refreshNuxtData("products-for-sales"),
      refreshNuxtData("stock-overview"),
    ]);
    syncViewingSale(sale.id);
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

function deliveryLabel(status: SaleDeliveryStatus) {
  return status === "delivered" ? "Livré" : "À livrer";
}

function orderPreview(sale: Sale): string {
  const items = sale.items;
  if (!items.length) return "—";
  const first = items[0]!;
  const head = `${first.quantity}× ${first.productName} (${first.volume})`;
  if (items.length === 1) return head;
  const rest = items.length - 1;
  return `${head} + ${rest} autre${rest > 1 ? "s" : ""}`;
}

function openSaleDetail(sale: Sale) {
  viewingSale.value = sale;
}

function closeSaleDetail() {
  viewingSale.value = null;
}

function saleKindLabel(sale: Sale) {
  return sale.kind === "quote" ? "Devis" : "Vente";
}

type DeliveryFilter = "all" | "undelivered" | "delivered";

const deliveryFilter = ref<DeliveryFilter>("all");

const undeliveredSales = computed(
  () => data.value?.undeliveredSales ?? [],
);

const undeliveredCount = computed(() => undeliveredSales.value.length);

const displayedSales = computed(() => {
  const recent = data.value?.recentSales ?? [];
  if (deliveryFilter.value === "undelivered") {
    return undeliveredSales.value;
  }
  if (deliveryFilter.value === "delivered") {
    return recent.filter(
      (sale) =>
        sale.kind === "sale" && sale.deliveryStatus === "delivered",
    );
  }
  return recent;
});

const emptyHistoryMessage = computed(() => {
  if (deliveryFilter.value === "undelivered") {
    return "Aucune livraison en attente.";
  }
  if (deliveryFilter.value === "delivered") {
    return "Aucune vente livrée dans l'historique récent.";
  }
  return "Aucune vente enregistrée.";
});

function focusUndelivered() {
  deliveryFilter.value = "undelivered";
  nextTick(() => {
    document
      .getElementById("ventes-historique")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

async function markAsDelivered(sale: Sale) {
  if (
    !canWrite.value ||
    sale.kind !== "sale" ||
    sale.deliveryStatus === "delivered"
  ) {
    return;
  }
  updatingDeliveryId.value = sale.id;
  try {
    await apiFetch(useApiUrl(`/sales/${sale.id}/delivery-status`), {
      method: "PATCH",
      body: {
        deliveryStatus: "delivered" satisfies SaleDeliveryStatus,
      },
    });
    await refresh();
    syncViewingSale(sale.id);
  } finally {
    updatingDeliveryId.value = null;
  }
}

function syncViewingSale(saleId: string) {
  if (!viewingSale.value || viewingSale.value.id !== saleId) return;
  const updated =
    data.value?.recentSales.find((s) => s.id === saleId) ??
    data.value?.undeliveredSales.find((s) => s.id === saleId);
  if (updated) viewingSale.value = updated;
}

async function markAsPaid(sale: Sale) {
  if (!canWrite.value || sale.paymentStatus === "paid") return;
  updatingPaymentId.value = sale.id;
  try {
    await apiFetch(useApiUrl(`/sales/${sale.id}/payment-status`), {
      method: "PATCH",
      body: {
        paymentStatus: "paid" satisfies SalePaymentStatus,
        paymentChannel: paymentChannelForSale(sale),
      },
    });
    await Promise.all([
      refresh(),
      refreshNuxtData("accounting-overview"),
      refreshNuxtData("clients-overview"),
    ]);
    syncViewingSale(sale.id);
  } finally {
    updatingPaymentId.value = null;
  }
}

async function removeSale(sale: Sale) {
  if (!canWrite.value) return;
  const kindLabel = sale.kind === "quote" ? "devis" : "vente";
  const stockHint =
    sale.kind === "quote" ? "" : " Le stock sera rétabli.";
  if (
    !confirm(
      `Supprimer ce ${kindLabel} pour « ${sale.clientName} » ?${stockHint}`,
    )
  ) {
    return;
  }
  deletingId.value = sale.id;
  try {
    await apiFetch(useApiUrl(`/sales/${sale.id}`), {
      method: "DELETE",
      autoReload: false,
    });
    if (editingSaleId.value === sale.id) {
      editingSaleId.value = null;
    }
    if (viewingSale.value?.id === sale.id) {
      closeSaleDetail();
    }
    await Promise.all([
      refresh(),
      refreshNuxtData("clients-overview"),
      refreshNuxtData("accounting-overview"),
      refreshNuxtData("products-for-sales"),
      refreshNuxtData("stock-overview"),
    ]);
  } finally {
    deletingId.value = null;
  }
}
</script>

<template>
  <div>
    <PageHeader
      title="Ventes"
      description="Enregistre les ventes ou crée un devis sans stock — marque « Payé » pour comptabiliser l'encaissement et « Livré » pour suivre les livraisons."
    />

    <p v-if="pending" class="loading">Chargement des ventes</p>

    <template v-else>
      <ReadOnlyBanner :show="readOnly" />

      <div class="stats-grid stats-grid--4">
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
        <button
          type="button"
          class="stat-card-trigger"
          :disabled="undeliveredCount === 0"
          @click="focusUndelivered"
        >
          <StatCard
            label="À livrer"
            :value="undeliveredCount"
            icon="📦"
            tone="gold"
          />
        </button>
      </div>

      <div class="stock-actions">
        <button
          type="button"
          class="btn btn--primary"
          :disabled="readOnly"
          @click="openSaleForm()"
        >
          + Enregistrer une vente
        </button>
        <button
          type="button"
          class="btn btn--secondary"
          :disabled="readOnly"
          @click="openQuoteForm()"
        >
          + Créer un devis
        </button>
        <NuxtLink to="/clients" class="btn btn--secondary">
          Gérer les clients →
        </NuxtLink>
        <NuxtLink to="/stock" class="btn btn--secondary">
          Catalogue produits →
        </NuxtLink>
      </div>

      <AppModal
        :open="!!editingSale"
        :title="editingSale?.kind === 'quote' ? 'Modifier le devis' : 'Modifier la vente'"
        size="xl"
        @close="cancelEditSale"
      >
        <SaleEditFormLazy
          v-if="editingSale"
          :sale="editingSale"
          :clients="clientOptions"
          :products="products ?? []"
          :readonly="readOnly"
          @success="onSaleEditSuccess"
          @cancel="cancelEditSale"
        />
      </AppModal>

      <AppModal
        :open="showSaleForm"
        title="Nouvelle vente"
        size="xl"
        @close="showSaleForm = false"
      >
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
          :readonly="readOnly"
          @success="onSaleSuccess"
        />
      </AppModal>

      <AppModal
        :open="showQuoteForm"
        title="Nouveau devis"
        size="xl"
        @close="showQuoteForm = false"
      >
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
          :readonly="readOnly"
          @success="onQuoteSuccess"
        />
      </AppModal>

      <AppModal
        :open="!!viewingSale"
        :title="
          viewingSale
            ? `${saleKindLabel(viewingSale)} — ${viewingSale.clientName}`
            : 'Détail'
        "
        size="lg"
        @close="closeSaleDetail"
      >
        <template v-if="viewingSale">
          <dl class="sale-detail-meta">
            <div>
              <dt>Date</dt>
              <dd>
                {{ new Date(viewingSale.orderedAt).toLocaleDateString("fr-FR") }}
              </dd>
            </div>
            <div>
              <dt>Client</dt>
              <dd>{{ viewingSale.clientName }}</dd>
            </div>
            <div>
              <dt>Type</dt>
              <dd>{{ saleKindLabel(viewingSale) }}</dd>
            </div>
            <div>
              <dt>Paiement</dt>
              <dd>
                <span
                  v-if="viewingSale.kind === 'quote'"
                  class="badge badge--quote"
                >
                  Devis
                </span>
                <span
                  v-else
                  class="badge"
                  :class="{
                    'badge--paid': viewingSale.paymentStatus === 'paid',
                    'badge--unpaid': viewingSale.paymentStatus === 'unpaid',
                  }"
                >
                  {{ paymentLabel(viewingSale.paymentStatus) }}
                </span>
                <span
                  v-if="
                    viewingSale.kind !== 'quote' &&
                    viewingSale.paymentStatus === 'paid' &&
                    viewingSale.paymentChannel
                  "
                >
                  — {{ paymentChannelLabel(viewingSale.paymentChannel) }}
                </span>
              </dd>
            </div>
            <div v-if="viewingSale.kind === 'sale'">
              <dt>Livraison</dt>
              <dd>
                <span
                  class="badge"
                  :class="{
                    'badge--delivered':
                      viewingSale.deliveryStatus === 'delivered',
                    'badge--not-delivered':
                      viewingSale.deliveryStatus === 'not_delivered',
                  }"
                >
                  {{ deliveryLabel(viewingSale.deliveryStatus) }}
                </span>
              </dd>
            </div>
          </dl>

          <h3 class="sale-detail__heading">Commande</h3>
          <ul class="sale-items-list sale-detail__items">
            <li v-for="(item, i) in viewingSale.items" :key="i">
              {{ item.quantity }}× {{ item.productName }} ({{ item.volume }})
              — {{ formatCfa(item.lineTotal) }}
            </li>
          </ul>

          <div class="sale-detail-totals">
            <p v-if="viewingSale.personalization">
              Personnalisation incluse
            </p>
            <p v-if="viewingSale.discountAmount > 0">
              Remise : <strong>-{{ formatCfa(viewingSale.discountAmount) }}</strong>
            </p>
            <p class="sale-detail-totals__total">
              Total : <strong>{{ formatCfa(viewingSale.totalAmount) }}</strong>
            </p>
          </div>

          <p v-if="viewingSale.notes" class="sale-detail-notes">
            <strong>Notes :</strong> {{ viewingSale.notes }}
          </p>

          <div
            v-if="
              viewingSale.kind !== 'quote' &&
              viewingSale.paymentStatus === 'unpaid'
            "
            class="sale-detail-channel"
          >
            <label :for="`detail-channel-${viewingSale.id}`">
              Moyen de paiement
            </label>
            <select
              :id="`detail-channel-${viewingSale.id}`"
              :value="paymentChannelForSale(viewingSale)"
              class="payment-channel-select"
              :disabled="readOnly || updatingPaymentId === viewingSale.id"
              @change="
                pendingPaymentChannels[viewingSale.id] = (
                  $event.target as HTMLSelectElement
                ).value as 'cash' | 'om' | 'wave'
              "
            >
              <option
                v-for="option in PAYMENT_CHANNEL_OPTIONS"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </select>
          </div>

          <div class="sale-detail-actions">
            <button
              v-if="viewingSale.kind === 'quote'"
              type="button"
              class="btn btn--primary btn--sm"
              :disabled="readOnly || convertingId === viewingSale.id"
              @click="convertToSale(viewingSale)"
            >
              {{
                convertingId === viewingSale.id
                  ? "…"
                  : "Convertir en vente"
              }}
            </button>
            <button
              v-if="
                viewingSale.kind !== 'quote' &&
                viewingSale.paymentStatus === 'unpaid'
              "
              type="button"
              class="btn btn--primary btn--sm"
              :disabled="readOnly || updatingPaymentId === viewingSale.id"
              @click="markAsPaid(viewingSale)"
            >
              {{
                updatingPaymentId === viewingSale.id
                  ? "…"
                  : "Marquer payé"
              }}
            </button>
            <button
              v-if="
                viewingSale.kind === 'sale' &&
                viewingSale.deliveryStatus === 'not_delivered'
              "
              type="button"
              class="btn btn--primary btn--sm"
              :disabled="readOnly || updatingDeliveryId === viewingSale.id"
              @click="markAsDelivered(viewingSale)"
            >
              {{
                updatingDeliveryId === viewingSale.id
                  ? "…"
                  : "Marquer livré"
              }}
            </button>
            <button
              type="button"
              class="btn btn--ghost btn--sm"
              :disabled="readOnly"
              @click="startEditSale(viewingSale)"
            >
              Modifier
            </button>
            <button
              type="button"
              class="btn btn--ghost btn--sm"
              :disabled="generatingInvoiceId === viewingSale.id"
              @click="downloadInvoice(viewingSale)"
            >
              {{
                generatingInvoiceId === viewingSale.id
                  ? "PDF…"
                  : viewingSale.kind === "quote"
                    ? "Devis PDF"
                    : "Facture PDF"
              }}
            </button>
            <button
              type="button"
              class="btn btn--ghost btn--sm"
              :disabled="readOnly || deletingId === viewingSale.id"
              @click="removeSale(viewingSale)"
            >
              {{ deletingId === viewingSale.id ? "…" : "Supprimer" }}
            </button>
          </div>
        </template>
      </AppModal>

      <section id="ventes-historique" class="panel">
        <div class="panel__header-row">
          <h2 class="panel__title">Historique</h2>
          <div class="ventes-filters">
            <button
              type="button"
              class="btn btn--sm"
              :class="
                deliveryFilter === 'all' ? 'btn--primary' : 'btn--secondary'
              "
              @click="deliveryFilter = 'all'"
            >
              Toutes
            </button>
            <button
              type="button"
              class="btn btn--sm"
              :class="
                deliveryFilter === 'undelivered'
                  ? 'btn--primary'
                  : 'btn--secondary'
              "
              @click="deliveryFilter = 'undelivered'"
            >
              À livrer
              <template v-if="undeliveredCount > 0">
                ({{ undeliveredCount }})
              </template>
            </button>
            <button
              type="button"
              class="btn btn--sm"
              :class="
                deliveryFilter === 'delivered'
                  ? 'btn--primary'
                  : 'btn--secondary'
              "
              @click="deliveryFilter = 'delivered'"
            >
              Livrées
            </button>
          </div>
        </div>
        <div v-if="displayedSales.length" class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Client</th>
                <th>Commande</th>
                <th>Total</th>
                <th>Paiement</th>
                <th>Livraison</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="sale in displayedSales" :key="sale.id">
                <td class="sale-table-date">
                  {{ new Date(sale.orderedAt).toLocaleDateString("fr-FR") }}
                </td>
                <td class="sale-table-client">{{ sale.clientName }}</td>
                <td class="sale-order-cell">
                  <span class="sale-order-preview" :title="orderPreview(sale)">
                    {{ orderPreview(sale) }}
                  </span>
                  <button
                    type="button"
                    class="btn btn--ghost btn--sm"
                    @click="openSaleDetail(sale)"
                  >
                    Voir
                  </button>
                </td>
                <td><strong>{{ formatCfa(sale.totalAmount) }}</strong></td>
                <td class="payment-cell">
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
                      :disabled="readOnly || updatingPaymentId === sale.id"
                      @click="markAsPaid(sale)"
                    >
                      {{
                        updatingPaymentId === sale.id
                          ? "…"
                          : "Marquer payé"
                      }}
                    </button>
                  </template>
                </td>
                <td class="payment-cell">
                  <template v-if="sale.kind === 'sale'">
                    <span
                      class="badge"
                      :class="{
                        'badge--delivered': sale.deliveryStatus === 'delivered',
                        'badge--not-delivered':
                          sale.deliveryStatus === 'not_delivered',
                      }"
                    >
                      {{ deliveryLabel(sale.deliveryStatus) }}
                    </span>
                    <button
                      v-if="sale.deliveryStatus === 'not_delivered'"
                      type="button"
                      class="btn btn--primary btn--sm payment-cell__action"
                      :disabled="readOnly || updatingDeliveryId === sale.id"
                      @click="markAsDelivered(sale)"
                    >
                      {{
                        updatingDeliveryId === sale.id
                          ? "…"
                          : "Marquer livré"
                      }}
                    </button>
                  </template>
                  <span v-else>—</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <EmptyState v-else :message="emptyHistoryMessage" />
      </section>
    </template>
  </div>
</template>

<style scoped>
.stat-card-trigger {
  display: block;
  width: 100%;
  padding: 0;
  border: none;
  background: none;
  text-align: inherit;
  cursor: pointer;
}

.stat-card-trigger:disabled {
  cursor: default;
}

.ventes-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.sale-table-date {
  white-space: nowrap;
}

.sale-table-client {
  max-width: 9rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sale-order-cell {
  max-width: 11rem;
}

.sale-order-preview {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.88rem;
  color: var(--text-soft, #52525b);
  margin-bottom: 0.25rem;
}

.sale-detail-meta {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 0.75rem 1rem;
  margin: 0 0 1.25rem;
}

.sale-detail-meta dt {
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--muted);
  margin: 0 0 0.2rem;
}

.sale-detail-meta dd {
  margin: 0;
  font-size: 0.95rem;
}

.sale-detail__heading {
  font-size: 0.78rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--muted);
  margin: 0 0 0.5rem;
}

.sale-detail__items {
  margin: 0 0 1rem;
}

.sale-detail-totals {
  margin: 0 0 1rem;
  font-size: 0.9rem;
  color: var(--text-soft, #52525b);
}

.sale-detail-totals__total {
  margin: 0.35rem 0 0;
  font-size: 1rem;
  color: var(--text);
}

.sale-detail-notes {
  margin: 0 0 1rem;
  font-size: 0.9rem;
  color: var(--text-soft, #52525b);
}

.sale-detail-channel {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
  font-size: 0.9rem;
}

.sale-detail-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  padding-top: 0.5rem;
  border-top: 1px solid var(--border);
}
</style>
