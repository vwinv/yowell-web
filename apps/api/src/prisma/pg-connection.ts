import { PrismaPg } from "@prisma/adapter-pg";
import { Pool, type PoolConfig } from "pg";

function isLocalDatabaseUrl(url: string): boolean {
  return /@(localhost|127\.0\.0\.1)(:|\/)/.test(url);
}

/** Ajoute sslmode=require pour Postgres distant (ex. Render) si absent. */
export function normalizeDatabaseUrl(url: string): string {
  if (isLocalDatabaseUrl(url)) return url;
  if (/[?&]sslmode=/i.test(url)) return url;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}sslmode=require`;
}

function shouldUseSsl(url: string): boolean {
  if (process.env.DATABASE_SSL === "false") return false;
  if (process.env.DATABASE_SSL === "true") return true;
  if (/sslmode=disable/i.test(url)) return false;
  return !isLocalDatabaseUrl(url);
}

export function buildPgPoolConfig(databaseUrl: string): PoolConfig {
  const connectionString = normalizeDatabaseUrl(databaseUrl);
  const config: PoolConfig = { connectionString };

  if (shouldUseSsl(connectionString)) {
    config.ssl = { rejectUnauthorized: false };
  }

  return config;
}

export function createPrismaPgAdapter(databaseUrl: string): PrismaPg {
  return new PrismaPg(new Pool(buildPgPoolConfig(databaseUrl)));
}
