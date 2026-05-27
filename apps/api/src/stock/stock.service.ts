import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import type {
  CreateJuiceProductInput,
  CreateProductionInput,
  JuiceProduct,
  JuiceVolume,
  ProductionRecord,
  StockOverview,
} from "@yowell/shared";

import {
  mapProduct,
  mapProductionRecord,
  toPrismaJuiceVolume,
} from "../prisma/prisma.mappers";
import { PrismaService } from "../prisma/prisma.service";
import { deletePhotoFiles } from "./stock-upload";
import { CreateProductDto } from "./dto/create-product.dto";

type StockDbClient = Prisma.TransactionClient | PrismaService;

@Injectable()
export class StockService {
  constructor(private readonly prisma: PrismaService) {}

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

  async getOverview(): Promise<StockOverview> {
    const [products, productions] = await Promise.all([
      this.listProducts(),
      this.listProductions(),
    ]);
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

  async listProducts(): Promise<JuiceProduct[]> {
    const products = await this.prisma.product.findMany({
      include: {
        formats: true,
        photos: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return products.map(mapProduct);
  }

  async listProductions(): Promise<ProductionRecord[]> {
    const productions = await this.prisma.productionRecord.findMany({
      orderBy: { producedAt: "desc" },
    });

    return productions.map(mapProductionRecord);
  }

  async createProduct(
    input: CreateJuiceProductInput,
    photoUrls: string[] = [],
  ): Promise<JuiceProduct> {
    if (!input.formats.length) {
      throw new BadRequestException("Au moins un format est requis.");
    }

    const product = await this.prisma.product.create({
      data: {
        name: input.name.trim(),
        description: input.description?.trim() ?? "",
        formats: {
          create: input.formats.map((format) => ({
            volume: toPrismaJuiceVolume(format.volume),
            price: format.price,
            quantity: 0,
            minQuantity: format.minQuantity ?? 0,
            enabled: format.enabled,
          })),
        },
        photos: {
          create: photoUrls.map((url, index) => ({
            url,
            position: index,
          })),
        },
      },
      include: {
        formats: true,
        photos: true,
      },
    });

    return mapProduct(product);
  }

  async recordProduction(input: CreateProductionInput): Promise<ProductionRecord> {
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({
        where: { id: input.productId },
        include: { formats: true },
      });
      if (!product) {
        throw new NotFoundException("Produit introuvable");
      }

      const format = product.formats.find(
        (item) =>
          item.volume === toPrismaJuiceVolume(input.volume) && item.enabled,
      );
      if (!format) {
        throw new BadRequestException(
          `Le format ${input.volume} n'est pas proposé pour ce produit.`,
        );
      }

      const producedAt = input.producedAt
        ? new Date(input.producedAt)
        : new Date();

      await tx.productFormat.update({
        where: { id: format.id },
        data: {
          quantity: {
            increment: input.quantity,
          },
        },
      });

      const record = await tx.productionRecord.create({
        data: {
          productId: product.id,
          productName: product.name,
          volume: toPrismaJuiceVolume(input.volume),
          quantity: input.quantity,
          producedAt,
          notes: input.notes?.trim() ?? "",
        },
      });

      return mapProductionRecord(record);
    });
  }

  async decrementStock(
    productId: string,
    volume: JuiceVolume,
    quantity: number,
    db: StockDbClient = this.prisma,
  ): Promise<void> {
    const product = await db.product.findUnique({
      where: { id: productId },
      include: { formats: true },
    });
    if (!product) {
      throw new NotFoundException("Produit introuvable");
    }

    const format = product.formats.find(
      (item) => item.volume === toPrismaJuiceVolume(volume) && item.enabled,
    );
    if (!format) {
      throw new BadRequestException(
        `Le format ${volume} n'est pas disponible pour ce produit.`,
      );
    }

    const updated = await db.productFormat.updateMany({
      where: {
        id: format.id,
        quantity: { gte: quantity },
      },
      data: {
        quantity: {
          decrement: quantity,
        },
      },
    });
    if (updated.count === 0) {
      throw new BadRequestException(
        `Stock insuffisant pour ${product.name} (${volume}) : ${format.quantity} disponible(s).`,
      );
    }
  }

  async listProductsForSales(): Promise<JuiceProduct[]> {
    return this.listProducts();
  }

  async deleteProduct(id: string): Promise<void> {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        formats: true,
        photos: true,
      },
    });
    if (!product) {
      throw new NotFoundException("Produit introuvable");
    }

    const photoUrls = product.photos.map((photo) => photo.url);

    await this.prisma.product.delete({
      where: { id },
    });

    deletePhotoFiles(photoUrls);
  }
}
