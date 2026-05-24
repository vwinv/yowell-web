import { Module } from "@nestjs/common";

import { DeliveriesModule } from "../deliveries/deliveries.module";
import { SalesModule } from "../sales/sales.module";
import { AccountingController } from "./accounting.controller";
import { AccountingService } from "./accounting.service";

@Module({
  imports: [SalesModule, DeliveriesModule],
  controllers: [AccountingController],
  providers: [AccountingService],
  exports: [AccountingService],
})
export class AccountingModule {}
