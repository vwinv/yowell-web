import { Module } from "@nestjs/common";

import { AccountingModule } from "../accounting/accounting.module";
import { DeliveriesModule } from "../deliveries/deliveries.module";
import { SalesModule } from "../sales/sales.module";
import { StatsController } from "./stats.controller";
import { StatsService } from "./stats.service";

@Module({
  imports: [SalesModule, DeliveriesModule, AccountingModule],
  controllers: [StatsController],
  providers: [StatsService],
})
export class StatsModule {}
