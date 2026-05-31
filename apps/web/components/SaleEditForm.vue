<script setup lang="ts">
import type { JuiceProduct, JuiceVolume, Sale } from "@yowell/shared";
import {
  SALE_PERSONALIZATION_FEE,
  computeSaleTotalAmount,
  formatCfa,
  PAYMENT_CHANNEL_OPTIONS,
  saleBottleCount,
} from "@yowell/shared";

const props = defineProps<{
  sale: Sale;
  clients: { id: string; name: string }[];
  products: JuiceProduct[];
}>();

const emit = defineEmits<{
  success: [];
  cancel: [];
}>();

type OrderLine = {
  productId: string;
  volume: JuiceVolume;
  quantity: number;
};

const clientId = ref(props.sale.clientId);
const orderedAt = ref(props.sale.orderedAt.slice(0, 10));
const notes = ref(props.sale.notes);
const paymentStatus = ref(props.sale.paymentStatus);
const paymentChannel = ref<"cash" | "om" | "wave">(
  props.sale.paymentChannel ?? "cash",
);
const personalization = ref(props.sale.personalization);
const discountAmount = ref<number | "">(props.sale.discountAmount || "");
const lines = ref<OrderLine[]>(
  props.sale.items.map((item) => ({
    productId: item.productId,
    volume: item.volume,
    quantity: item.quantity,
  })),
);

const submitting = ref(false);
const error = ref("");
const success = ref("");

const isQuote = computed(() => props.sale.kind === "quote");

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

/** Stock dispo en édition = stock actuel + qté déjà réservée sur cette vente */
function maxQuantityForLine(line: OrderLine): number {
  const original = props.sale.items.find(
    (item) => item.productId === line.productId && item.volume === line.volume,
  );
  return lineStock(line) + (original?.quantity ?? 0);
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

async function submit() {
  error.value = "";
  success.value = "";

  if (!clientId.value) {
    error.value = "Sélectionne un client.";
    return;
  }

  const validLines = lines.value.filter((l) => l.productId && l.quantity > 0);
  if (!validLines.length) {
    error.value = "Ajoute au moins un article à la commande.";
    return;
  }

  if (!isQuote.value) {
    for (const line of validLines) {
      if (line.quantity > maxQuantityForLine(line)) {
        const p = productById(line.productId);
        error.value = `Stock insuffisant pour ${p?.name} (${line.volume}) : ${maxQuantityForLine(line)} disponible(s).`;
        return;
      }
    }
  }

  if (discountAmount.value !== "" && Number(discountAmount.value) < 0) {
    error.value = "La remise doit être positive ou nulle.";
    return;
  }

  submitting.value = true;
  try {
    await apiFetch(useApiUrl(`/sales/${props.sale.id}`), {
      method: "PATCH",
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
        paymentStatus: paymentStatus.value,
        ...(paymentStatus.value === "paid"
          ? { paymentChannel: paymentChannel.value }
          : {}),
      },
    });
    success.value = isQuote.value ? "Devis modifié." : "Vente modifiée.";
    emit("success");
  } catch {
    error.value =
      "Impossible de modifier la vente. Vérifie le client, le stock et les montants.";
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <form @submit.prevent="submit">
    <div class="form-grid">
      <div class="form-field form-field--wide">
        <label for="edit-sale-client">Client *</label>
        <select id="edit-sale-client" v-model="clientId">
          <option v-for="c in clients" :key="c.id" :value="c.id">
            {{ c.name }}
          </option>
        </select>
      </div>
      <div class="form-field">
        <label for="edit-sale-date">Date de commande *</label>
        <input id="edit-sale-date" v-model="orderedAt" type="date" required />
      </div>
      <div v-if="!isQuote" class="form-field">
        <label for="edit-sale-payment">Paiement</label>
        <select id="edit-sale-payment" v-model="paymentStatus">
          <option value="unpaid">Non payé</option>
          <option value="paid">Payé</option>
        </select>
      </div>
      <div v-if="!isQuote && paymentStatus === 'paid'" class="form-field">
        <label for="edit-sale-channel">Moyen de paiement</label>
        <select id="edit-sale-channel" v-model="paymentChannel">
          <option
            v-for="option in PAYMENT_CHANNEL_OPTIONS"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </option>
        </select>
      </div>
    </div>

    <fieldset class="order-lines">
      <legend class="order-lines__legend">Commande *</legend>

      <div v-for="(line, index) in lines" :key="index" class="order-line">
        <div class="form-grid order-line__grid">
          <div class="form-field">
            <label>Produit</label>
            <select v-model="line.productId" @change="syncLineVolume(line)">
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
                {{
                  isQuote
                    ? `${f.volume} — ${formatCfa(f.price)}`
                    : `${f.volume} — ${formatCfa(f.price)} (stock: ${f.quantity})`
                }}
              </option>
            </select>
          </div>
          <div class="form-field">
            <label>Quantité</label>
            <input
              v-model.number="line.quantity"
              type="number"
              min="1"
              :max="isQuote ? undefined : maxQuantityForLine(line)"
            />
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
        <label for="edit-sale-discount">Remise (FCFA)</label>
        <input
          id="edit-sale-discount"
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
      <label for="edit-sale-notes">Notes</label>
      <input
        id="edit-sale-notes"
        v-model="notes"
        type="text"
        placeholder="Remise, supplément, livraison…"
      />
    </div>

    <div class="form-actions">
      <button type="submit" class="btn btn--primary" :disabled="submitting">
        {{ submitting ? "Mise à jour…" : "Enregistrer les modifications" }}
      </button>
      <button type="button" class="btn btn--ghost" :disabled="submitting" @click="emit('cancel')">
        Annuler
      </button>
    </div>

    <p v-if="error" class="form-error">{{ error }}</p>
    <p v-if="success" class="form-success">{{ success }}</p>
  </form>
</template>
