import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";

import { AccountingModule } from "./accounting/accounting.module";
import { ActivityLoggingInterceptor } from "./activity/activity-logging.interceptor";
import { ActivityModule } from "./activity/activity.module";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { AuthModule } from "./auth/auth.module";
import { JwtAuthGuard } from "./auth/jwt-auth.guard";
import { ClientsModule } from "./clients/clients.module";
import { DeliveriesModule } from "./deliveries/deliveries.module";
import { SalesModule } from "./sales/sales.module";
import { StatsModule } from "./stats/stats.module";
import { StockModule } from "./stock/stock.module";
import { UsersModule } from "./users/users.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    ActivityModule,
    UsersModule,
    StatsModule,
    StockModule,
    ClientsModule,
    SalesModule,
    AccountingModule,
    DeliveriesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_INTERCEPTOR, useClass: ActivityLoggingInterceptor },
  ],
})
export class AppModule {}
