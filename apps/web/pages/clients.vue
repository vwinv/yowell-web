<script setup lang="ts">
import type { ClientsOverview } from "@yowell/shared";
import { formatCfa } from "@yowell/shared";

const { data, pending, refresh } = await useApiFetch<ClientsOverview>(
  useApiUrl("/clients/overview"),
  { key: "clients-overview" },
);

const showClientForm = ref(false);
const ClientFormLazy = defineAsyncComponent(
  () => import("~/components/ClientForm.vue"),
);

async function removeClient(id: string, name: string) {
  if (!confirm(`Supprimer le client « ${name} » ?`)) return;
  await apiFetch(useApiUrl(`/clients/${id}`), { method: "DELETE" });
  await refresh();
}
</script>

<template>
  <div>
    <PageHeader
      title="Clients"
      description="Fichier clients — nom, coordonnées et notes pour les commandes."
    />

    <p v-if="pending" class="loading">Chargement des clients</p>

    <template v-else>
      <div class="stats-grid">
        <StatCard
          label="Clients enregistrés"
          :value="data?.totalClients ?? 0"
          icon="👥"
          tone="blue"
        />
        <StatCard
          label="Commandes totales"
          :value="data?.totalOrders ?? 0"
          icon="🛒"
          tone="green"
        />
      </div>

      <div class="stock-actions">
        <button
          type="button"
          class="btn btn--primary"
          @click="showClientForm = !showClientForm"
        >
          {{ showClientForm ? "Masquer le formulaire" : "+ Nouveau client" }}
        </button>
        <NuxtLink to="/ventes" class="btn btn--secondary">
          Enregistrer une vente →
        </NuxtLink>
      </div>

      <section v-if="showClientForm" class="panel collapsible-panel">
        <h2 class="panel__title">Nouveau client</h2>
        <ClientFormLazy @success="refresh(); showClientForm = false" />
      </section>

      <section class="panel">
        <h2 class="panel__title">Liste des clients</h2>
        <div v-if="data?.clients.length" class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Commandes</th>
                <th>Total achats</th>
                <th>Téléphone</th>
                <th>E-mail</th>
                <th>Adresse</th>
                <th>Notes</th>
                <th />
              </tr>
            </thead>
            <tbody>
              <tr v-for="c in data.clients" :key="c.id">
                <td>{{ c.name }}</td>
                <td>
                  <strong>{{ c.orderCount }}</strong>
                  commande{{ c.orderCount > 1 ? "s" : "" }}
                </td>
                <td>{{ c.orderCount ? formatCfa(c.totalSpent) : "—" }}</td>
                <td>{{ c.phone || "—" }}</td>
                <td>{{ c.email || "—" }}</td>
                <td>{{ c.address || "—" }}</td>
                <td>{{ c.notes || "—" }}</td>
                <td>
                  <button
                    type="button"
                    class="btn btn--ghost"
                    @click="removeClient(c.id, c.name)"
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
          message="Aucun client — ajoute ton premier client avec le bouton ci-dessus."
        />
      </section>
    </template>
  </div>
</template>
