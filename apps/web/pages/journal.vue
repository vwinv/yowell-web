<script setup lang="ts">
import type { ActivityOverview } from "@yowell/shared";

const { data, pending, refresh } = await useApiFetch<ActivityOverview>(
  useApiUrl("/activity/overview"),
  { key: "activity-overview" },
);

const { isAdmin } = useAuth();

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
</script>

<template>
  <div>
    <PageHeader
      title="Journal d'activité"
      :description="
        isAdmin
          ? 'Historique de toutes les interactions avec l\'administration.'
          : 'Historique de vos actions sur l\'administration.'
      "
    />

    <p v-if="pending" class="loading">Chargement du journal</p>

    <template v-else>
      <div class="stats-grid">
        <StatCard
          label="Événements"
          :value="data?.total ?? 0"
          icon="📋"
          tone="blue"
        />
      </div>

      <section class="panel">
        <div class="panel__header-row">
          <h2 class="panel__title">Historique</h2>
          <button type="button" class="btn btn--ghost btn--sm" @click="refresh()">
            Actualiser
          </button>
        </div>

        <div v-if="data?.entries.length" class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>Date</th>
                <th v-if="isAdmin">Utilisateur</th>
                <th>Action</th>
                <th>Détail</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="entry in data.entries" :key="entry.id">
                <td>{{ formatWhen(entry.createdAt) }}</td>
                <td v-if="isAdmin">
                  <strong>{{ entry.userName }}</strong>
                  <span class="table-sub">{{ entry.userEmail }}</span>
                </td>
                <td>
                  <span class="badge badge--source">{{ entry.method }}</span>
                  <span class="table-sub">{{ entry.action }}</span>
                </td>
                <td>{{ entry.summary }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <EmptyState v-else message="Aucune activité enregistrée pour le moment." />
      </section>
    </template>
  </div>
</template>
