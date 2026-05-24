import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from "@nestjs/common";
import type {
  CreateSaleInput,
  Sale,
  SaleLineItem,
  SalePaymentStatus,
  SalesOverview,
  UpdateSalePaymentInput,
} from "@yowell/shared";
import { randomUUID } from "node:crypto";

import { ClientsService } from "../clients/clients.service";
import { StockService } from "../stock/stock.service";
import { buildSaleInvoicePdf } from "./sales-invoice.pdf";
import { SalesStore } from "./sales.store";

@Injectable()
export class SalesService implements OnModuleInit {
  private readonly store = new SalesStore();

  constructor(
    private readonly clientsService: ClientsService,
    private readonly stockService: StockService,
  ) {}

  onModuleInit() {
    this.store.load();
    this.migrateSales();
  }

  private migrateSales() {
    const data = this.store.getData();
    let changed = false;
    for (const sale of data.sales) {
      if (sale.paymentStatus !== "paid" && sale.paymentStatus !== "unpaid") {
        sale.paymentStatus = "unpaid";
        changed = true;
      }
    }
    if (changed) {
      this.store.setData(data);
    }
  }

  listAll(): Sale[] {
    return [...this.store.getData().sales];
  }

  findById(id: string): Sale {
    const sale = this.store.getData().sales.find((s) => s.id === id);
    if (!sale) {
      throw new NotFoundException("Vente introuvable");
    }
    return sale;
  }

  async generateInvoicePdf(id: string): Promise<Buffer> {
    const sale = this.findById(id);
    const client = this.clientsService.findById(sale.clientId);
    return buildSaleInvoicePdf(sale, client);
  }

  getOverview(): SalesOverview {
    const { sales } = this.store.getData();
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

  create(input: CreateSaleInput): Sale {
    if (!input.items.length) {
      throw new BadRequestException("La commande doit contenir au moins un article.");
    }

    const client = this.clientsService.findById(input.clientId);
    const products = this.stockService.listProductsForSales();

    const lines: SaleLineItem[] = [];
    for (const item of input.items) {
      const product = products.find((p) => p.id === item.productId);
      if (!product) {
        throw new BadRequestException(`Produit introuvable : ${item.productId}`);
      }
      const format = product.formats.find(
        (f) => f.volume === item.volume && f.enabled,
      );
      if (!format) {
        throw new BadRequestException(
          `Format ${item.volume} indisponible pour ${product.name}.`,
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

    for (const line of lines) {
      this.stockService.decrementStock(
        line.productId,
        line.volume,
        line.quantity,
      );
    }

    const orderedAt = input.orderedAt
      ? new Date(input.orderedAt).toISOString()
      : new Date().toISOString();

    const paymentStatus: SalePaymentStatus = "unpaid";

    const sale: Sale = {
      id: randomUUID(),
      clientId: client.id,
      clientName: client.name,
      orderedAt,
      items: lines,
      totalAmount: lines.reduce((sum, l) => sum + l.lineTotal, 0),
      paymentStatus,
      notes: input.notes?.trim() ?? "",
      createdAt: new Date().toISOString(),
    };

    const data = this.store.getData();
    data.sales.push(sale);
    this.store.setData(data);
    return sale;
  }

  updatePaymentStatus(id: string, input: UpdateSalePaymentInput): Sale {
    const data = this.store.getData();
    const sale = data.sales.find((s) => s.id === id);
    if (!sale) {
      throw new NotFoundException("Vente introuvable");
    }
    sale.paymentStatus = this.normalizePaymentStatus(input.paymentStatus);
    this.store.setData(data);
    return sale;
  }

  private normalizePaymentStatus(
    status?: SalePaymentStatus,
  ): SalePaymentStatus {
    return status === "paid" ? "paid" : "unpaid";
  }
}
