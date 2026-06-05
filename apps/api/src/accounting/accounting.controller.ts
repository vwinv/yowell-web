import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import type {
  ManualAccountingEntry,
  UpdateCaisseInput,
  UpdateChannelBalancesInput,
} from "@yowell/shared";

import { AccountingService } from "./accounting.service";
import { CreateManualEntryDto } from "./dto/create-manual-entry.dto";
import { UpdateManualEntryDto } from "./dto/update-manual-entry.dto";

@Controller("accounting")
export class AccountingController {
  constructor(private readonly accountingService: AccountingService) {}

  @Get("overview")
  getOverview() {
    return this.accountingService.getOverview();
  }

  @Post("entries")
  createManual(@Body() body: CreateManualEntryDto): Promise<ManualAccountingEntry> {
    return this.accountingService.createManual(body);
  }

  @Patch("entries/:id")
  updateManual(
    @Param("id") id: string,
    @Body() body: UpdateManualEntryDto,
  ): Promise<ManualAccountingEntry> {
    return this.accountingService.updateManual(id, body);
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
