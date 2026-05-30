<script setup lang="ts">
import type { JuiceProduct, JuiceVolume } from "@yowell/shared";
import {
  SALE_PERSONALIZATION_FEE,
  computeSaleTotalAmount,
  formatCfa,
  saleBottleCount,
} from "@yowell/shared";

const emit = defineEmits<{
  success: [];
}>();

type OrderLine = {
  productId: string;
  volume: JuiceVolume;
  quantity: number;
};

const props = defineProps<{
  clients: { id: string; name: string }[];
  products: JuiceProduct[];
}>();

const clientId = ref("");
const orderedAt = ref(new Date().toISOString().slice(0, 10));
const notes = ref("");
const personalization = ref(false);
const discountAmount = ref<number | "">("");
const lines = ref<OrderLine[]>([
  { productId: "", volume: "1L", quantity: 1 },
]);

const submitting = ref(false);
const error = ref("");
const success = ref("");

watch(
  () => props.clients,
  (list) => {
    const first = list[0];
    if (first && !clientId.value) {
      clientId.value = first.id;
    }
  },
  { immediate: true },
);

watch(
  () => props.products,
  (list) => {
    const first = list[0];
    if (first && lines.value[0] && !lines.value[0].productId) {
      lines.value[0].productId = first.id;
      syncLineVolume(lines.value[0]);
    }
  },
  { immediate: true },
);

function productById(id: string) {
  return props.products.find((p) => p.id === id);
}

function enabledFormats(productId: string) {
  return productById(productId)?.formats.filter((f) => f.enabled) ?? [];
}

function syncLineVolume(line: OrderLine) {
  const formats = enabledFormats(line.productId);
  const first = formats[0];
  if (first) line.volume = first.volume;
}

function lineUnitPrice(line: OrderLine): number {
  const format = productById(line.productId)?.formats.find(
    (f) => f.volume === line.volume,
  );
  return format?.price ?? 0;
}

function lineStock(line: OrderLine): number {
  const format = productById(line.productId)?.formats.find(
    (f) => f.volume === line.volume,
  );
  return format?.quantity ?? 0;
}

function lineTotal(line: OrderLine): number {
  return lineUnitPrice(line) * line.quantity;
}

const linesSubtotal = computed(() =>
  lines.value.reduce((sum, line) => sum + lineTotal(line), 0),
);

const validLinesForTotal = computed(() =>
  lines.value.filter((l) => l.productId && l.quantity > 0),
);

const personalizationFee = computed(() =>
  personalization.value
    ? SALE_PERSONALIZATION_FEE * saleBottleCount(validLinesForTotal.value)
    : 0,
);

const finalTotal = computed(() => {
  const items = validLinesForTotal.value.map((line) => ({
    lineTotal: lineTotal(line),
    quantity: line.quantity,
  }));
  return computeSaleTotalAmount(
    items,
    personalization.value,
    discountAmount.value === "" ? 0 : Number(discountAmount.value),
  );
});

function addLine() {
  const first = props.products[0];
  lines.value.push({
    productId: first?.id ?? "",
    volume: "1L",
    quantity: 1,
  });
  const last = lines.value[lines.value.length - 1];
  if (last) syncLineVolume(last);
}

function removeLine(index: number) {
  if (lines.value.length <= 1) return;
  lines.value.splice(index, 1);
}

function resetForm() {
  clientId.value = props.clients[0]?.id ?? "";
  orderedAt.value = new Date().toISOString().slice(0, 10);
  notes.value = "";
  personalization.value = false;
  discountAmount.value = "";
  lines.value = [{ productId: props.products[0]?.id ?? "", volume: "1L", quantity: 1 }];
}

async function submit() {
  error.value = "";
  success.value = "";

  if (!clientId.value) {
    error.value = "Sélectionne un client.";
    return;
  }
  if (!props.products.length) {
    error.value = "Aucun produit en stock — crée d'abord un produit.";
    return;
  }

  const validLines = lines.value.filter(
    (l) => l.productId && l.quantity > 0,
  );
  if (!validLines.length) {
    error.value = "Ajoute au moins un article à la commande.";
    return;
  }

  for (const line of validLines) {
    if (line.quantity > lineStock(line)) {
      const p = productById(line.productId);
      error.value = `Stock insuffisant pour ${p?.name} (${line.volume}) : ${lineStock(line)} disponible(s).`;
      return;
    }
  }

  submitting.value = true;
  try {
    await apiFetch(useApiUrl("/sales"), {
      method: "POST",
      body: {
        clientId: clientId.value,
        orderedAt: orderedAt.value,
        items: validLines.map((l) => ({
          productId: l.productId,
          volume: l.volume,
          quantity: l.quantity,
        })),
        personalization: personalization.value,
        discountAmount: discountAmount.value === "" ? 0 : Number(discountAmount.value),
        notes: notes.value.trim(),
      },
    });
    success.value = "Vente enregistrée — stock mis à jour.";
    resetForm();
    emit("success");
  } catch {
    error.value =
      "Impossible d'enregistrer la vente. Vérifie le client, le stock et les quantités.";
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <form @submit.prevent="submit">
    <div class="form-grid">
      <div class="form-field form-field--wide">
        <label for="sale-client">Client *</label>
        <select id="sale-client" v-model="clientId" :disabled="!clients.length">
          <option v-if="!clients.length" value="">
            Aucun client — ajoute-en un d'abord
          </option>
          <option v-for="c in clients" :key="c.id" :value="c.id">
            {{ c.name }}
          </option>
        </select>
      </div>
      <div class="form-field">
        <label for="sale-date">Date de commande *</label>
        <input id="sale-date" v-model="orderedAt" type="date" required />
      </div>
    </div>

    <fieldset class="order-lines">
      <legend class="order-lines__legend">Commande *</legend>

      <div v-for="(line, index) in lines" :key="index" class="order-line">
        <div class="form-grid order-line__grid">
          <div class="form-field">
            <label>Produit</label>
            <select
              v-model="line.productId"
              @change="syncLineVolume(line)"
            >
              <option v-for="p in products" :key="p.id" :value="p.id">
                {{ p.name }}
              </option>
            </select>
          </div>
          <div class="form-field">
            <label>Format</label>
            <select v-model="line.volume">
              <option
                v-for="f in enabledFormats(line.productId)"
                :key="f.volume"
                :value="f.volume"
              >
                {{ f.volume }} — {{ formatCfa(f.price) }} (stock: {{ f.quantity }})
              </option>
            </select>
          </div>
          <div class="form-field">
            <label>Quantité</label>
            <input v-model.number="line.quantity" type="number" min="1" />
          </div>
          <div class="form-field">
            <label>Sous-total</label>
            <p class="order-line__subtotal">{{ formatCfa(lineTotal(line)) }}</p>
          </div>
        </div>
        <button
          v-if="lines.length > 1"
          type="button"
          class="btn btn--ghost order-line__remove"
          @click="removeLine(index)"
        >
          Retirer la ligne
        </button>
      </div>

      <button type="button" class="btn btn--ghost" @click="addLine">
        + Ajouter un article
      </button>
    </fieldset>

    <p class="order-total">
      Sous-total : <strong>{{ formatCfa(linesSubtotal) }}</strong>
    </p>

    <div class="form-grid" style="margin-top: 1rem">
      <div class="form-field">
        <label class="format-row__check">
          <input v-model="personalization" type="checkbox" />
          <span>Personnalisation (+{{ formatCfa(SALE_PERSONALIZATION_FEE) }} / bouteille)</span>
        </label>
      </div>
      <div class="form-field">
        <label for="sale-discount">Remise (FCFA)</label>
        <input
          id="sale-discount"
          v-model.number="discountAmount"
          type="number"
          min="0"
          step="1"
          placeholder="0"
        />
      </div>
    </div>

    <div class="order-total-breakdown">
      <p v-if="personalization">
        Personnalisation : <strong>{{ formatCfa(personalizationFee) }}</strong>
      </p>
      <p v-if="discountAmount !== '' && Number(discountAmount) > 0">
        Remise : <strong>-{{ formatCfa(Number(discountAmount)) }}</strong>
      </p>
      <p class="order-total">
        Total commande : <strong>{{ formatCfa(finalTotal) }}</strong>
      </p>
    </div>

    <div class="form-field form-field--wide">
      <label for="sale-notes">Notes</label>
      <input
        id="sale-notes"
        v-model="notes"
        type="text"
        placeholder="Livraison, paiement, remarques…"
      />
    </div>

    <div class="form-actions">
      <button
        type="submit"
        class="btn btn--primary"
        :disabled="submitting || !clients.length || !products.length"
      >
        {{ submitting ? "Enregistrement…" : "Enregistrer la vente" }}
      </button>
    </div>

    <p v-if="error" class="form-error">{{ error }}</p>
    <p v-if="success" class="form-success">{{ success }}</p>
  </form>
</template>
