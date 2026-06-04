<script setup lang="ts">
import type {
  CreateProductionInput,
  JuiceFormat,
  JuiceProduct,
  JuiceVolume,
  ProductionRecord,
  StockOverview,
  UpdateProductionInput,
} from "@yowell/shared";
import { formatCfa, productTotalStock } from "@yowell/shared";

const { readOnly } = useModulePermission("stock");

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

const editingProductionId = ref<string | null>(null);
const editProductionForm = reactive<UpdateProductionInput>({
  productId: "",
  volume: "1L",
  quantity: 1,
  producedAt: new Date().toISOString().slice(0, 10),
  notes: "",
});
const editProductionSubmitting = ref(false);
const editProductionError = ref("");
const editProductionSuccess = ref("");
const deletingProductionId = ref<string | null>(null);

const showProductForm = ref(false);
const showProductionForm = ref(false);
const isCatalogueCollapsed = ref(false);
const isInventoryCollapsed = ref(false);
const isProductionHistoryCollapsed = ref(false);
type StockTab = "catalogue" | "production";
const activeTab = ref<StockTab>("catalogue");
const editingProductId = ref<string | null>(null);
const editSubmitting = ref(false);
const editError = ref("");
const editSuccess = ref("");
const editPhotoInput = ref<HTMLInputElement | null>(null);
const editPhotoFiles = ref<File[]>([]);
const editPhotoPreviews = ref<string[]>([]);
const editExistingPhotoUrls = ref<string[]>([]);
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

function openProductForm() {
  showProductionForm.value = false;
  editingProductId.value = null;
  showProductForm.value = true;
}

function openProductionForm() {
  showProductForm.value = false;
  editingProductId.value = null;
  editingProductionId.value = null;
  activeTab.value = "production";
  showProductionForm.value = true;
}

function startEditProduction(prod: ProductionRecord) {
  editProductionForm.productId = prod.productId;
  editProductionForm.volume = prod.volume;
  editProductionForm.quantity = prod.quantity;
  editProductionForm.producedAt = prod.producedAt.slice(0, 10);
  editProductionForm.notes = prod.notes;
  editProductionError.value = "";
  editProductionSuccess.value = "";
  showProductForm.value = false;
  showProductionForm.value = false;
  editingProductId.value = null;
  editingProductionId.value = prod.id;
  activeTab.value = "production";
}

function cancelEditProduction() {
  editingProductionId.value = null;
  editProductionError.value = "";
  editProductionSuccess.value = "";
}

async function refreshStockData() {
  await Promise.all([
    refresh(),
    refreshNuxtData("products-for-sales"),
  ]);
}

function onProductSuccess() {
  void refreshStockData();
  showProductForm.value = false;
}

function collapseAllProducts() {
  isCatalogueCollapsed.value = true;
}

function expandAllProducts() {
  isCatalogueCollapsed.value = false;
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
  editPhotoFiles.value = [];
  for (const url of editPhotoPreviews.value) {
    URL.revokeObjectURL(url);
  }
  editPhotoPreviews.value = [];
  editExistingPhotoUrls.value = [...product.photoUrls];
  if (editPhotoInput.value) editPhotoInput.value.value = "";
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
  editPhotoFiles.value = [];
  editExistingPhotoUrls.value = [];
  for (const url of editPhotoPreviews.value) {
    URL.revokeObjectURL(url);
  }
  editPhotoPreviews.value = [];
  if (editPhotoInput.value) editPhotoInput.value.value = "";
}

function onEditPhotosChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const files = Array.from(input.files ?? []);
  editPhotoFiles.value = files;

  for (const url of editPhotoPreviews.value) {
    URL.revokeObjectURL(url);
  }
  editPhotoPreviews.value = files.map((f) => URL.createObjectURL(f));
}

function removeEditPhoto(index: number) {
  const files = [...editPhotoFiles.value];
  files.splice(index, 1);
  editPhotoFiles.value = files;

  const preview = editPhotoPreviews.value[index];
  if (preview) URL.revokeObjectURL(preview);
  editPhotoPreviews.value.splice(index, 1);

  if (editPhotoInput.value) {
    const dt = new DataTransfer();
    for (const f of files) dt.items.add(f);
    editPhotoInput.value.files = dt.files;
  }
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
    const formData = new FormData();
    formData.append("name", editForm.name.trim());
    formData.append("description", editForm.description.trim());
    formData.append("format1LEnabled", String(editForm.format1LEnabled));
    formData.append("price1L", String(editForm.format1LEnabled ? editForm.price1L : 0));
    formData.append("minQuantity1L", String(editForm.minQuantity1L));
    formData.append("format250Enabled", String(editForm.format250Enabled));
    formData.append("price250", String(editForm.format250Enabled ? editForm.price250 : 0));
    formData.append("minQuantity250", String(editForm.minQuantity250));
    for (const file of editPhotoFiles.value) {
      formData.append("photos", file);
    }

    await apiFetch(useApiUrl(`/stock/products/${editingProductId.value}`), {
      method: "PATCH",
      body: formData,
    });
    editSuccess.value = "Produit modifie avec succes.";
    await refreshStockData();
    editingProductId.value = null;
    editPhotoFiles.value = [];
    editExistingPhotoUrls.value = [];
    for (const url of editPhotoPreviews.value) {
      URL.revokeObjectURL(url);
    }
    editPhotoPreviews.value = [];
    if (editPhotoInput.value) editPhotoInput.value.value = "";
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
const firstProduct = computed(() => data.value?.products[0] ?? null);
const firstProduction = computed(
  () => data.value?.recentProductions[0] ?? null,
);
const firstInventoryRow = computed(() => {
  const product = firstProduct.value;
  if (!product) return null;
  const format = product.formats.find((x) => x.enabled) ?? null;
  return { product, format };
});

const enabledFormats = computed((): JuiceFormat[] =>
  selectedProduct.value?.formats.filter((f) => f.enabled) ?? [],
);

const editSelectedProduct = computed(() =>
  data.value?.products.find((p) => p.id === editProductionForm.productId),
);

const editEnabledFormats = computed((): JuiceFormat[] =>
  editSelectedProduct.value?.formats.filter((f) => f.enabled) ?? [],
);

type StockSnapshotLine = { product: JuiceProduct; format: JuiceFormat };

const stockSnapshotLines = computed((): StockSnapshotLine[] => {
  const lines: StockSnapshotLine[] = [];
  for (const product of data.value?.products ?? []) {
    for (const format of product.formats) {
      if (format.enabled && format.quantity > 0) {
        lines.push({ product, format });
      }
    }
  }
  return lines;
});

const stockAsOfLabel = ref("");

function updateStockAsOfLabel() {
  stockAsOfLabel.value = new Date().toLocaleString("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

watch(
  () => data.value,
  (overview) => {
    if (overview) updateStockAsOfLabel();
  },
  { immediate: true },
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

watch(
  () => editProductionForm.productId,
  () => {
    if (editSelectedProduct.value) {
      syncProductionVolume(editSelectedProduct.value, editProductionForm);
    }
  },
);

onUnmounted(() => {
  for (const url of editPhotoPreviews.value) {
    URL.revokeObjectURL(url);
  }
});

function syncProductionVolume(
  product: JuiceProduct,
  form: { volume: JuiceVolume } = productionForm,
) {
  const formats = product.formats.filter((f) => f.enabled);
  const current = formats.find((f) => f.volume === form.volume);
  if (!current && formats[0]) {
    form.volume = formats[0].volume;
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
    await refreshStockData();
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
  await refreshStockData();
}

async function submitEditProduction() {
  editProductionError.value = "";
  editProductionSuccess.value = "";

  if (!editingProductionId.value) return;
  if (!editProductionForm.productId) {
    editProductionError.value = "Choisis un produit.";
    return;
  }
  if (!editEnabledFormats.value.length) {
    editProductionError.value = "Ce produit n'a aucun format actif.";
    return;
  }
  if (editProductionForm.quantity < 1) {
    editProductionError.value = "La quantité doit être au moins 1.";
    return;
  }

  editProductionSubmitting.value = true;
  try {
    await apiFetch(
      useApiUrl(`/stock/productions/${editingProductionId.value}`),
      {
        method: "PATCH",
        body: {
          productId: editProductionForm.productId,
          volume: editProductionForm.volume,
          quantity: editProductionForm.quantity,
          producedAt: editProductionForm.producedAt,
          notes: editProductionForm.notes,
        },
      },
    );
    editProductionSuccess.value = "Production modifiée — stock mis à jour.";
    await refreshStockData();
    editingProductionId.value = null;
  } catch {
    editProductionError.value =
      "Impossible de modifier cette production. Le stock actuel est peut-être insuffisant pour appliquer la correction.";
  } finally {
    editProductionSubmitting.value = false;
  }
}

async function cancelProductionRecord(prod: ProductionRecord) {
  const label = `${prod.quantity} × ${prod.productName} (${prod.volume})`;
  if (
    !confirm(
      `Annuler cette production ?\n\n${label}\n\nLe stock sera diminué de ${prod.quantity} unité(s).`,
    )
  ) {
    return;
  }

  deletingProductionId.value = prod.id;
  try {
    await apiFetch(useApiUrl(`/stock/productions/${prod.id}`), {
      method: "DELETE",
    });
    await refreshStockData();
  } catch {
    alert(
      "Impossible d'annuler cette production. Le stock actuel est peut-être insuffisant (des ventes ont déjà consommé des unités).",
    );
  } finally {
    deletingProductionId.value = null;
  }
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
      <div :class="{ 'page--read-only': readOnly }">
      <ReadOnlyBanner :show="readOnly" />

      <section class="panel stock-snapshot" aria-readonly="true">
        <div class="panel__header-row stock-snapshot__header">
          <div>
            <h2 class="panel__title">Stock actuel</h2>
            <p class="stock-snapshot__time">
              À l'instant — {{ stockAsOfLabel }}
            </p>
          </div>
          <div class="stock-snapshot__summary">
            <span class="stock-snapshot__badge">Lecture seule</span>
            <p class="stock-snapshot__total">
              <strong>{{ data?.totalUnitsInStock ?? 0 }}</strong>
              unité{{ (data?.totalUnitsInStock ?? 0) > 1 ? "s" : "" }} au total
            </p>
          </div>
        </div>

        <div
          v-if="stockSnapshotLines.length"
          class="table-wrap stock-snapshot__table"
        >
          <table class="table">
            <thead>
              <tr>
                <th>Produit</th>
                <th>Format</th>
                <th>Reste en stock</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="line in stockSnapshotLines"
                :key="`${line.product.id}-${line.format.volume}`"
              >
                <td>{{ line.product.name }}</td>
                <td>
                  <span
                    class="volume-badge"
                    :class="volumeClass(line.format.volume)"
                  >
                    {{ line.format.volume }}
                  </span>
                </td>
                <td :class="{ 'stock-low': isFormatLow(line.format) }">
                  {{ line.format.quantity }}
                  <span
                    v-if="isFormatLow(line.format)"
                    class="stock-snapshot__low-hint"
                  >
                    (stock bas)
                  </span>
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td colspan="2"><strong>Total général</strong></td>
                <td>
                  <strong>{{ data?.totalUnitsInStock ?? 0 }}</strong>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
        <EmptyState
          v-else-if="data?.products.length"
          message="Aucune unité en stock pour le moment."
        />
        <EmptyState
          v-else
          message="Aucun produit enregistré — le stock actuel est vide."
        />
      </section>

      <nav class="page-tabs" role="tablist" aria-label="Sections stock">
        <button
          type="button"
          role="tab"
          class="page-tabs__tab"
          :class="{ 'page-tabs__tab--active': activeTab === 'catalogue' }"
          :aria-selected="activeTab === 'catalogue'"
          @click="activeTab = 'catalogue'"
        >
          Catalogue
        </button>
        <button
          type="button"
          role="tab"
          class="page-tabs__tab"
          :class="{ 'page-tabs__tab--active': activeTab === 'production' }"
          :aria-selected="activeTab === 'production'"
          @click="activeTab = 'production'"
        >
          Production
        </button>
      </nav>

      <AppModal
        :open="showProductForm"
        title="Enregistrer un produit"
        size="xl"
        @close="showProductForm = false"
      >
        <ProductFormLazy @success="onProductSuccess" />
      </AppModal>

      <AppModal
        :open="!!editingProductId"
        title="Modifier un produit"
        size="xl"
        @close="cancelEditProduct"
      >
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

          <div class="form-field form-field--wide">
            <label for="edit-photos">Photos du produit</label>
            <input
              id="edit-photos"
              ref="editPhotoInput"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              @change="onEditPhotosChange"
            />
            <small>
              Ajoute des photos pour remplacer les photos actuelles (max 6 images, 5 Mo chacune).
            </small>
          </div>

          <div class="form-field form-field--wide">
            <p style="margin: 0 0 0.4rem; font-weight: 600">Photos actuelles</p>
            <div v-if="editExistingPhotoUrls.length" class="photo-preview-grid">
              <figure
                v-for="(url, index) in editExistingPhotoUrls"
                :key="`existing-${url}`"
                class="photo-preview"
              >
                <img :src="uploadUrl(url)" :alt="`Photo actuelle ${index + 1}`" />
              </figure>
            </div>
            <p v-else class="photo-preview-empty">Aucune photo</p>
          </div>

          <div v-if="editPhotoPreviews.length" class="form-field form-field--wide">
            <p style="margin: 0 0 0.4rem; font-weight: 600">Nouvelles photos</p>
            <div class="photo-preview-grid">
              <figure
                v-for="(src, index) in editPhotoPreviews"
                :key="src"
                class="photo-preview"
              >
                <img :src="src" :alt="`Nouvelle photo ${index + 1}`" />
                <button
                  type="button"
                  class="photo-preview__remove"
                  aria-label="Retirer la photo"
                  @click="removeEditPhoto(index)"
                >
                  ×
                </button>
              </figure>
            </div>
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
      </AppModal>

      <AppModal
        :open="!!editingProductionId"
        title="Modifier une production"
        @close="cancelEditProduction"
      >
        <form class="form-grid" @submit.prevent="submitEditProduction">
          <div class="form-field form-field--wide">
            <label for="edit-production-product">Produit</label>
            <select
              id="edit-production-product"
              v-model="editProductionForm.productId"
              :disabled="!data?.products.length"
            >
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
            <label for="edit-production-volume">Format produit</label>
            <select
              id="edit-production-volume"
              v-model="editProductionForm.volume"
              :disabled="!editEnabledFormats.length"
            >
              <option
                v-for="f in editEnabledFormats"
                :key="f.volume"
                :value="f.volume"
              >
                {{ f.volume }} — stock : {{ f.quantity }} — {{ formatCfa(f.price) }}
              </option>
            </select>
          </div>
          <div class="form-field">
            <label for="edit-production-qty">Quantité produite</label>
            <input
              id="edit-production-qty"
              v-model.number="editProductionForm.quantity"
              type="number"
              min="1"
              required
            />
          </div>
          <div class="form-field">
            <label for="edit-production-date">Date</label>
            <input
              id="edit-production-date"
              v-model="editProductionForm.producedAt"
              type="date"
              required
            />
          </div>
          <div class="form-field form-field--wide">
            <label for="edit-production-notes">Notes (optionnel)</label>
            <input
              id="edit-production-notes"
              v-model="editProductionForm.notes"
              type="text"
              placeholder="Ex. lot du matin, recette test…"
            />
          </div>
          <div class="form-field form-actions">
            <button
              type="submit"
              class="btn btn--primary"
              :disabled="editProductionSubmitting || !data?.products.length"
            >
              {{ editProductionSubmitting ? "Mise à jour…" : "Enregistrer les modifications" }}
            </button>
            <button
              type="button"
              class="btn btn--ghost"
              :disabled="editProductionSubmitting"
              @click="cancelEditProduction"
            >
              Annuler
            </button>
          </div>
        </form>
        <p v-if="editProductionError" class="form-error">{{ editProductionError }}</p>
        <p v-if="editProductionSuccess" class="form-success">{{ editProductionSuccess }}</p>
      </AppModal>

      <AppModal
        :open="showProductionForm"
        title="Enregistrer une production"
        @close="showProductionForm = false"
      >
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
      </AppModal>

      <div
        v-if="activeTab === 'catalogue'"
        class="page-tab-panel"
        role="tabpanel"
        aria-label="Catalogue"
      >
        <div class="stock-actions">
          <button
            type="button"
            class="btn btn--primary"
            @click="openProductForm"
          >
            + Enregistrer un produit
          </button>
        </div>

        <section v-if="data?.products.length" class="panel" style="margin-bottom: 1.25rem">
        <div class="panel__header-row">
          <h2 class="panel__title">Catalogue produits</h2>
          <div class="stock-toggle-group">
            <button
              type="button"
              class="stock-toggle-btn stock-toggle-btn--collapse"
              aria-label="Réduire"
              title="Réduire"
              @click="collapseAllProducts"
            >
              −
            </button>
            <button
              type="button"
              class="stock-toggle-btn stock-toggle-btn--expand"
              aria-label="Étendre"
              title="Étendre"
              @click="expandAllProducts"
            >
              +
            </button>
          </div>
        </div>
        <div v-if="isCatalogueCollapsed" class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>Produit</th>
                <th>Formats actifs</th>
                <th>Stock total</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="firstProduct">
                <td>{{ firstProduct.name }}</td>
                <td>
                  {{
                    firstProduct.formats
                      .filter((x) => x.enabled)
                      .map((f) => f.volume)
                      .join(", ") || "—"
                  }}
                </td>
                <td>{{ productTotalStock(firstProduct) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="product-cards">
          <article
            v-for="p in data.products"
            :key="p.id"
            class="product-card"
          >
            <div class="product-card__summary">
              <strong class="product-card__summary-name">{{ p.name }}</strong>
              <span class="product-card__summary-stock">
                {{ productTotalStock(p) }} unite{{ productTotalStock(p) > 1 ? "s" : "" }}
              </span>
            </div>

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
                  loading="lazy"
                  decoding="async"
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
        <div class="panel__header-row">
          <h2 class="panel__title">Inventaire (tableau)</h2>
          <div class="stock-toggle-group">
            <button
              type="button"
              class="stock-toggle-btn stock-toggle-btn--collapse"
              aria-label="Réduire"
              title="Réduire"
              @click="isInventoryCollapsed = true"
            >
              −
            </button>
            <button
              type="button"
              class="stock-toggle-btn stock-toggle-btn--expand"
              aria-label="Étendre"
              title="Étendre"
              @click="isInventoryCollapsed = false"
            >
              +
            </button>
          </div>
        </div>
        <div v-if="data?.products.length && !isInventoryCollapsed" class="table-wrap">
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
                      loading="lazy"
                      decoding="async"
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
        <div v-else-if="data?.products.length && isInventoryCollapsed" class="table-wrap">
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
              <tr v-if="firstInventoryRow">
                <td>
                  <img
                    v-if="firstInventoryRow.product.photoUrls[0]"
                    :src="uploadUrl(firstInventoryRow.product.photoUrls[0])"
                    :alt="firstInventoryRow.product.name"
                    width="48"
                    height="48"
                    loading="lazy"
                    decoding="async"
                    style="object-fit: cover; border-radius: 6px"
                  />
                  <span v-else>—</span>
                </td>
                <td>{{ firstInventoryRow.product.name }}</td>
                <td>{{ firstInventoryRow.product.description || "—" }}</td>
                <td>
                  <span
                    v-if="firstInventoryRow.format"
                    class="volume-badge"
                    :class="volumeClass(firstInventoryRow.format.volume)"
                  >
                    {{ firstInventoryRow.format.volume }}
                  </span>
                  <span v-else>—</span>
                </td>
                <td>{{ firstInventoryRow.format ? formatCfa(firstInventoryRow.format.price) : "—" }}</td>
                <td :class="{ 'stock-low': firstInventoryRow.format ? isFormatLow(firstInventoryRow.format) : false }">
                  {{ firstInventoryRow.format?.quantity ?? "—" }}
                </td>
                <td>
                  <button
                    type="button"
                    class="btn btn--ghost"
                    @click="startEditProduct(firstInventoryRow.product)"
                  >
                    Modifier
                  </button>
                  <button
                    type="button"
                    class="btn btn--ghost"
                    @click="removeProduct(firstInventoryRow.product.id, firstInventoryRow.product.name)"
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
          message="Aucun produit — utilise le bouton ci-dessus pour créer ta première fiche."
        />
        </section>
      </div>

      <div
        v-if="activeTab === 'production'"
        class="page-tab-panel"
        role="tabpanel"
        aria-label="Production"
      >
        <div class="stock-actions">
          <button
            type="button"
            class="btn btn--primary"
            @click="openProductionForm"
          >
            + Noter une production
          </button>
        </div>

        <section class="panel">
        <div class="panel__header-row">
          <h2 class="panel__title">Historique des productions</h2>
          <div
            v-if="data?.recentProductions.length"
            class="stock-toggle-group"
          >
            <button
              type="button"
              class="stock-toggle-btn stock-toggle-btn--collapse"
              aria-label="Réduire"
              title="Réduire"
              @click="isProductionHistoryCollapsed = true"
            >
              −
            </button>
            <button
              type="button"
              class="stock-toggle-btn stock-toggle-btn--expand"
              aria-label="Étendre"
              title="Étendre"
              @click="isProductionHistoryCollapsed = false"
            >
              +
            </button>
          </div>
        </div>
        <div
          v-if="data?.recentProductions.length && !isProductionHistoryCollapsed"
          class="table-wrap"
        >
          <table class="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Produit</th>
                <th>Format</th>
                <th>Quantité</th>
                <th>Notes</th>
                <th />
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
                <td>
                  <button
                    type="button"
                    class="btn btn--ghost btn--sm"
                    @click="startEditProduction(prod)"
                  >
                    Modifier
                  </button>
                  <button
                    type="button"
                    class="btn btn--ghost btn--sm"
                    :disabled="deletingProductionId === prod.id"
                    @click="cancelProductionRecord(prod)"
                  >
                    {{ deletingProductionId === prod.id ? "Annulation…" : "Annuler" }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div
          v-else-if="data?.recentProductions.length && isProductionHistoryCollapsed"
          class="table-wrap"
        >
          <table class="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Produit</th>
                <th>Format</th>
                <th>Quantité</th>
                <th>Notes</th>
                <th />
              </tr>
            </thead>
            <tbody>
              <tr v-if="firstProduction">
                <td>{{ new Date(firstProduction.producedAt).toLocaleDateString("fr-FR") }}</td>
                <td>{{ firstProduction.productName }}</td>
                <td>
                  <span
                    class="volume-badge"
                    :class="volumeClass(firstProduction.volume)"
                  >
                    {{ firstProduction.volume }}
                  </span>
                </td>
                <td>+{{ firstProduction.quantity }}</td>
                <td>{{ firstProduction.notes || "—" }}</td>
                <td>
                  <button
                    type="button"
                    class="btn btn--ghost btn--sm"
                    @click="startEditProduction(firstProduction)"
                  >
                    Modifier
                  </button>
                  <button
                    type="button"
                    class="btn btn--ghost btn--sm"
                    :disabled="deletingProductionId === firstProduction.id"
                    @click="cancelProductionRecord(firstProduction)"
                  >
                    {{ deletingProductionId === firstProduction.id ? "Annulation…" : "Annuler" }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <EmptyState
          v-else
          message="Aucune production enregistrée."
        />
        </section>
      </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.page--read-only :deep(button),
.page--read-only :deep(input),
.page--read-only :deep(select),
.page--read-only :deep(textarea) {
  opacity: 0.55;
  pointer-events: none;
  cursor: not-allowed;
}
</style>
