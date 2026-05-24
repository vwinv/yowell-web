import { Injectable, NotFoundException, OnModuleInit } from "@nestjs/common";
import type {
  Client,
  ClientSummary,
  ClientsOverview,
  CreateClientInput,
} from "@yowell/shared";
import { randomUUID } from "node:crypto";

import { SalesStore } from "../sales/sales.store";
import { ClientsStore } from "./clients.store";

@Injectable()
export class ClientsService implements OnModuleInit {
  private readonly store = new ClientsStore();
  private readonly salesStore = new SalesStore();

  onModuleInit() {
    this.store.load();
    this.salesStore.load();
  }

  private buildClientSummaries(clients: Client[]): ClientSummary[] {
    const orderCountByClient = new Map<string, number>();
    const totalSpentByClient = new Map<string, number>();

    for (const sale of this.salesStore.getData().sales) {
      orderCountByClient.set(
        sale.clientId,
        (orderCountByClient.get(sale.clientId) ?? 0) + 1,
      );
      if (sale.paymentStatus !== "paid") continue;
      totalSpentByClient.set(
        sale.clientId,
        (totalSpentByClient.get(sale.clientId) ?? 0) + sale.totalAmount,
      );
    }

    return clients.map((client) => ({
      ...client,
      orderCount: orderCountByClient.get(client.id) ?? 0,
      totalSpent: totalSpentByClient.get(client.id) ?? 0,
    }));
  }

  getOverview(): ClientsOverview {
    this.salesStore.load();
    const { clients } = this.store.getData();
    const sorted = [...clients].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    const summaries = this.buildClientSummaries(sorted);
    const totalOrders = this.salesStore.getData().sales.length;

    return {
      clients: summaries,
      totalClients: clients.length,
      totalOrders,
    };
  }

  list(): ClientSummary[] {
    return this.getOverview().clients;
  }

  findById(id: string): Client {
    const client = this.store.getData().clients.find((c) => c.id === id);
    if (!client) {
      throw new NotFoundException("Client introuvable");
    }
    return client;
  }

  create(input: CreateClientInput): Client {
    const data = this.store.getData();
    const client: Client = {
      id: randomUUID(),
      name: input.name.trim(),
      phone: input.phone?.trim() ?? "",
      email: input.email?.trim() ?? "",
      address: input.address?.trim() ?? "",
      notes: input.notes?.trim() ?? "",
      createdAt: new Date().toISOString(),
    };
    data.clients.push(client);
    this.store.setData(data);
    return client;
  }

  delete(id: string): void {
    const data = this.store.getData();
    const index = data.clients.findIndex((c) => c.id === id);
    if (index === -1) {
      throw new NotFoundException("Client introuvable");
    }
    data.clients.splice(index, 1);
    this.store.setData(data);
  }
}
