import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from "@nestjs/common";
import type {
  CreateJuiceProductInput,
  CreateProductionInput,
  JuiceFormat,
  JuiceProduct,
  JuiceVolume,
  ProductionRecord,
  StockOverview,
} from "@yowell/shared";
import { randomUUID } from "node:crypto";

import { deletePhotoFiles } from "./stock-upload";
import { CreateProductDto } from "./dto/create-product.dto";
import { StockStore } from "./stock.store";

type LegacyProduct = JuiceProduct & {
  volume?: JuiceVolume;
  quantity?: number;
  minQuantity?: number;
};

@Injectable()
export class StockService implements OnModuleInit {
  private readonly store = new StockStore();

  onModuleInit() {
    this.store.load();
    this.migrateProducts();
  }

  private migrateProducts() {
    const data = this.store.getData();
    let changed = false;

    for (const raw of data.products as LegacyProduct[]) {
      if (raw.description === undefined) {
        raw.description = "";
        changed = true;
      }
      if (!raw.photoUrls) {
        raw.photoUrls = [];
        changed = true;
      }
      if (!raw.formats && raw.volume) {
        raw.formats = [
          {
            volume: raw.volume,
            price: 0,
            quantity: raw.quantity ?? 0,
            minQuantity: raw.minQuantity ?? 0,
            enabled: true,
          },
        ];
        delete raw.volume;
        delete raw.quantity;
        delete raw.minQuantity;
        changed = true;
      }
      if (!raw.formats) {
        raw.formats = [];
        changed = true;
      }
    }

    if (changed) {
      this.store.setData(data);
    }
  }

  productFromDto(dto: CreateProductDto): CreateJuiceProductInput {
    const formats: CreateJuiceProductInput["formats"] = [];

    if (dto.format1LEnabled) {
      formats.push({
        volume: "1L",
        price: dto.price1L,
        minQuantity: dto.minQuantity1L ?? 0,
        enabled: true,
      });
    }
    if (dto.format250Enabled) {
      formats.push({
        volume: "250ml",
        price: dto.price250,
        minQuantity: dto.minQuantity250 ?? 0,
        enabled: true,
      });
    }

    if (formats.length === 0) {
      throw new BadRequestException(
        "Active au moins un format (1 L ou 250 ml) avec son prix.",
      );
    }

    return {
      name: dto.name,
      description: dto.description,
      formats,
    };
  }

  getOverview(): StockOverview {
    const { products, productions } = this.store.getData();
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();

    const productionsThisMonth = productions.filter((p) => {
      const d = new Date(p.producedAt);
      return d.getMonth() === month && d.getFullYear() === year;
    }).length;

    let totalUnitsInStock = 0;
    let lowStockCount = 0;
    for (const product of products) {
      for (const format of product.formats) {
        if (!format.enabled) continue;
        totalUnitsInStock += format.quantity;
        if (format.quantity <= format.minQuantity) {
          lowStockCount += 1;
        }
      }
    }

    return {
      products,
      recentProductions: [...productions]
        .sort(
          (a, b) =>
            new Date(b.producedAt).getTime() - new Date(a.producedAt).getTime(),
        )
        .slice(0, 20),
      totalUnitsInStock,
      lowStockCount,
      productionsThisMonth,
    };
  }

  listProducts(): JuiceProduct[] {
    return this.store.getData().products;
  }

  listProductions(): ProductionRecord[] {
    return [...this.store.getData().productions].sort(
      (a, b) =>
        new Date(b.producedAt).getTime() - new Date(a.producedAt).getTime(),
    );
  }

  createProduct(
    input: CreateJuiceProductInput,
    photoUrls: string[] = [],
  ): JuiceProduct {
    if (!input.formats.length) {
      throw new BadRequestException("Au moins un format est requis.");
    }

    const data = this.store.getData();
    const formats: JuiceFormat[] = input.formats.map((f) => ({
      volume: f.volume,
      price: f.price,
      quantity: 0,
      minQuantity: f.minQuantity ?? 0,
      enabled: true,
    }));

    const product: JuiceProduct = {
      id: randomUUID(),
      name: input.name.trim(),
      description: input.description?.trim() ?? "",
      photoUrls,
      formats,
      createdAt: new Date().toISOString(),
    };
    data.products.push(product);
    this.store.setData(data);
    return product;
  }

  recordProduction(input: CreateProductionInput): ProductionRecord {
    const data = this.store.getData();
    const product = data.products.find((p) => p.id === input.productId);
    if (!product) {
      throw new NotFoundException("Produit introuvable");
    }

    const format = product.formats.find(
      (f) => f.volume === input.volume && f.enabled,
    );
    if (!format) {
      throw new BadRequestException(
        `Le format ${input.volume} n'est pas proposé pour ce produit.`,
      );
    }

    const producedAt = input.producedAt
      ? new Date(input.producedAt).toISOString()
      : new Date().toISOString();

    const record: ProductionRecord = {
      id: randomUUID(),
      productId: product.id,
      productName: product.name,
      volume: input.volume,
      quantity: input.quantity,
      producedAt,
      notes: input.notes?.trim() ?? "",
      createdAt: new Date().toISOString(),
    };

    format.quantity += input.quantity;
    data.productions.push(record);
    this.store.setData(data);
    return record;
  }

  decrementStock(
    productId: string,
    volume: JuiceVolume,
    quantity: number,
  ): void {
    const data = this.store.getData();
    const product = data.products.find((p) => p.id === productId);
    if (!product) {
      throw new NotFoundException("Produit introuvable");
    }
    const format = product.formats.find(
      (f) => f.volume === volume && f.enabled,
    );
    if (!format) {
      throw new BadRequestException(
        `Le format ${volume} n'est pas disponible pour ce produit.`,
      );
    }
    if (format.quantity < quantity) {
      throw new BadRequestException(
        `Stock insuffisant pour ${product.name} (${volume}) : ${format.quantity} disponible(s).`,
      );
    }
    format.quantity -= quantity;
    this.store.setData(data);
  }

  listProductsForSales(): JuiceProduct[] {
    return this.store.getData().products;
  }

  deleteProduct(id: string): void {
    const data = this.store.getData();
    const index = data.products.findIndex((p) => p.id === id);
    if (index === -1) {
      throw new NotFoundException("Produit introuvable");
    }
    const [removed] = data.products.splice(index, 1);
    deletePhotoFiles(removed.photoUrls);
    this.store.setData(data);
  }
}
