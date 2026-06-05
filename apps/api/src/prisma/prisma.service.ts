import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaClient } from "@prisma/client";

import { createPrismaPgAdapter } from "./pg-connection";

function getDatabaseUrl(config: ConfigService): string {
  const databaseUrl = config.get<string>("DATABASE_URL");
  if (!databaseUrl) {
    throw new Error("DATABASE_URL est obligatoire pour Prisma.");
  }
  return databaseUrl;
}

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(config: ConfigService) {
    super({
      adapter: createPrismaPgAdapter(getDatabaseUrl(config)),
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
