import { BadRequestException, Injectable, NotFoundException, OnModuleInit } from "@nestjs/common";
import type {
  CreateDeliveryRunInput,
  DeliveryRun,
  DeliveryRunLine,
  DeliveriesOverview,
  UpdateDeliveryItemRemainingInput,
} from "@yowell/shared";
import { buildDeliveryRemainingItems } from "@yowell/shared";
import { randomUUID } from "node:crypto";

import { DeliveriesStore } from "./deliveries.store";

type LegacyRun = {
  id: string;
  date: string;
  route?: string;
  litersDelivered?: number;
  revenue?: number;
  details?: string;
  notes?: string;
  items?: DeliveryRunLine[];
  totalAmount?: number;
  createdAt?: string;
};

@Injectable()
export class DeliveriesService implements OnModuleInit {
  private readonly store = new DeliveriesStore();

  onModuleInit() {
    this.store.load();
    this.migrateRuns();
  }

  listAll(): DeliveryRun[] {
    return [...this.store.getData().runs];
  }

  private migrateRuns() {
    const data = this.store.getData();
    let changed = false;

    for (const raw of data.runs as LegacyRun[]) {
      if (!raw.items) {
        const legacyDetails = raw.details ?? raw.notes ?? "";
        raw.items = legacyDetails
          ? [
              {
                id: randomUUID(),
                label: raw.route?.trim() || "Course",
                quantity: raw.litersDelivered && raw.litersDelivered > 0 ? raw.litersDelivered : 1,
                unitPrice: raw.revenue ?? 0,
                lineTotal: raw.revenue ?? 0,
              },
            ]
          : [];
        delete raw.route;
        delete raw.litersDelivered;
        delete raw.revenue;
        delete raw.details;
        delete raw.notes;
        changed = true;
      }
      if (raw.totalAmount === undefined) {
        raw.totalAmount = raw.items.reduce((s, i) => s + i.lineTotal, 0);
        changed = true;
      }
      if (!raw.createdAt) {
        raw.createdAt = raw.date;
        changed = true;
      }
      for (const item of raw.items ?? []) {
        if (!item.id) {
          item.id = randomUUID();
          changed = true;
        }
      }
    }

    if (changed) {
      this.store.setData(data);
    }
  }

  getOverview(): DeliveriesOverview {
    const { runs } = this.store.getData();
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();

    const sorted = [...runs].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );

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
      runs: sorted,
      remainingItems: buildDeliveryRemainingItems(runs),
      totalRuns: runs.length,
      totalRunsMonth,
      totalAmountMonth,
    };
  }

  create(input: CreateDeliveryRunInput): DeliveryRun {
    if (!input.items.length) {
      throw new BadRequestException("Ajoute au moins une ligne à la course.");
    }

    const items: DeliveryRunLine[] = input.items.map((item) => ({
      id: randomUUID(),
      label: item.label.trim(),
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal: item.quantity * item.unitPrice,
    }));

    const data = this.store.getData();
    const run: DeliveryRun = {
      id: randomUUID(),
      date: new Date(input.date).toISOString(),
      items,
      totalAmount: items.reduce((sum, i) => sum + i.lineTotal, 0),
      createdAt: new Date().toISOString(),
    };
    data.runs.push(run);
    this.store.setData(data);
    return run;
  }

  updateItemRemaining(
    runId: string,
    input: UpdateDeliveryItemRemainingInput,
  ): DeliveryRun {
    const data = this.store.getData();
    const run = data.runs.find((r) => r.id === runId);
    if (!run) {
      throw new NotFoundException("Course introuvable");
    }

    const item = run.items.find((i) => i.id === input.itemId);
    if (!item) {
      throw new NotFoundException("Ligne de course introuvable");
    }

    if (input.hasRemaining) {
      const note = input.remainingNote?.trim();
      if (!note) {
        throw new BadRequestException("Indique ce qu'il reste pour cet article.");
      }
      item.hasRemaining = true;
      item.remainingNote = note;
    } else {
      item.hasRemaining = false;
      delete item.remainingNote;
    }

    this.store.setData(data);
    return run;
  }

  delete(id: string): void {
    const data = this.store.getData();
    const index = data.runs.findIndex((r) => r.id === id);
    if (index === -1) {
      throw new NotFoundException("Course introuvable");
    }
    data.runs.splice(index, 1);
    this.store.setData(data);
  }
}
