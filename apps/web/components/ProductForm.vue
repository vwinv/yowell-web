<script setup lang="ts">
const emit = defineEmits<{
  success: [];
}>();

const name = ref("");
const description = ref("");

const format1LEnabled = ref(true);
const price1L = ref<number | "">("");
const minQuantity1L = ref(0);

const format250Enabled = ref(false);
const price250 = ref<number | "">("");
const minQuantity250 = ref(0);

const photoFiles = ref<File[]>([]);
const photoPreviews = ref<string[]>([]);

const submitting = ref(false);
const error = ref("");
const success = ref("");

const photoInput = ref<HTMLInputElement | null>(null);

function onPhotosChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const files = Array.from(input.files ?? []);
  photoFiles.value = files;

  for (const url of photoPreviews.value) {
    URL.revokeObjectURL(url);
  }
  photoPreviews.value = files.map((f) => URL.createObjectURL(f));
}

function removePhoto(index: number) {
  const files = [...photoFiles.value];
  files.splice(index, 1);
  photoFiles.value = files;

  const preview = photoPreviews.value[index];
  if (preview) URL.revokeObjectURL(preview);
  photoPreviews.value.splice(index, 1);

  if (photoInput.value) {
    const dt = new DataTransfer();
    for (const f of files) dt.items.add(f);
    photoInput.value.files = dt.files;
  }
}

function resetForm() {
  name.value = "";
  description.value = "";
  format1LEnabled.value = true;
  price1L.value = "";
  minQuantity1L.value = 0;
  format250Enabled.value = false;
  price250.value = "";
  minQuantity250.value = 0;
  photoFiles.value = [];
  for (const url of photoPreviews.value) {
    URL.revokeObjectURL(url);
  }
  photoPreviews.value = [];
  if (photoInput.value) photoInput.value.value = "";
}

function validateFormats(): string | null {
  if (!format1LEnabled.value && !format250Enabled.value) {
    return "Active au moins un format (1 L ou 250 ml).";
  }
  if (format1LEnabled.value && (price1L.value === "" || Number(price1L.value) < 0)) {
    return "Indique le prix du format 1 L.";
  }
  if (format250Enabled.value && (price250.value === "" || Number(price250.value) < 0)) {
    return "Indique le prix du format 250 ml.";
  }
  return null;
}

async function submit() {
  error.value = "";
  success.value = "";

  if (!name.value.trim()) {
    error.value = "Le nom du produit est obligatoire.";
    return;
  }

  const formatError = validateFormats();
  if (formatError) {
    error.value = formatError;
    return;
  }

  const formData = new FormData();
  formData.append("name", name.value.trim());
  formData.append("description", description.value.trim());
  formData.append("format1LEnabled", String(format1LEnabled.value));
  formData.append("price1L", String(format1LEnabled.value ? price1L.value : 0));
  formData.append("minQuantity1L", String(minQuantity1L.value));
  formData.append("format250Enabled", String(format250Enabled.value));
  formData.append("price250", String(format250Enabled.value ? price250.value : 0));
  formData.append("minQuantity250", String(minQuantity250.value));
  for (const file of photoFiles.value) {
    formData.append("photos", file);
  }

  submitting.value = true;
  try {
    await apiFetch(useApiUrl("/stock/products"), {
      method: "POST",
      body: formData,
    });
    success.value = "Produit enregistré avec succès.";
    resetForm();
    emit("success");
  } catch {
    error.value = "Impossible d'enregistrer le produit. Vérifie les formats, prix et photos.";
  } finally {
    submitting.value = false;
  }
}

onUnmounted(() => {
  for (const url of photoPreviews.value) {
    URL.revokeObjectURL(url);
  }
});
</script>

<template>
  <form class="product-form" @submit.prevent="submit">
    <div class="product-form__layout">
      <div class="product-form__main">
        <div class="form-field">
          <label for="product-name">Nom du jus *</label>
          <input
            id="product-name"
            v-model="name"
            type="text"
            placeholder="Ex. Orange pressée, Mangue passion…"
            required
          />
        </div>

        <div class="form-field">
          <label for="product-description">Description</label>
          <textarea
            id="product-description"
            v-model="description"
            rows="4"
            placeholder="Ingrédients, goût, conservation…"
          />
        </div>

        <fieldset class="format-fieldset">
          <legend class="format-fieldset__legend">Formats & prix *</legend>
          <p class="format-fieldset__hint">
            Un même jus peut être vendu en 1 L et en 250 ml — coche les formats proposés et indique le prix de chacun en FCFA.
          </p>

          <div class="format-row">
            <label class="format-row__check">
              <input v-model="format1LEnabled" type="checkbox" />
              <span>Bouteille 1 L</span>
            </label>
            <div class="format-row__fields">
              <div class="form-field">
                <label for="price-1l">Prix (FCFA)</label>
                <input
                  id="price-1l"
                  v-model.number="price1L"
                  type="number"
                  min="0"
                  step="1"
                  :disabled="!format1LEnabled"
                  placeholder="1500"
                />
              </div>
              <div class="form-field">
                <label for="min-1l">Seuil alerte</label>
                <input
                  id="min-1l"
                  v-model.number="minQuantity1L"
                  type="number"
                  min="0"
                  :disabled="!format1LEnabled"
                />
              </div>
            </div>
          </div>

          <div class="format-row">
            <label class="format-row__check">
              <input v-model="format250Enabled" type="checkbox" />
              <span>Bouteille 250 ml</span>
            </label>
            <div class="format-row__fields">
              <div class="form-field">
                <label for="price-250">Prix (FCFA)</label>
                <input
                  id="price-250"
                  v-model.number="price250"
                  type="number"
                  min="0"
                  step="1"
                  :disabled="!format250Enabled"
                  placeholder="500"
                />
              </div>
              <div class="form-field">
                <label for="min-250">Seuil alerte</label>
                <input
                  id="min-250"
                  v-model.number="minQuantity250"
                  type="number"
                  min="0"
                  :disabled="!format250Enabled"
                />
              </div>
            </div>
          </div>
        </fieldset>
      </div>

      <div class="product-form__photos">
        <label class="form-field">
          <span class="form-field__label">Photos du produit</span>
          <span class="form-field__hint">Jusqu'à 6 images (max 5 Mo)</span>
          <input
            ref="photoInput"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            class="product-form__file"
            @change="onPhotosChange"
          />
        </label>

        <div v-if="photoPreviews.length" class="photo-preview-grid">
          <figure
            v-for="(src, index) in photoPreviews"
            :key="src"
            class="photo-preview"
          >
            <img :src="src" :alt="`Aperçu ${index + 1}`" />
            <button
              type="button"
              class="photo-preview__remove"
              aria-label="Retirer la photo"
              @click="removePhoto(index)"
            >
              ×
            </button>
          </figure>
        </div>
        <p v-else class="photo-preview-empty">Aucune photo</p>
      </div>
    </div>

    <div class="form-actions">
      <button type="submit" class="btn btn--primary" :disabled="submitting">
        {{ submitting ? "Enregistrement…" : "Enregistrer le produit" }}
      </button>
      <button type="button" class="btn btn--ghost" :disabled="submitting" @click="resetForm">
        Réinitialiser
      </button>
    </div>

    <p v-if="error" class="form-error">{{ error }}</p>
    <p v-if="success" class="form-success">{{ success }}</p>
  </form>
</template>
