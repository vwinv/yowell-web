<script setup lang="ts">
import type {
  CreateProductionInput,
  JuiceFormat,
  JuiceProduct,
  JuiceVolume,
  StockOverview,
} from "@yowell/shared";
import { formatCfa, productTotalStock } from "@yowell/shared";

const { data, pending, refresh } = await useApiFetch<StockOverview>(
  useApiUrl("/stock/overview"),
  { key: "stock-overview" },
);

const productionForm = reactive<CreateProductionInput>({
  productId: "",
  volume: "1L",
  quantity: 1,
  producedAt: new Date().toISOString().slice(0, 10),
  notes: "",
});

const productionSubmitting = ref(false);
const productionError = ref("");
const productionSuccess = ref("");

const showProductForm = ref(false);
const showProductionForm = ref(false);

const ProductFormLazy = defineAsyncComponent(
  () => import("~/components/ProductForm.vue"),
);

const apiOrigin = useApiOrigin();

function toggleProductForm() {
  showProductionForm.value = false;
  showProductForm.value = !showProductForm.value;
}

function toggleProductionForm() {
  showProductForm.value = false;
  showProductionForm.value = !showProductionForm.value;
}

function onProductSuccess() {
  refresh();
  showProductForm.value = false;
}

function uploadUrl(path: string) {
  return `${apiOrigin}${path}`;
}

const selectedProduct = computed(() =>
  data.value?.products.find((p) => p.id === productionForm.productId),
);

const enabledFormats = computed((): JuiceFormat[] =>
  selectedProduct.value?.formats.filter((f) => f.enabled) ?? [],
);

watch(
  () => data.value?.products,
  (products) => {
    const first = products?.[0];
    if (first && !productionForm.productId) {
      productionForm.productId = first.id;
      syncProductionVolume(first);
    }
  },
  { immediate: true },
);

watch(
  () => productionForm.productId,
  () => {
    if (selectedProduct.value) {
      syncProductionVolume(selectedProduct.value);
    }
  },
);

function syncProductionVolume(product: JuiceProduct) {
  const formats = product.formats.filter((f) => f.enabled);
  const first = formats[0];
  if (first) {
    productionForm.volume = first.volume;
  }
}

function volumeClass(volume: JuiceVolume) {
  return volume === "250ml" ? "volume-badge--small" : "";
}

function isFormatLow(format: JuiceFormat) {
  return format.enabled && format.quantity <= format.minQuantity;
}

async function submitProduction() {
  productionError.value = "";
  productionSuccess.value = "";
  if (!productionForm.productId) {
    productionError.value = "Ajoute d'abord un produit.";
    return;
  }
  if (!enabledFormats.value.length) {
    productionError.value = "Ce produit n'a aucun format actif.";
    return;
  }

  productionSubmitting.value = true;
  try {
    await apiFetch(useApiUrl("/stock/productions"), {
      method: "POST",
      body: {
        productId: productionForm.productId,
        volume: productionForm.volume,
        quantity: productionForm.quantity,
        producedAt: productionForm.producedAt,
        notes: productionForm.notes,
      },
    });
    productionForm.quantity = 1;
    productionForm.notes = "";
    productionSuccess.value = "Production enregistrée — stock mis à jour.";
    await refresh();
    showProductionForm.value = false;
  } catch {
    productionError.value = "Impossible d'enregistrer la production.";
  } finally {
    productionSubmitting.value = false;
  }
}

async function removeProduct(id: string, name: string) {
  if (!confirm(`Supprimer « ${name} » ?`)) return;
  await apiFetch(useApiUrl(`/stock/products/${id}`), { method: "DELETE" });
  await refresh();
}
</script>

<template>
  <div>
    <PageHeader
      title="Stock"
      description="Un jus = une fiche. Formats 1 L et/ou 250 ml, chacun avec son prix et son stock."
    />

    <p v-if="pending" class="loading">Chargement du stock</p>

    <template v-else>
      <div class="stats-grid">
        <StatCard
          label="Unités en stock"
          :value="data?.totalUnitsInStock ?? 0"
          icon="📦"
          tone="green"
        />
        <StatCard
          label="Produits"
          :value="data?.products.length ?? 0"
          icon="🧃"
          tone="blue"
        />
        <StatCard
          label="Productions (mois)"
          :value="data?.productionsThisMonth ?? 0"
          icon="⚗️"
          tone="gold"
        />
        <StatCard
          label="Stock bas"
          :value="data?.lowStockCount ?? 0"
          icon="⚠️"
          tone="orange"
        />
      </div>

      <div class="stock-actions">
        <button
          type="button"
          class="btn btn--primary"
          :aria-expanded="showProductForm"
          @click="toggleProductForm"
        >
          {{ showProductForm ? "Masquer le formulaire" : "+ Enregistrer un produit" }}
        </button>
        <button
          type="button"
          class="btn btn--secondary"
          :aria-expanded="showProductionForm"
          @click="toggleProductionForm"
        >
          {{ showProductionForm ? "Masquer le formulaire" : "+ Noter une production" }}
        </button>
      </div>

      <section v-if="showProductForm" class="panel collapsible-panel">
        <h2 class="panel__title">Enregistrer un produit</h2>
        <ProductFormLazy @success="onProductSuccess" />
      </section>

      <section v-if="showProductionForm" class="panel collapsible-panel">
        <h2 class="panel__title">Enregistrer une production</h2>
        <form class="form-grid" @submit.prevent="submitProduction">
          <div class="form-field form-field--wide">
            <label for="production-product">Produit</label>
            <select
              id="production-product"
              v-model="productionForm.productId"
              :disabled="!data?.products.length"
            >
              <option v-if="!data?.products.length" value="">
                Aucun produit — crée une fiche produit d'abord
              </option>
              <option
                v-for="p in data?.products"
                :key="p.id"
                :value="p.id"
              >
                {{ p.name }} ({{ productTotalStock(p) }} unités au total)
              </option>
            </select>
          </div>
          <div class="form-field form-field--wide">
            <label for="production-volume">Format produit</label>
            <select
              id="production-volume"
              v-model="productionForm.volume"
              :disabled="!enabledFormats.length"
            >
              <option
                v-for="f in enabledFormats"
                :key="f.volume"
                :value="f.volume"
              >
                {{ f.volume }} — stock : {{ f.quantity }} — {{ formatCfa(f.price) }}
              </option>
            </select>
          </div>
          <div class="form-field">
            <label for="production-qty">Quantité produite</label>
            <input
              id="production-qty"
              v-model.number="productionForm.quantity"
              type="number"
              min="1"
              required
            />
          </div>
          <div class="form-field">
            <label for="production-date">Date</label>
            <input
              id="production-date"
              v-model="productionForm.producedAt"
              type="date"
              required
            />
          </div>
          <div class="form-field form-field--wide">
            <label for="production-notes">Notes (optionnel)</label>
            <input
              id="production-notes"
              v-model="productionForm.notes"
              type="text"
              placeholder="Ex. lot du matin, recette test…"
            />
          </div>
          <div class="form-field form-actions">
            <button
              type="submit"
              class="btn btn--primary"
              :disabled="productionSubmitting || !data?.products.length"
            >
              {{ productionSubmitting ? "Enregistrement…" : "Noter la production" }}
            </button>
          </div>
        </form>
        <p v-if="productionError" class="form-error">{{ productionError }}</p>
        <p v-if="productionSuccess" class="form-success">{{ productionSuccess }}</p>
      </section>

      <section v-if="data?.products.length" class="panel" style="margin-bottom: 1.25rem">
        <h2 class="panel__title">Catalogue produits</h2>
        <div class="product-cards">
          <article
            v-for="p in data.products"
            :key="p.id"
            class="product-card"
          >
            <div
              class="product-card__media"
              :class="{ 'product-card__media--empty': !p.photoUrls.length }"
            >
              <template v-if="p.photoUrls.length">
                <img
                  v-for="(url, i) in p.photoUrls.slice(0, 4)"
                  :key="url"
                  :src="uploadUrl(url)"
                  :alt="`${p.name} — photo ${i + 1}`"
                />
              </template>
              <span v-else>Sans photo</span>
            </div>
            <div class="product-card__body">
              <h3 class="product-card__name">{{ p.name }}</h3>
              <p v-if="p.description" class="product-card__desc">{{ p.description }}</p>
              <div class="format-prices">
                <div
                  v-for="f in p.formats.filter((x) => x.enabled)"
                  :key="f.volume"
                  class="format-prices__line"
                >
                  <span class="volume-badge" :class="volumeClass(f.volume)">
                    {{ f.volume }}
                  </span>
                  <span class="format-prices__price">{{ formatCfa(f.price) }}</span>
                  <span
                    :class="{ 'stock-low': isFormatLow(f) }"
                  >
                    {{ f.quantity }} en stock
                  </span>
                </div>
              </div>
            </div>
            <div class="product-card__actions">
              <button
                type="button"
                class="btn btn--ghost"
                @click="removeProduct(p.id, p.name)"
              >
                Supprimer
              </button>
            </div>
          </article>
        </div>
      </section>

      <section class="panel">
        <h2 class="panel__title">Inventaire (tableau)</h2>
        <div v-if="data?.products.length" class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>Photo</th>
                <th>Produit</th>
                <th>Description</th>
                <th>Format</th>
                <th>Prix (FCFA)</th>
                <th>En stock</th>
                <th />
              </tr>
            </thead>
            <tbody>
              <template v-for="p in data.products" :key="p.id">
                <tr
                  v-for="(f, idx) in p.formats.filter((x) => x.enabled)"
                  :key="`${p.id}-${f.volume}`"
                >
                  <td v-if="idx === 0" :rowspan="p.formats.filter((x) => x.enabled).length">
                    <img
                      v-if="p.photoUrls[0]"
                      :src="uploadUrl(p.photoUrls[0])"
                      :alt="p.name"
                      width="48"
                      height="48"
                      style="object-fit: cover; border-radius: 6px"
                    />
                    <span v-else>—</span>
                  </td>
                  <td v-if="idx === 0" :rowspan="p.formats.filter((x) => x.enabled).length">
                    {{ p.name }}
                  </td>
                  <td v-if="idx === 0" :rowspan="p.formats.filter((x) => x.enabled).length">
                    {{ p.description || "—" }}
                  </td>
                  <td>
                    <span class="volume-badge" :class="volumeClass(f.volume)">
                      {{ f.volume }}
                    </span>
                  </td>
                  <td>{{ formatCfa(f.price) }}</td>
                  <td :class="{ 'stock-low': isFormatLow(f) }">
                    {{ f.quantity }}
                  </td>
                  <td v-if="idx === 0" :rowspan="p.formats.filter((x) => x.enabled).length">
                    <button
                      type="button"
                      class="btn btn--ghost"
                      @click="removeProduct(p.id, p.name)"
                    >
                      Supprimer
                    </button>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
        <EmptyState
          v-else
          message="Aucun produit — utilise le formulaire ci-dessus pour créer ta première fiche."
        />
      </section>

      <section class="panel" style="margin-top: 1.25rem">
        <h2 class="panel__title">Historique des productions</h2>
        <div v-if="data?.recentProductions.length" class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Produit</th>
                <th>Format</th>
                <th>Quantité</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="prod in data.recentProductions"
                :key="prod.id"
              >
                <td>{{ new Date(prod.producedAt).toLocaleDateString("fr-FR") }}</td>
                <td>{{ prod.productName }}</td>
                <td>
                  <span
                    class="volume-badge"
                    :class="volumeClass(prod.volume)"
                  >
                    {{ prod.volume }}
                  </span>
                </td>
                <td>+{{ prod.quantity }}</td>
                <td>{{ prod.notes || "—" }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <EmptyState
          v-else
          message="Aucune production enregistrée."
        />
      </section>
    </template>
  </div>
</template>
