import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { JuiceVolume as PrismaJuiceVolume, SalePaymentStatus as PrismaSalePaymentStatus } from "@prisma/client";
import {
  computeSaleTotalAmount,
  type CreateSaleInput,
  Sale,
  SaleLineItem,
  SalePaymentStatus,
  SalesOverview,
  UpdateSaleInput,
  UpdateSalePaymentInput,
  type PaymentChannel,
} from "@yowell/shared";

import { ClientsService } from "../clients/clients.service";
import {
  mapSale,
  toPrismaJuiceVolume,
  toPrismaPaymentChannel,
  toPrismaSaleKind,
  toPrismaSalePaymentStatus,
  toSharedJuiceVolume,
  toSharedPaymentChannel,
} from "../prisma/prisma.mappers";
import { PrismaService } from "../prisma/prisma.service";
import { buildSaleInvoicePdf } from "./sales-invoice.pdf";

@Injectable()
export class SalesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clientsService: ClientsService,
  ) {}

  private buildLineItems(
    input: CreateSaleInput,
    products: {
      id: string;
      name: string;
      formats: {
        id: string;
        volume: PrismaJuiceVolume;
        price: number;
        quantity: number;
        enabled: boolean;
      }[];
    }[],
    options: { skipStockCheck?: boolean } = {},
  ): SaleLineItem[] {
    const lines: SaleLineItem[] = [];

    for (const item of input.items) {
      const product = products.find((entry) => entry.id === item.productId);
      if (!product) {
        throw new BadRequestException(`Produit introuvable : ${item.productId}`);
      }

      const format = product.formats.find(
        (entry) =>
          entry.volume === toPrismaJuiceVolume(item.volume) && entry.enabled,
      );
      if (!format) {
        throw new BadRequestException(
          `Format ${item.volume} indisponible pour ${product.name}.`,
        );
      }

      if (!options.skipStockCheck && format.quantity < item.quantity) {
        throw new BadRequestException(
          `Stock insuffisant pour ${product.name} (${item.volume}) : ${format.quantity} disponible(s).`,
        );
      }

      const lineTotal = format.price * item.quantity;
      lines.push({
        productId: product.id,
        productName: product.name,
        volume: item.volume,
        quantity: item.quantity,
        unitPrice: format.price,
        lineTotal,
      });
    }

    return lines;
  }

  async listAll(): Promise<Sale[]> {
    const sales = await this.prisma.sale.findMany({
      include: { items: true },
      orderBy: { orderedAt: "desc" },
    });

    return sales.map(mapSale);
  }

  async findById(id: string): Promise<Sale> {
    const sale = await this.prisma.sale.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!sale) {
      throw new NotFoundException("Vente introuvable");
    }
    return mapSale(sale);
  }

  async generateInvoicePdf(id: string): Promise<Buffer> {
    const sale = await this.findById(id);
    const client = await this.clientsService.findById(sale.clientId);
    return buildSaleInvoicePdf(sale, client);
  }

  async getOverview(): Promise<SalesOverview> {
    const sales = await this.listAll();
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const month = now.getMonth();
    const year = now.getFullYear();

    const sorted = [...sales].sort(
      (a, b) =>
        new Date(b.orderedAt).getTime() - new Date(a.orderedAt).getTime(),
    );

    let salesToday = 0;
    let revenueToday = 0;
    let revenueMonth = 0;

    for (const sale of sales) {
      if (sale.kind === "quote") continue;

      const d = new Date(sale.orderedAt);
      const saleDay = sale.orderedAt.slice(0, 10);
      if (saleDay === today) {
        salesToday += 1;
      }
      if (sale.paymentStatus !== "paid") continue;
      if (saleDay === today) {
        revenueToday += sale.totalAmount;
      }
      if (d.getMonth() === month && d.getFullYear() === year) {
        revenueMonth += sale.totalAmount;
      }
    }

    return {
      sales: sorted,
      recentSales: sorted.slice(0, 30),
      salesToday,
      revenueToday,
      revenueMonth,
    };
  }

  async create(input: CreateSaleInput): Promise<Sale> {
    if (!input.items.length) {
      throw new BadRequestException("La commande doit contenir au moins un article.");
    }

    const isQuote = input.kind === "quote";

    return this.prisma.$transaction(async (tx) => {
      const client = await tx.client.findUnique({
        where: { id: input.clientId },
      });
      if (!client) {
        throw new NotFoundException("Client introuvable");
      }

      const productIds = [...new Set(input.items.map((item) => item.productId))];
      const products = await tx.product.findMany({
        where: {
          id: { in: productIds },
        },
        include: {
          formats: true,
        },
      });

      const lines = this.buildLineItems(input, products, {
        skipStockCheck: isQuote,
      });

      if (!isQuote) {
        for (const line of lines) {
          const updated = await tx.productFormat.updateMany({
            where: {
              productId: line.productId,
              volume: toPrismaJuiceVolume(line.volume),
              enabled: true,
              quantity: {
                gte: line.quantity,
              },
            },
            data: {
              quantity: {
                decrement: line.quantity,
              },
            },
          });
          if (updated.count === 0) {
            throw new BadRequestException(
              `Stock insuffisant pour ${line.productName} (${line.volume}).`,
            );
          }
        }
      }

      const orderedAt = input.orderedAt ? new Date(input.orderedAt) : new Date();
      const personalization = input.personalization ?? false;
      const discountAmount = Math.max(0, Math.round(input.discountAmount ?? 0));
      const totalAmount = computeSaleTotalAmount(
        lines,
        personalization,
        discountAmount,
      );

      const paymentStatus = isQuote
        ? toPrismaSalePaymentStatus("unpaid")
        : this.normalizePaymentStatus(input.paymentStatus);
      const paymentChannel = isQuote
        ? null
        : this.resolvePaymentChannel(
            paymentStatus === toPrismaSalePaymentStatus("paid") ? "paid" : "unpaid",
            input.paymentChannel,
          );

      const sale = await tx.sale.create({
        data: {
          clientId: client.id,
          clientName: client.name,
          orderedAt,
          totalAmount,
          personalization,
          discountAmount,
          kind: isQuote ? toPrismaSaleKind("quote") : toPrismaSaleKind("sale"),
          paymentStatus,
          paymentChannel,
          notes: input.notes?.trim() ?? "",
          items: {
            create: lines.map((line) => ({
              productId: line.productId,
              productName: line.productName,
              volume: toPrismaJuiceVolume(line.volume),
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              lineTotal: line.lineTotal,
            })),
          },
        },
        include: { items: true },
      });

      return mapSale(sale);
    });
  }

  async update(id: string, input: UpdateSaleInput): Promise<Sale> {
    if (!input.items.length) {
      throw new BadRequestException("La commande doit contenir au moins un article.");
    }

    const personalization = input.personalization ?? false;
    const discountAmount = Math.max(0, Math.round(input.discountAmount ?? 0));

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.sale.findUnique({
        where: { id },
        include: { items: true },
      });
      if (!existing) {
        throw new NotFoundException("Vente introuvable");
      }

      const isQuote = existing.kind === toPrismaSaleKind("quote");

      const client = await tx.client.findUnique({
        where: { id: input.clientId },
      });
      if (!client) {
        throw new NotFoundException("Client introuvable");
      }

      if (!isQuote) {
        for (const oldItem of existing.items) {
          await tx.productFormat.updateMany({
            where: {
              productId: oldItem.productId,
              volume: oldItem.volume,
            },
            data: {
              quantity: {
                increment: oldItem.quantity,
              },
            },
          });
        }
      }

      const productIds = [...new Set(input.items.map((item) => item.productId))];
      const products = await tx.product.findMany({
        where: { id: { in: productIds } },
        include: { formats: true },
      });

      const lines = this.buildLineItems(input, products, {
        skipStockCheck: isQuote,
      });

      if (!isQuote) {
        for (const line of lines) {
          const updated = await tx.productFormat.updateMany({
            where: {
              productId: line.productId,
              volume: toPrismaJuiceVolume(line.volume),
              enabled: true,
              quantity: {
                gte: line.quantity,
              },
            },
            data: {
              quantity: {
                decrement: line.quantity,
              },
            },
          });
          if (updated.count === 0) {
            throw new BadRequestException(
              `Stock insuffisant pour ${line.productName} (${line.volume}).`,
            );
          }
        }
      }

      await tx.saleItem.deleteMany({ where: { saleId: id } });

      const orderedAt = input.orderedAt
        ? new Date(input.orderedAt)
        : existing.orderedAt;

      const totalAmount = computeSaleTotalAmount(
        lines,
        personalization,
        discountAmount,
      );

      const nextPaymentStatus = isQuote
        ? toPrismaSalePaymentStatus("unpaid")
        : input.paymentStatus
          ? this.normalizePaymentStatus(input.paymentStatus)
          : existing.paymentStatus;
      const sharedPaymentStatus =
        nextPaymentStatus === toPrismaSalePaymentStatus("paid") ? "paid" : "unpaid";
      const paymentChannel = isQuote
        ? null
        : this.resolvePaymentChannel(
            sharedPaymentStatus,
            input.paymentChannel ?? undefined,
            existing.paymentChannel
              ? toSharedPaymentChannel(existing.paymentChannel)
              : undefined,
          );

      const sale = await tx.sale.update({
        where: { id },
        data: {
          clientId: client.id,
          clientName: client.name,
          orderedAt,
          totalAmount,
          personalization,
          discountAmount,
          paymentStatus: nextPaymentStatus,
          paymentChannel,
          notes: input.notes?.trim() ?? "",
          items: {
            create: lines.map((line) => ({
              productId: line.productId,
              productName: line.productName,
              volume: toPrismaJuiceVolume(line.volume),
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              lineTotal: line.lineTotal,
            })),
          },
        },
        include: { items: true },
      });

      return mapSale(sale);
    });
  }

  async convertToSale(id: string): Promise<Sale> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.sale.findUnique({
        where: { id },
        include: { items: true },
      });
      if (!existing) {
        throw new NotFoundException("Devis introuvable");
      }
      if (existing.kind !== toPrismaSaleKind("quote")) {
        throw new BadRequestException("Cette commande n'est pas un devis.");
      }

      const input: CreateSaleInput = {
        clientId: existing.clientId,
        items: existing.items.map((item) => ({
          productId: item.productId,
          volume: toSharedJuiceVolume(item.volume),
          quantity: item.quantity,
        })),
        personalization: existing.personalization,
        discountAmount: existing.discountAmount,
        notes: existing.notes,
      };

      const productIds = [...new Set(input.items.map((item) => item.productId))];
      const products = await tx.product.findMany({
        where: { id: { in: productIds } },
        include: { formats: true },
      });

      const lines = this.buildLineItems(input, products);

      for (const line of lines) {
        const updated = await tx.productFormat.updateMany({
          where: {
            productId: line.productId,
            volume: toPrismaJuiceVolume(line.volume),
            enabled: true,
            quantity: {
              gte: line.quantity,
            },
          },
          data: {
            quantity: {
              decrement: line.quantity,
            },
          },
        });
        if (updated.count === 0) {
          throw new BadRequestException(
            `Stock insuffisant pour ${line.productName} (${line.volume}).`,
          );
        }
      }

      const sale = await tx.sale.update({
        where: { id },
        data: {
          kind: toPrismaSaleKind("sale"),
        },
        include: { items: true },
      });

      return mapSale(sale);
    });
  }

  async updatePaymentStatus(
    id: string,
    input: UpdateSalePaymentInput,
  ): Promise<Sale> {
    const existing = await this.prisma.sale.findUnique({
      where: { id },
      select: { id: true, kind: true },
    });
    if (!existing) {
      throw new NotFoundException("Vente introuvable");
    }
    if (existing.kind === toPrismaSaleKind("quote")) {
      throw new BadRequestException(
        "Un devis ne peut pas être marqué payé — convertis-le d'abord en vente.",
      );
    }

    const sale = await this.prisma.sale.update({
      where: { id },
      data: {
        paymentStatus: this.normalizePaymentStatus(input.paymentStatus),
        paymentChannel: this.resolvePaymentChannel(
          input.paymentStatus,
          input.paymentChannel,
        ),
      },
      include: { items: true },
    });

    return mapSale(sale);
  }

  private resolvePaymentChannel(
    status: SalePaymentStatus,
    channel?: PaymentChannel,
    fallback?: PaymentChannel,
  ) {
    if (status !== "paid") {
      return null;
    }
    const resolved = channel ?? fallback;
    if (!resolved) {
      throw new BadRequestException(
        "Précise le moyen de paiement (Cash, OM ou Wave) pour une vente payée.",
      );
    }
    return toPrismaPaymentChannel(resolved);
  }

  private normalizePaymentStatus(
    status?: SalePaymentStatus,
  ): PrismaSalePaymentStatus {
    return toPrismaSalePaymentStatus(status === "paid" ? "paid" : "unpaid");
  }
}
