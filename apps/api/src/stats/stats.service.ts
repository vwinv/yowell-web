import { Injectable } from "@nestjs/common";
import type { StatsOverview, StatsTopProduct } from "@yowell/shared";

import { AccountingService } from "../accounting/accounting.service";
import { DeliveriesService } from "../deliveries/deliveries.service";
import { SalesService } from "../sales/sales.service";
import { buildStatsReportPdf } from "./stats-report.pdf";
import { eachDayInPeriod, resolveStatsPeriod, type StatsPeriodInput } from "./stats-period";
import { buildEvolutionPoints } from "./stats-evolution";

@Injectable()
export class StatsService {
  constructor(
    private readonly salesService: SalesService,
    private readonly deliveriesService: DeliveriesService,
    private readonly accountingService: AccountingService,
  ) {}

  async getOverview(input: StatsPeriodInput): Promise<StatsOverview> {
    const period = resolveStatsPeriod(input);
    return this.computeOverview(period);
  }

  async generateReportPdf(input: StatsPeriodInput): Promise<Buffer> {
    const overview = await this.getOverview(input);
    return buildStatsReportPdf(overview);
  }

  private async computeOverview(
    period: StatsOverview["period"],
  ): Promise<StatsOverview> {
    const { from, to } = period;
    const [sales, deliveries, manualEntries] = await Promise.all([
      this.salesService.listInPeriod(from, to),
      this.deliveriesService.listInPeriod(from, to),
      this.accountingService.listManualEntriesInPeriod(from, to),
    ]);

    let revenue = 0;
    let expenses = 0;
    let ordersCount = 0;

    const dayMap = new Map<string, { revenue: number; expenses: number }>();
    for (const day of eachDayInPeriod(from, to)) {
      dayMap.set(day, { revenue: 0, expenses: 0 });
    }

    const productMap = new Map<string, { quantity: number; revenue: number }>();

    const inRange = (day: string) => day >= from && day <= to;

    for (const sale of sales) {
      if (sale.kind === "quote") continue;

      const saleDay = sale.orderedAt.slice(0, 10);
      if (!inRange(saleDay)) continue;

      ordersCount += 1;
      if (sale.paymentStatus !== "paid") continue;

      revenue += sale.totalAmount;
      const bucket = dayMap.get(saleDay);
      if (bucket) bucket.revenue += sale.totalAmount;

      for (const item of sale.items) {
        const current = productMap.get(item.productName) ?? {
          quantity: 0,
          revenue: 0,
        };
        current.quantity += item.quantity;
        current.revenue += item.lineTotal;
        productMap.set(item.productName, current);
      }
    }

    for (const run of deliveries) {
      const runDay = run.date.slice(0, 10);
      if (!inRange(runDay)) continue;

      expenses += run.totalAmount;
      const bucket = dayMap.get(runDay);
      if (bucket) bucket.expenses += run.totalAmount;
    }

    for (const entry of manualEntries) {
      const entryDay = entry.date.slice(0, 10);
      if (!inRange(entryDay)) continue;

      const bucket = dayMap.get(entryDay);
      if (entry.type === "income") {
        revenue += entry.amount;
        if (bucket) bucket.revenue += entry.amount;
      } else {
        expenses += entry.amount;
        if (bucket) bucket.expenses += entry.amount;
      }
    }

    const { granularity, points: recentDays } = buildEvolutionPoints(
      dayMap,
      period.preset,
    );

    const topProducts: StatsTopProduct[] = [...productMap.entries()]
      .map(([productName, stats]) => ({
        productName,
        quantity: stats.quantity,
        revenue: stats.revenue,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    return {
      period,
      revenue,
      expenses,
      profit: revenue - expenses,
      ordersCount,
      evolutionGranularity: granularity,
      recentDays,
      topProducts,
    };
  }
}
