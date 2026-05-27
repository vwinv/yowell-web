import { Controller, Get, Query, Res } from "@nestjs/common";
import type { StatsOverview } from "@yowell/shared";
import type { Response } from "express";

import { StatsService } from "./stats.service";
import type { StatsPeriodInput } from "./stats-period";

@Controller("stats")
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get("overview")
  getOverview(@Query() query: StatsPeriodInput): Promise<StatsOverview> {
    return this.statsService.getOverview(query);
  }

  @Get("report.pdf")
  async getReportPdf(
    @Query() query: StatsPeriodInput,
    @Res() res: Response,
  ) {
    const buffer = await this.statsService.generateReportPdf(query);
    const from = query.from?.slice(0, 10) ?? "periode";
    const to = query.to?.slice(0, 10) ?? "";
    const filename = `statistiques-${query.preset ?? "month"}-${from}${to ? `-${to}` : ""}.pdf`;

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": buffer.length,
    });
    res.send(buffer);
  }
}
