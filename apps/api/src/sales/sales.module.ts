import { Module } from "@nestjs/common";

import { ClientsModule } from "../clients/clients.module";
import { StockModule } from "../stock/stock.module";
import { SalesController } from "./sales.controller";
import { SalesService } from "./sales.service";

@Module({
  imports: [ClientsModule, StockModule],
  controllers: [SalesController],
  providers: [SalesService],
  exports: [SalesService],
})
export class SalesModule {}
