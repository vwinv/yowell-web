<script setup lang="ts">
import type { ClientSummary, ClientsOverview } from "@yowell/shared";
import { formatCfa } from "@yowell/shared";

const { canWrite, readOnly } = useModulePermission("vente_clients");

const { data, pending, refresh } = await useApiFetch<ClientsOverview>(
  useApiUrl("/clients/overview"),
  { key: "clients-overview" },
);

const showClientForm = ref(false);
const editingClient = ref<ClientSummary | null>(null);
const ClientFormLazy = defineAsyncComponent(
  () => import("~/components/ClientForm.vue"),
);

function startEditClient(client: ClientSummary) {
  if (!canWrite.value) return;
  showClientForm.value = false;
  editingClient.value = client;
}

function cancelEditClient() {
  editingClient.value = null;
}

async function onClientEditSuccess() {
  await Promise.all([
    refresh(),
    refreshNuxtData("clients-overview"),
  ]);
  editingClient.value = null;
}

async function removeClient(id: string, name: string) {
  if (!canWrite.value) return;
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
      <ReadOnlyBanner :show="readOnly" />

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
          :disabled="readOnly"
          @click="showClientForm = true; editingClient = null"
        >
          + Nouveau client
        </button>
        <NuxtLink to="/ventes" class="btn btn--secondary">
          Enregistrer une vente →
        </NuxtLink>
      </div>

      <AppModal
        :open="showClientForm"
        title="Nouveau client"
        @close="showClientForm = false"
      >
        <ClientFormLazy
          :readonly="readOnly"
          @success="refresh(); showClientForm = false"
        />
      </AppModal>

      <AppModal
        :open="!!editingClient"
        :title="editingClient ? `Modifier — ${editingClient.name}` : 'Modifier le client'"
        @close="cancelEditClient"
      >
        <ClientFormLazy
          v-if="editingClient"
          :client="editingClient"
          :readonly="readOnly"
          @success="onClientEditSuccess"
          @cancel="cancelEditClient"
        />
      </AppModal>

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
                <td class="table-actions">
                  <button
                    type="button"
                    class="btn btn--ghost btn--sm"
                    :disabled="readOnly"
                    @click="startEditClient(c)"
                  >
                    Modifier
                  </button>
                  <button
                    type="button"
                    class="btn btn--ghost btn--sm"
                    :disabled="readOnly"
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
