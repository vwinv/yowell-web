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
const collapsedProductIds = ref<string[]>([]);
const editingProductId = ref<string | null>(null);
const editSubmitting = ref(false);
const editError = ref("");
const editSuccess = ref("");
const editForm = reactive({
  name: "",
  description: "",
  format1LEnabled: true,
  price1L: 0,
  minQuantity1L: 0,
  format250Enabled: false,
  price250: 0,
  minQuantity250: 0,
});

const ProductFormLazy = defineAsyncComponent(
  () => import("~/components/ProductForm.vue"),
);

const apiOrigin = useApiOrigin();

function toggleProductForm() {
  showProductionForm.value = false;
  editingProductId.value = null;
  showProductForm.value = !showProductForm.value;
}

function toggleProductionForm() {
  showProductForm.value = false;
  editingProductId.value = null;
  showProductionForm.value = !showProductionForm.value;
}

function onProductSuccess() {
  refresh();
  showProductForm.value = false;
}

function isProductCollapsed(productId: string) {
  return collapsedProductIds.value.includes(productId);
}

function toggleProductCollapsed(productId: string) {
  if (isProductCollapsed(productId)) {
    collapsedProductIds.value = collapsedProductIds.value.filter(
      (id) => id !== productId,
    );
    return;
  }
  collapsedProductIds.value = [...collapsedProductIds.value, productId];
}

function collapseAllProducts() {
  collapsedProductIds.value = (data.value?.products ?? []).map((p) => p.id);
}

function expandAllProducts() {
  collapsedProductIds.value = [];
}

function startEditProduct(product: JuiceProduct) {
  const format1L = product.formats.find((f) => f.volume === "1L");
  const format250 = product.formats.find((f) => f.volume === "250ml");
  editForm.name = product.name;
  editForm.description = product.description ?? "";
  editForm.format1LEnabled = format1L?.enabled ?? false;
  editForm.price1L = format1L?.price ?? 0;
  editForm.minQuantity1L = format1L?.minQuantity ?? 0;
  editForm.format250Enabled = format250?.enabled ?? false;
  editForm.price250 = format250?.price ?? 0;
  editForm.minQuantity250 = format250?.minQuantity ?? 0;
  editError.value = "";
  editSuccess.value = "";
  showProductForm.value = false;
  showProductionForm.value = false;
  editingProductId.value = product.id;
}

function cancelEditProduct() {
  editingProductId.value = null;
  editError.value = "";
  editSuccess.value = "";
}

async function submitEditProduct() {
  editError.value = "";
  editSuccess.value = "";

  if (!editingProductId.value) return;
  if (!editForm.name.trim()) {
    editError.value = "Le nom du produit est obligatoire.";
    return;
  }
  if (!editForm.format1LEnabled && !editForm.format250Enabled) {
    editError.value = "Active au moins un format.";
    return;
  }
  if (editForm.format1LEnabled && editForm.price1L < 0) {
    editError.value = "Le prix 1 L est invalide.";
    return;
  }
  if (editForm.format250Enabled && editForm.price250 < 0) {
    editError.value = "Le prix 250 ml est invalide.";
    return;
  }

  editSubmitting.value = true;
  try {
    await apiFetch(useApiUrl(`/stock/products/${editingProductId.value}`), {
      method: "PATCH",
      body: {
        name: editForm.name.trim(),
        description: editForm.description.trim(),
        format1LEnabled: editForm.format1LEnabled,
        price1L: editForm.format1LEnabled ? editForm.price1L : 0,
        minQuantity1L: editForm.minQuantity1L,
        format250Enabled: editForm.format250Enabled,
        price250: editForm.format250Enabled ? editForm.price250 : 0,
        minQuantity250: editForm.minQuantity250,
      },
    });
    editSuccess.value = "Produit modifie avec succes.";
    await refresh();
    editingProductId.value = null;
  } catch {
    editError.value = "Impossible de modifier ce produit.";
  } finally {
    editSubmitting.value = false;
  }
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

      <section v-if="editingProductId" class="panel collapsible-panel">
        <h2 class="panel__title">Modifier un produit</h2>
        <form class="form-grid" @submit.prevent="submitEditProduct">
          <div class="form-field form-field--wide">
            <label for="edit-product-name">Nom du produit</label>
            <input id="edit-product-name" v-model="editForm.name" type="text" required />
          </div>
          <div class="form-field form-field--wide">
            <label for="edit-product-description">Description</label>
            <input
              id="edit-product-description"
              v-model="editForm.description"
              type="text"
              placeholder="Description (optionnel)"
            />
          </div>

          <div class="form-field">
            <label>
              <input v-model="editForm.format1LEnabled" type="checkbox" />
              Format 1L actif
            </label>
          </div>
          <div class="form-field">
            <label for="edit-price-1l">Prix 1L (FCFA)</label>
            <input
              id="edit-price-1l"
              v-model.number="editForm.price1L"
              type="number"
              min="0"
              :disabled="!editForm.format1LEnabled"
            />
          </div>
          <div class="form-field">
            <label for="edit-min-1l">Seuil 1L</label>
            <input
              id="edit-min-1l"
              v-model.number="editForm.minQuantity1L"
              type="number"
              min="0"
              :disabled="!editForm.format1LEnabled"
            />
          </div>

          <div class="form-field">
            <label>
              <input v-model="editForm.format250Enabled" type="checkbox" />
              Format 250ml actif
            </label>
          </div>
          <div class="form-field">
            <label for="edit-price-250">Prix 250ml (FCFA)</label>
            <input
              id="edit-price-250"
              v-model.number="editForm.price250"
              type="number"
              min="0"
              :disabled="!editForm.format250Enabled"
            />
          </div>
          <div class="form-field">
            <label for="edit-min-250">Seuil 250ml</label>
            <input
              id="edit-min-250"
              v-model.number="editForm.minQuantity250"
              type="number"
              min="0"
              :disabled="!editForm.format250Enabled"
            />
          </div>

          <div class="form-field form-actions">
            <button type="submit" class="btn btn--primary" :disabled="editSubmitting">
              {{ editSubmitting ? "Mise a jour..." : "Enregistrer les modifications" }}
            </button>
            <button type="button" class="btn btn--ghost" :disabled="editSubmitting" @click="cancelEditProduct">
              Annuler
            </button>
          </div>
        </form>
        <p v-if="editError" class="form-error">{{ editError }}</p>
        <p v-if="editSuccess" class="form-success">{{ editSuccess }}</p>
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
        <div class="panel__header-row">
          <h2 class="panel__title">Catalogue produits</h2>
          <div class="stock-actions" style="margin-bottom: 0">
            <button
              type="button"
              class="btn btn--ghost btn--sm"
              @click="collapseAllProducts"
            >
              Tout reduire
            </button>
            <button
              type="button"
              class="btn btn--ghost btn--sm"
              @click="expandAllProducts"
            >
              Tout etendre
            </button>
          </div>
        </div>
        <div class="product-cards">
          <article
            v-for="p in data.products"
            :key="p.id"
            class="product-card"
            :class="{ 'product-card--collapsed': isProductCollapsed(p.id) }"
          >
            <div class="product-card__summary">
              <strong class="product-card__summary-name">{{ p.name }}</strong>
              <span class="product-card__summary-stock">
                {{ productTotalStock(p) }} unite{{ productTotalStock(p) > 1 ? "s" : "" }}
              </span>
              <button
                type="button"
                class="btn btn--ghost btn--sm"
                @click="toggleProductCollapsed(p.id)"
              >
                {{ isProductCollapsed(p.id) ? "Etendre" : "Reduire" }}
              </button>
            </div>

            <div
              v-if="!isProductCollapsed(p.id)"
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
              <h3 v-if="!isProductCollapsed(p.id)" class="product-card__name">{{ p.name }}</h3>
              <p v-if="p.description" class="product-card__desc">{{ p.description }}</p>
              <div v-if="!isProductCollapsed(p.id)" class="format-prices">
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
            <div v-if="!isProductCollapsed(p.id)" class="product-card__actions">
              <button
                type="button"
                class="btn btn--ghost"
                @click="startEditProduct(p)"
              >
                Modifier
              </button>
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
                      @click="startEditProduct(p)"
                    >
                      Modifier
                    </button>
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
