<script setup lang="ts">
import type { StatsOverview } from "@yowell/shared";
import { formatCfa } from "@yowell/shared";

const { preset, customFrom, customTo, query, presets, initCustomDates } =
  useStatsPeriod();

const statsUrl = computed(() => {
  const q = query.value;
  const params = new URLSearchParams({ preset: q.preset });
  if (q.preset === "custom" && q.from && q.to) {
    params.set("from", q.from);
    params.set("to", q.to);
  }
  return `${useApiUrl("/stats/overview")}?${params.toString()}`;
});

const {
  data,
  pending,
  error,
  refresh,
} = useApiAsyncData<StatsOverview>(
  "stats-overview",
  () => statsUrl.value,
  [preset, customFrom, customTo],
);

const { exporting, downloadReport } = useStatsReport();

const periodLabel = computed(
  () => data.value?.period?.label ?? "Période sélectionnée",
);

function formatAmount(amount: number) {
  if (amount < 0) {
    return `−${formatCfa(Math.abs(amount))}`;
  }
  return formatCfa(amount);
}

function barHeight(value: number, max: number): string {
  if (max <= 0 || value <= 0) return "4px";
  return `${Math.max(8, Math.round((value / max) * 100))}%`;
}

const chartMax = computed(() => {
  const days = data.value?.recentDays ?? [];
  return Math.max(
    1,
    ...days.flatMap((d) => [d.revenue, d.expenses, Math.abs(d.profit)]),
  );
});

const chartColumns = computed(() => {
  const count = data.value?.recentDays.length ?? 7;
  if (count <= 7) return 7;
  if (count <= 14) return count;
  return Math.min(count, 31);
});

const hasStats = computed(() => Boolean(data.value?.period));

function selectPreset(id: (typeof presets)[number]["id"]) {
  if (id === "custom" && (!customFrom.value || !customTo.value)) {
    initCustomDates();
  }
  preset.value = id;
}

function applyCustomPeriod() {
  if (!customFrom.value || !customTo.value) return;
  refresh();
}

async function exportPdf() {
  if (!hasStats.value) return;
  await downloadReport({
    preset: preset.value,
    from: preset.value === "custom" ? customFrom.value : undefined,
    to: preset.value === "custom" ? customTo.value : undefined,
  });
}
</script>

<template>
  <div>
    <PageHeader
      title="Statistiques"
      description="Analyse sur la période de ton choix — exportable en PDF."
    />

    <section class="panel stats-period-panel">
      <div class="stats-period-panel__row">
        <div class="stats-period-presets">
          <button
            v-for="item in presets"
            :key="item.id"
            type="button"
            class="btn btn--sm"
            :class="
              preset === item.id ? 'btn--primary' : 'btn--secondary'
            "
            @click="selectPreset(item.id)"
          >
            {{ item.label }}
          </button>
        </div>
        <button
          type="button"
          class="btn btn--primary"
          :disabled="exporting || pending || !hasStats"
          @click="exportPdf"
        >
          {{ exporting ? "PDF…" : "Exporter PDF" }}
        </button>
      </div>

      <form
        v-if="preset === 'custom'"
        class="form-grid form-grid--inline stats-period-custom"
        @submit.prevent="applyCustomPeriod"
      >
        <div class="form-field">
          <label for="stats-from">Du</label>
          <input id="stats-from" v-model="customFrom" type="date" required />
        </div>
        <div class="form-field">
          <label for="stats-to">Au</label>
          <input id="stats-to" v-model="customTo" type="date" required />
        </div>
        <div class="form-actions">
          <button type="submit" class="btn btn--secondary">
            Appliquer
          </button>
        </div>
      </form>

      <p v-if="data?.period" class="stats-period-label">
        Période : <strong>{{ periodLabel }}</strong>
      </p>
    </section>

    <p v-if="pending || (!data && !error)" class="loading">
      Chargement des statistiques
    </p>

    <div v-else-if="error" class="panel panel--error">
      <p class="form-error">
        Impossible de charger les statistiques.
        <span v-if="error?.message" class="table-sub">{{ error.message }}</span>
      </p>
      <button type="button" class="btn btn--secondary" @click="refresh()">
        Réessayer
      </button>
    </div>

    <template v-else-if="hasStats && data">
      <div class="stats-grid">
        <StatCard
          label="Encaissé"
          :value="formatCfa(data.revenue)"
          icon="💰"
          tone="orange"
        />
        <StatCard
          label="Dépenses"
          :value="formatCfa(data.expenses)"
          icon="↓"
          tone="blue"
        />
        <StatCard
          label="Commandes"
          :value="data.ordersCount"
          icon="🛒"
          tone="gold"
        />
        <StatCard
          label="Bénéfice"
          :value="formatAmount(data.profit)"
          icon="✨"
          :tone="data.profit >= 0 ? 'green' : 'orange'"
        />
      </div>

      <div class="panels-row">
        <section class="panel">
          <h2 class="panel__title">Résumé — {{ periodLabel }}</h2>
          <ul class="stats-summary-list">
            <li>
              <span>Revenus (ventes payées + manuels)</span>
              <strong>{{ formatCfa(data.revenue) }}</strong>
            </li>
            <li>
              <span>Dépenses (courses + manuels)</span>
              <strong>{{ formatCfa(data.expenses) }}</strong>
            </li>
            <li class="stats-summary-list__highlight">
              <span>Bénéfice</span>
              <strong>{{ formatAmount(data.profit) }}</strong>
            </li>
            <li>
              <span>Commandes</span>
              <strong>{{ data.ordersCount }}</strong>
            </li>
          </ul>
        </section>

        <section class="panel">
          <h2 class="panel__title">Top produits</h2>
          <div v-if="data.topProducts.length" class="table-wrap">
            <table class="table table--compact">
              <thead>
                <tr>
                  <th>Produit</th>
                  <th>Qté vendue</th>
                  <th>CA</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="product in data.topProducts"
                  :key="product.productName"
                >
                  <td>{{ product.productName }}</td>
                  <td>{{ product.quantity }}</td>
                  <td>{{ formatCfa(product.revenue) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <EmptyState
            v-else
            message="Aucune vente payée sur cette période."
          />
        </section>
      </div>

      <section class="panel">
        <h2 class="panel__title">Évolution — {{ periodLabel }}</h2>
        <p class="chart-legend">
          <span class="chart-legend__item chart-legend__item--revenue">Revenus</span>
          <span class="chart-legend__item chart-legend__item--expense">Dépenses</span>
          <span class="chart-legend__item chart-legend__item--profit">Bénéfice</span>
        </p>
        <div
          v-if="data.recentDays.length"
          class="trend-chart"
          :style="{ gridTemplateColumns: `repeat(${chartColumns}, minmax(0, 1fr))` }"
        >
          <div
            v-for="day in data.recentDays"
            :key="day.date"
            class="trend-chart__day"
          >
            <div class="trend-chart__bars">
              <div
                class="trend-chart__bar trend-chart__bar--revenue"
                :style="{ height: barHeight(day.revenue, chartMax) }"
                :title="`Revenus : ${formatCfa(day.revenue)}`"
              />
              <div
                class="trend-chart__bar trend-chart__bar--expense"
                :style="{ height: barHeight(day.expenses, chartMax) }"
                :title="`Dépenses : ${formatCfa(day.expenses)}`"
              />
              <div
                class="trend-chart__bar trend-chart__bar--profit"
                :class="{ 'trend-chart__bar--negative': day.profit < 0 }"
                :style="{ height: barHeight(Math.abs(day.profit), chartMax) }"
                :title="`Bénéfice : ${formatAmount(day.profit)}`"
              />
            </div>
            <span class="trend-chart__label">{{ day.label }}</span>
            <span
              class="trend-chart__profit"
              :class="{ 'trend-chart__profit--negative': day.profit < 0 }"
            >
              {{ formatAmount(day.profit) }}
            </span>
          </div>
        </div>
        <EmptyState v-else message="Pas encore de données sur cette période." />
      </section>
    </template>

    <EmptyState
      v-else
      message="Choisis une période valide pour afficher les statistiques."
    />
  </div>
</template>
