import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import type {
  CreateManualAccountingEntryInput,
  ManualAccountingEntry,
  UpdateCaisseInput,
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
  ): ManualAccountingEntry {
    return this.accountingService.createManual(body);
  }

  @Delete("entries/:id")
  deleteManual(@Param("id") id: string): void {
    return this.accountingService.deleteManual(id);
  }

  @Patch("caisse")
  updateCaisse(@Body() body: UpdateCaisseInput) {
    return { caisse: this.accountingService.updateCaisse(body) };
  }
}
