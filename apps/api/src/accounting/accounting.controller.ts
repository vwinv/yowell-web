import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import type {
  CreateManualAccountingEntryInput,
  ManualAccountingEntry,
  UpdateCaisseInput,
  UpdateChannelBalancesInput,
} from "@yowell/shared";

import { AccountingService } from "./accounting.service";

@Controller("accounting")
export class AccountingController {
  constructor(private readonly accountingService: AccountingService) {}

  @Get("overview")
  getOverview() {
    return this.accountingService.getOverview();
  }

  @Post("entries")
  createManual(
    @Body() body: CreateManualAccountingEntryInput,
  ): Promise<ManualAccountingEntry> {
    return this.accountingService.createManual(body);
  }

  @Delete("entries/:id")
  deleteManual(@Param("id") id: string): Promise<void> {
    return this.accountingService.deleteManual(id);
  }

  @Patch("caisse")
  async updateCaisse(@Body() body: UpdateCaisseInput) {
    return { caisse: await this.accountingService.updateCaisse(body) };
  }

  @Patch("balances")
  updateChannelBalances(@Body() body: UpdateChannelBalancesInput) {
    return this.accountingService.updateChannelBalances(body);
  }
}
