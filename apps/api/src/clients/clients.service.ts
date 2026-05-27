import { Injectable, NotFoundException } from "@nestjs/common";
import { SalePaymentStatus as PrismaSalePaymentStatus } from "@prisma/client";
import type {
  Client,
  ClientSummary,
  ClientsOverview,
  CreateClientInput,
} from "@yowell/shared";

import { mapClient } from "../prisma/prisma.mappers";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  private buildClientSummaries(
    clients: Client[],
    sales: {
      clientId: string;
      totalAmount: number;
      paymentStatus: PrismaSalePaymentStatus;
    }[],
  ): ClientSummary[] {
    const orderCountByClient = new Map<string, number>();
    const totalSpentByClient = new Map<string, number>();

    for (const sale of sales) {
      orderCountByClient.set(
        sale.clientId,
        (orderCountByClient.get(sale.clientId) ?? 0) + 1,
      );
      if (sale.paymentStatus !== PrismaSalePaymentStatus.PAID) continue;
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

  async getOverview(): Promise<ClientsOverview> {
    const [clientRows, sales] = await Promise.all([
      this.prisma.client.findMany({
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.sale.findMany({
        select: {
          clientId: true,
          totalAmount: true,
          paymentStatus: true,
        },
      }),
    ]);

    const clients = clientRows.map(mapClient);
    const summaries = this.buildClientSummaries(clients, sales);
    const totalOrders = sales.length;

    return {
      clients: summaries,
      totalClients: clients.length,
      totalOrders,
    };
  }

  async list(): Promise<ClientSummary[]> {
    return (await this.getOverview()).clients;
  }

  async findById(id: string): Promise<Client> {
    const client = await this.prisma.client.findUnique({
      where: { id },
    });
    if (!client) {
      throw new NotFoundException("Client introuvable");
    }
    return mapClient(client);
  }

  async create(input: CreateClientInput): Promise<Client> {
    const client = await this.prisma.client.create({
      data: {
        name: input.name.trim(),
        phone: input.phone?.trim() ?? "",
        email: input.email?.trim() ?? "",
        address: input.address?.trim() ?? "",
        notes: input.notes?.trim() ?? "",
      },
    });

    return mapClient(client);
  }

  async delete(id: string): Promise<void> {
    const existing = await this.prisma.client.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException("Client introuvable");
    }
    await this.prisma.client.delete({
      where: { id },
    });
  }
}
