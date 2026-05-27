import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type {
  CreateDeliveryRunInput,
  DeliveriesOverview,
  UpdateDeliveryItemRemainingInput,
} from "@yowell/shared";
import { buildDeliveryRemainingItems } from "@yowell/shared";

import { mapDeliveryRun } from "../prisma/prisma.mappers";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class DeliveriesService {
  constructor(private readonly prisma: PrismaService) {}

  async listAll() {
    const runs = await this.prisma.deliveryRun.findMany({
      include: { items: true },
      orderBy: { date: "desc" },
    });

    return runs.map(mapDeliveryRun);
  }

  async getOverview(): Promise<DeliveriesOverview> {
    const runs = await this.listAll();
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();

    let totalRunsMonth = 0;
    let totalAmountMonth = 0;

    for (const run of runs) {
      const d = new Date(run.date);
      if (d.getMonth() === month && d.getFullYear() === year) {
        totalRunsMonth += 1;
        totalAmountMonth += run.totalAmount;
      }
    }

    return {
      runs,
      remainingItems: buildDeliveryRemainingItems(runs),
      totalRuns: runs.length,
      totalRunsMonth,
      totalAmountMonth,
    };
  }

  async create(input: CreateDeliveryRunInput) {
    if (!input.items.length) {
      throw new BadRequestException("Ajoute au moins une ligne à la course.");
    }

    const items = input.items.map((item) => ({
      label: item.label.trim(),
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal: item.quantity * item.unitPrice,
    }));

    const run = await this.prisma.deliveryRun.create({
      data: {
        date: new Date(input.date),
        totalAmount: items.reduce((sum, item) => sum + item.lineTotal, 0),
        items: {
          create: items,
        },
      },
      include: { items: true },
    });

    return mapDeliveryRun(run);
  }

  async updateItemRemaining(
    runId: string,
    input: UpdateDeliveryItemRemainingInput,
  ) {
    const run = await this.prisma.deliveryRun.findUnique({
      where: { id: runId },
      select: { id: true },
    });
    if (!run) {
      throw new NotFoundException("Course introuvable");
    }

    const item = await this.prisma.deliveryRunItem.findFirst({
      where: {
        id: input.itemId,
        runId,
      },
    });
    if (!item) {
      throw new NotFoundException("Ligne de course introuvable");
    }

    if (input.hasRemaining) {
      const note = input.remainingNote?.trim();
      if (!note) {
        throw new BadRequestException("Indique ce qu'il reste pour cet article.");
      }
      await this.prisma.deliveryRunItem.update({
        where: { id: item.id },
        data: {
          hasRemaining: true,
          remainingNote: note,
        },
      });
    } else {
      await this.prisma.deliveryRunItem.update({
        where: { id: item.id },
        data: {
          hasRemaining: false,
          remainingNote: null,
        },
      });
    }

    const updatedRun = await this.prisma.deliveryRun.findUnique({
      where: { id: runId },
      include: { items: true },
    });
    if (!updatedRun) {
      throw new NotFoundException("Course introuvable");
    }

    return mapDeliveryRun(updatedRun);
  }

  async delete(id: string): Promise<void> {
    const run = await this.prisma.deliveryRun.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!run) {
      throw new NotFoundException("Course introuvable");
    }

    await this.prisma.deliveryRun.delete({
      where: { id },
    });
  }
}
