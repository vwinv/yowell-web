import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from "@nestjs/common";
import {
  DEFAULT_CAISSE_AMOUNT,
  type ChannelBalances,
} from "@yowell/shared";
import type {
  AccountingEntry,
  AccountingOverview,
  CreateManualAccountingEntryInput,
  ManualAccountingEntry,
  UpdateCaisseInput,
  UpdateChannelBalancesInput,
} from "@yowell/shared";

import { DeliveriesService } from "../deliveries/deliveries.service";
import {
  mapManualAccountingEntry,
  toPrismaAccountingEntryType,
} from "../prisma/prisma.mappers";
import { PrismaService } from "../prisma/prisma.service";
import { SalesService } from "../sales/sales.service";

@Injectable()
export class AccountingService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly salesService: SalesService,
    private readonly deliveriesService: DeliveriesService,
  ) {}

  async onModuleInit() {
    await this.ensureState();
  }

  private async ensureState() {
    const state = await this.prisma.accountingState.upsert({
      where: { id: "default" },
      update: {},
      create: {
        id: "default",
        caisse: DEFAULT_CAISSE_AMOUNT,
        om: 0,
        wave: 0,
      },
    });

    if (state.caisse === 25_865) {
      return this.prisma.accountingState.update({
        where: { id: "default" },
        data: { caisse: DEFAULT_CAISSE_AMOUNT },
      });
    }

    return state;
  }

  async getOverview(): Promise<AccountingOverview> {
    const state = await this.ensureState();
    const openingBalances: ChannelBalances = {
      cash: state.caisse,
      om: state.om,
      wave: state.wave,
    };
    const channelBalances = await this.computeChannelBalances(openingBalances);
    const entries = await this.buildLedger(openingBalances);
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

    const incomeTotal = openingBalances.cash + incomeFromOperations;
    const balance =
      openingBalances.cash +
      openingBalances.om +
      openingBalances.wave +
      operationsBalance;

    return {
      caisse: openingBalances.cash,
      openingBalances,
      channelBalances,
      balance,
      incomeMonth,
      expenseMonth,
      incomeTotal,
      incomeFromOperations,
      expenseTotal,
      recentEntries: entries.slice(0, 80),
    };
  }

  async getCaisse(): Promise<number> {
    const state = await this.ensureState();
    return state.caisse;
  }

  async listManualEntries(): Promise<ManualAccountingEntry[]> {
    const entries = await this.prisma.manualAccountingEntry.findMany({
      orderBy: { date: "desc" },
    });
    return entries.map(mapManualAccountingEntry);
  }

  async updateCaisse(input: UpdateCaisseInput): Promise<number> {
    if (input.amount < 0) {
      throw new BadRequestException("Le montant de la caisse ne peut pas être négatif.");
    }

    const state = await this.prisma.accountingState.upsert({
      where: { id: "default" },
      update: {
        caisse: Math.round(input.amount),
      },
      create: {
        id: "default",
        caisse: Math.round(input.amount),
        om: 0,
        wave: 0,
      },
    });

    return state.caisse;
  }

  async updateChannelBalances(
    input: UpdateChannelBalancesInput,
  ): Promise<ChannelBalances> {
    for (const [label, amount] of [
      ["cash", input.cash],
      ["om", input.om],
      ["wave", input.wave],
    ] as const) {
      if (amount < 0) {
        throw new BadRequestException(
          `Le solde d'ouverture ${label} ne peut pas être négatif.`,
        );
      }
    }

    const state = await this.prisma.accountingState.upsert({
      where: { id: "default" },
      update: {
        caisse: Math.round(input.cash),
        om: Math.round(input.om),
        wave: Math.round(input.wave),
      },
      create: {
        id: "default",
        caisse: Math.round(input.cash),
        om: Math.round(input.om),
        wave: Math.round(input.wave),
      },
    });

    return {
      cash: state.caisse,
      om: state.om,
      wave: state.wave,
    };
  }

  async createManual(
    input: CreateManualAccountingEntryInput,
  ): Promise<ManualAccountingEntry> {
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

    const entry = await this.prisma.manualAccountingEntry.create({
      data: {
        date: new Date(input.date),
        label,
        amount: Math.round(input.amount),
        type: toPrismaAccountingEntryType(input.type),
      },
    });

    return mapManualAccountingEntry(entry);
  }

  async deleteManual(id: string): Promise<void> {
    const existing = await this.prisma.manualAccountingEntry.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException("Écriture manuelle introuvable.");
    }
    await this.prisma.manualAccountingEntry.delete({
      where: { id },
    });
  }

  private async computeChannelBalances(
    opening: ChannelBalances,
  ): Promise<ChannelBalances> {
    const balances: ChannelBalances = { ...opening };
    const [sales, deliveries] = await Promise.all([
      this.salesService.listAll(),
      this.deliveriesService.listAll(),
    ]);

    for (const sale of sales) {
      if (sale.kind === "quote" || sale.paymentStatus !== "paid") continue;
      if (!sale.paymentChannel) continue;
      balances[sale.paymentChannel] += sale.totalAmount;
    }

    for (const run of deliveries) {
      balances[run.paymentChannel] -= run.totalAmount;
    }

    return balances;
  }

  private async buildLedger(opening: ChannelBalances): Promise<AccountingEntry[]> {
    const entries: AccountingEntry[] = [];
    const [sales, deliveries, manualEntries] = await Promise.all([
      this.salesService.listAll(),
      this.deliveriesService.listAll(),
      this.listManualEntries(),
    ]);

    entries.push({
      id: "opening-cash",
      date: "1970-01-01T00:00:00.000Z",
      label: "Solde d'ouverture — Cash",
      amount: opening.cash,
      type: "income",
      source: "caisse",
      paymentChannel: "cash",
    });
    if (opening.om > 0) {
      entries.push({
        id: "opening-om",
        date: "1970-01-01T00:00:00.000Z",
        label: "Solde d'ouverture — Orange Money",
        amount: opening.om,
        type: "income",
        source: "caisse",
        paymentChannel: "om",
      });
    }
    if (opening.wave > 0) {
      entries.push({
        id: "opening-wave",
        date: "1970-01-01T00:00:00.000Z",
        label: "Solde d'ouverture — Wave",
        amount: opening.wave,
        type: "income",
        source: "caisse",
        paymentChannel: "wave",
      });
    }

    for (const sale of sales) {
      if (sale.kind === "quote" || sale.paymentStatus !== "paid") continue;
      entries.push({
        id: `sale-${sale.id}`,
        date: sale.orderedAt,
        label: `Vente — ${sale.clientName}`,
        amount: sale.totalAmount,
        type: "income",
        source: "sale",
        sourceId: sale.id,
        paymentChannel: sale.paymentChannel,
      });
    }

    for (const run of deliveries) {
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
        paymentChannel: run.paymentChannel,
      });
    }

    for (const manual of manualEntries) {
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
