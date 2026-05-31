import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type {
  CreateDeliveryRunInput,
  DeliveriesOverview,
  UpdateDeliveryItemRemainingInput,
} from "@yowell/shared";
import { buildDeliveryRemainingItems } from "@yowell/shared";

import { mapDeliveryRun, toPrismaPaymentChannel } from "../prisma/prisma.mappers";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class DeliveriesService {
  constructor(private readonly prisma: PrismaService) {}

  async listAll() {
    const runs = await this.prisma.deliveryRun.findMany({
      include: { items: true, fees: true },
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
    const fees = (input.fees ?? [])
      .filter((fee) => fee.label.trim() && fee.amount >= 0)
      .map((fee) => ({
        label: fee.label.trim(),
        amount: Math.round(fee.amount),
      }));

    const run = await this.prisma.deliveryRun.create({
      data: {
        date: new Date(input.date),
        totalAmount:
          items.reduce((sum, item) => sum + item.lineTotal, 0) +
          fees.reduce((sum, fee) => sum + fee.amount, 0),
        paymentChannel: toPrismaPaymentChannel(input.paymentChannel),
        items: {
          create: items,
        },
        fees: {
          create: fees,
        },
      },
      include: { items: true, fees: true },
    });

    return mapDeliveryRun(run);
  }

  async update(id: string, input: CreateDeliveryRunInput) {
    if (!input.items.length) {
      throw new BadRequestException("Ajoute au moins une ligne à la course.");
    }

    const existing = await this.prisma.deliveryRun.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException("Course introuvable");
    }

    const items = input.items.map((item) => ({
      label: item.label.trim(),
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal: item.quantity * item.unitPrice,
    }));
    const fees = (input.fees ?? [])
      .filter((fee) => fee.label.trim() && fee.amount >= 0)
      .map((fee) => ({
        label: fee.label.trim(),
        amount: Math.round(fee.amount),
      }));

    const totalAmount =
      items.reduce((sum, item) => sum + item.lineTotal, 0) +
      fees.reduce((sum, fee) => sum + fee.amount, 0);

    const updatedRun = await this.prisma.$transaction(async (tx) => {
      await tx.deliveryRunItem.deleteMany({ where: { runId: id } });
      await tx.deliveryRunFee.deleteMany({ where: { runId: id } });

      await tx.deliveryRun.update({
        where: { id },
        data: {
          date: new Date(input.date),
          totalAmount,
          paymentChannel: toPrismaPaymentChannel(input.paymentChannel),
        },
      });

      await tx.deliveryRunItem.createMany({
        data: items.map((item) => ({
          runId: id,
          ...item,
        })),
      });
      if (fees.length > 0) {
        await tx.deliveryRunFee.createMany({
          data: fees.map((fee) => ({
            runId: id,
            ...fee,
          })),
        });
      }

      return tx.deliveryRun.findUnique({
        where: { id },
        include: { items: true, fees: true },
      });
    });

    if (!updatedRun) {
      throw new NotFoundException("Course introuvable");
    }

    return mapDeliveryRun(updatedRun);
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
      const initialStock = input.initialRemainingStock ?? item.quantity;
      if (!Number.isFinite(initialStock) || initialStock <= 0) {
        throw new BadRequestException("Le stock initial restant doit être supérieur à 0.");
      }
      await this.prisma.deliveryRunItem.update({
        where: { id: item.id },
        data: {
          hasRemaining: true,
          remainingNote: note,
          initialRemainingStock: initialStock,
        },
      });
    } else {
      await this.prisma.deliveryRunItem.update({
        where: { id: item.id },
        data: {
          hasRemaining: false,
          remainingNote: null,
          initialRemainingStock: null,
        },
      });
    }

    const updatedRun = await this.prisma.deliveryRun.findUnique({
      where: { id: runId },
      include: { items: true, fees: true },
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
