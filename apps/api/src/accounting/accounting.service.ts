import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from "@nestjs/common";
import type {
  AccountingEntry,
  AccountingOverview,
  CreateManualAccountingEntryInput,
  ManualAccountingEntry,
  UpdateCaisseInput,
} from "@yowell/shared";
import { randomUUID } from "node:crypto";

import { DeliveriesService } from "../deliveries/deliveries.service";
import { SalesService } from "../sales/sales.service";
import { AccountingStore } from "./accounting.store";

@Injectable()
export class AccountingService implements OnModuleInit {
  private readonly store = new AccountingStore();

  constructor(
    private readonly salesService: SalesService,
    private readonly deliveriesService: DeliveriesService,
  ) {}

  onModuleInit() {
    this.store.load();
  }

  getOverview(): AccountingOverview {
    const caisse = this.getCaisse();
    const entries = this.buildLedger(caisse);
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();

    let operationsBalance = 0;
    let incomeMonth = 0;
    let expenseMonth = 0;
    let incomeFromOperations = 0;
    let expenseTotal = 0;

    for (const entry of entries) {
      if (entry.source === "caisse") continue;

      const d = new Date(entry.date);
      const inMonth =
        d.getMonth() === month && d.getFullYear() === year;

      if (entry.type === "income") {
        operationsBalance += entry.amount;
        incomeFromOperations += entry.amount;
        if (inMonth) incomeMonth += entry.amount;
      } else {
        operationsBalance -= entry.amount;
        expenseTotal += entry.amount;
        if (inMonth) expenseMonth += entry.amount;
      }
    }

    const incomeTotal = caisse + incomeFromOperations;
    const balance = caisse + operationsBalance;

    return {
      caisse,
      balance,
      incomeMonth,
      expenseMonth,
      incomeTotal,
      incomeFromOperations,
      expenseTotal,
      recentEntries: entries.slice(0, 80),
    };
  }

  getCaisse(): number {
    return this.store.getData().caisse;
  }

  listManualEntries(): ManualAccountingEntry[] {
    return [...this.store.getData().manualEntries];
  }

  updateCaisse(input: UpdateCaisseInput): number {
    if (input.amount < 0) {
      throw new BadRequestException("Le montant de la caisse ne peut pas être négatif.");
    }
    const data = this.store.getData();
    data.caisse = Math.round(input.amount);
    this.store.setData(data);
    return data.caisse;
  }

  createManual(input: CreateManualAccountingEntryInput): ManualAccountingEntry {
    const label = input.label?.trim();
    if (!label) {
      throw new BadRequestException("Le libellé est obligatoire.");
    }
    if (!input.amount || input.amount <= 0) {
      throw new BadRequestException("Le montant doit être supérieur à zéro.");
    }
    if (input.type !== "income" && input.type !== "expense") {
      throw new BadRequestException("Type invalide (income ou expense).");
    }

    const entry: ManualAccountingEntry = {
      id: randomUUID(),
      date: new Date(input.date).toISOString(),
      label,
      amount: Math.round(input.amount),
      type: input.type,
      createdAt: new Date().toISOString(),
    };

    const data = this.store.getData();
    data.manualEntries.push(entry);
    this.store.setData(data);
    return entry;
  }

  deleteManual(id: string): void {
    const data = this.store.getData();
    const index = data.manualEntries.findIndex((e) => e.id === id);
    if (index === -1) {
      throw new NotFoundException("Écriture manuelle introuvable.");
    }
    data.manualEntries.splice(index, 1);
    this.store.setData(data);
  }

  private buildLedger(caisse: number): AccountingEntry[] {
    const entries: AccountingEntry[] = [];

    entries.push({
      id: "caisse-opening",
      date: "1970-01-01T00:00:00.000Z",
      label: "Solde caisse (état actuel)",
      amount: caisse,
      type: "income",
      source: "caisse",
    });

    for (const sale of this.salesService.listAll()) {
      if (sale.paymentStatus !== "paid") continue;
      entries.push({
        id: `sale-${sale.id}`,
        date: sale.orderedAt,
        label: `Vente — ${sale.clientName}`,
        amount: sale.totalAmount,
        type: "income",
        source: "sale",
        sourceId: sale.id,
      });
    }

    for (const run of this.deliveriesService.listAll()) {
      const dateLabel = new Date(run.date).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
      entries.push({
        id: `delivery-${run.id}`,
        date: run.date,
        label: `Course du ${dateLabel}`,
        amount: run.totalAmount,
        type: "expense",
        source: "delivery",
        sourceId: run.id,
      });
    }

    for (const manual of this.store.getData().manualEntries) {
      entries.push({
        id: `manual-${manual.id}`,
        date: manual.date,
        label: manual.label,
        amount: manual.amount,
        type: manual.type,
        source: "manual",
        sourceId: manual.id,
      });
    }

    return entries.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }
}
