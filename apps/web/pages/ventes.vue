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

const undeliveredSales = computed(
  () => data.value?.undeliveredSales ?? [],
);

async function updateDeliveryStatus(
  sale: Sale,
  deliveryStatus: SaleDeliveryStatus,
) {
  if (!canWrite.value || sale.kind !== "sale") return;
  if (sale.deliveryStatus === deliveryStatus) return;
  updatingDeliveryId.value = sale.id;
  try {
    await apiFetch(useApiUrl(`/sales/${sale.id}/delivery-status`), {
      method: "PATCH",
      body: { deliveryStatus },
    });
    await refresh();
  } finally {
    updatingDeliveryId.value = null;
  }
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

      <section
        v-if="undeliveredSales.length"
        class="delivery-alert"
        role="status"
      >
        <p class="delivery-alert__title">
          📦 {{ undeliveredSales.length }} commande{{
            undeliveredSales.length > 1 ? "s" : ""
          }}
          en attente de livraison
        </p>
        <ul class="delivery-alert__list">
          <li
            v-for="sale in undeliveredSales"
            :key="sale.id"
            class="delivery-alert__item"
          >
            <span class="delivery-alert__info">
              <strong>{{ sale.clientName }}</strong>
              — {{ formatCfa(sale.totalAmount) }}
              — {{ new Date(sale.orderedAt).toLocaleDateString("fr-FR") }}
            </span>
            <button
              type="button"
              class="btn btn--primary btn--sm"
              :disabled="readOnly || updatingDeliveryId === sale.id"
              @click="updateDeliveryStatus(sale, 'delivered')"
            >
              {{
                updatingDeliveryId === sale.id
                  ? "…"
                  : "Marquer livré"
              }}
            </button>
          </li>
        </ul>
      </section>

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
                <th>Livraison</th>
                <th>Canal</th>
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
                  <button
                    v-if="sale.kind === 'quote'"
                    type="button"
                    class="btn btn--primary btn--sm payment-cell__action"
                    :disabled="readOnly || convertingId === sale.id"
                    @click="convertToSale(sale)"
                  >
                    {{
                      convertingId === sale.id
                        ? "…"
                        : "Convertir en vente"
                    }}
                  </button>
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
                      @click="updateDeliveryStatus(sale, 'delivered')"
                    >
                      {{
                        updatingDeliveryId === sale.id
                          ? "…"
                          : "Marquer livré"
                      }}
                    </button>
                    <button
                      v-else
                      type="button"
                      class="btn btn--ghost btn--sm payment-cell__action"
                      :disabled="readOnly || updatingDeliveryId === sale.id"
                      @click="updateDeliveryStatus(sale, 'not_delivered')"
                    >
                      {{
                        updatingDeliveryId === sale.id
                          ? "…"
                          : "Annuler livraison"
                      }}
                    </button>
                  </template>
                  <span v-else>—</span>
                </td>
                <td>
                  <span v-if="sale.paymentStatus === 'paid' && sale.paymentChannel">
                    {{ paymentChannelLabel(sale.paymentChannel) }}
                  </span>
                  <select
                    v-else-if="sale.kind !== 'quote' && sale.paymentStatus === 'unpaid'"
                    :value="paymentChannelForSale(sale)"
                    class="payment-channel-select"
                    :disabled="readOnly || updatingPaymentId === sale.id"
                    @change="pendingPaymentChannels[sale.id] = ($event.target as HTMLSelectElement).value as 'cash' | 'om' | 'wave'"
                  >
                    <option
                      v-for="option in PAYMENT_CHANNEL_OPTIONS"
                      :key="option.value"
                      :value="option.value"
                    >
                      {{ option.label }}
                    </option>
                  </select>
                  <span v-else>—</span>
                </td>
                <td>{{ sale.notes || "—" }}</td>
                <td class="table-actions">
                  <button
                    type="button"
                    class="btn btn--ghost btn--sm"
                    style="margin-right: 0.35rem"
                    :disabled="readOnly"
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
                  <button
                    type="button"
                    class="btn btn--ghost btn--sm"
                    style="margin-left: 0.35rem"
                    :disabled="readOnly || deletingId === sale.id"
                    @click="removeSale(sale)"
                  >
                    {{ deletingId === sale.id ? "…" : "Supprimer" }}
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

<style scoped>
.delivery-alert {
  margin: 0 0 1.25rem;
  padding: 0.85rem 1rem;
  border-radius: 10px;
  background: #fff7ed;
  border: 1px solid #fdba74;
}

.delivery-alert__title {
  margin: 0 0 0.65rem;
  font-weight: 600;
  color: #9a3412;
}

.delivery-alert__list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.delivery-alert__item {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: #7c2d12;
}

.delivery-alert__info {
  min-width: 0;
}
</style>
