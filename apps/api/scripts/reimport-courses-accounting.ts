/**
 * Réimporte courses + comptabilité depuis un backup.sql (ancien schéma)
 * vers la base cible, en s'adaptant au schéma réellement présent.
 *
 * Usage :
 *   BACKUP_SQL=./backup.sql DATABASE_URL="postgresql://...?sslmode=require" \
 *     npm run reimport:missing
 *
 * Recommandé avant réimport si la prod est en retard :
 *   npx prisma migrate deploy
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Pool } from "pg";

import { buildPgPoolConfig } from "../src/prisma/pg-connection";

type CopyBlock = {
  table: string;
  columns: string[];
  rows: string[][];
};

type TargetSchema = {
  deliveryRunPaymentChannel: boolean;
  deliveryItemPaymentChannel: boolean;
  deliveryFeePaymentChannel: boolean;
  manualPaymentChannel: boolean;
  manualUpdatedAt: boolean;
};

function unescapeCopyValue(value: string): string | null {
  if (value === "\\N") return null;
  return value
    .replace(/\\t/g, "\t")
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\\\/g, "\\");
}

function parseCopyBlocks(sql: string): Map<string, CopyBlock> {
  const blocks = new Map<string, CopyBlock>();
  const pattern =
    /COPY\s+(?:public\.)?"([^"]+)"\s*\(([^)]+)\)\s+FROM\s+stdin;\r?\n([\s\S]*?)\r?\n\\\./g;

  for (const match of sql.matchAll(pattern)) {
    const table = match[1];
    const columns = match[2]
      .split(",")
      .map((column) => column.trim().replace(/^"|"$/g, ""));
    const body = match[3].trim();
    const rows = body
      ? body.split(/\r?\n/).map((line) => line.split("\t").map(unescapeCopyValue))
      : [];

    blocks.set(table, { table, columns, rows });
  }

  return blocks;
}

function rowToRecord(columns: string[], row: (string | null)[]): Record<string, string | null> {
  const record: Record<string, string | null> = {};
  for (let i = 0; i < columns.length; i += 1) {
    record[columns[i]] = row[i] ?? null;
  }
  return record;
}

async function loadTargetSchema(client: {
  query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }>;
}): Promise<TargetSchema> {
  const { rows } = await client.query(
    `SELECT table_name, column_name
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name IN (
         'DeliveryRun',
         'DeliveryRunItem',
         'DeliveryRunFee',
         'ManualAccountingEntry'
       )`,
  );

  const byTable = new Map<string, Set<string>>();
  for (const row of rows as { table_name: string; column_name: string }[]) {
    if (!byTable.has(row.table_name)) byTable.set(row.table_name, new Set());
    byTable.get(row.table_name)!.add(row.column_name);
  }

  const tableHas = (table: string, column: string) =>
    byTable.get(table)?.has(column) ?? false;

  return {
    deliveryRunPaymentChannel: tableHas("DeliveryRun", "paymentChannel"),
    deliveryItemPaymentChannel: tableHas("DeliveryRunItem", "paymentChannel"),
    deliveryFeePaymentChannel: tableHas("DeliveryRunFee", "paymentChannel"),
    manualPaymentChannel: tableHas("ManualAccountingEntry", "paymentChannel"),
    manualUpdatedAt: tableHas("ManualAccountingEntry", "updatedAt"),
  };
}

async function main() {
  const backupPath = resolve(process.env.BACKUP_SQL ?? "backup.sql");
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL est obligatoire.");
  }

  const sql = readFileSync(backupPath, "utf8");
  const blocks = parseCopyBlocks(sql);

  const required = [
    "AccountingState",
    "ManualAccountingEntry",
    "DeliveryRun",
    "DeliveryRunItem",
    "DeliveryRunFee",
  ];
  for (const table of required) {
    if (!blocks.has(table)) {
      console.warn(`⚠ Aucune donnée COPY trouvée pour ${table} dans ${backupPath}`);
    }
  }

  const pool = new Pool(buildPgPoolConfig(databaseUrl));
  const client = await pool.connect();

  try {
    const schema = await loadTargetSchema(client);
    console.log("Schéma cible détecté :", schema);

    await client.query("BEGIN");

    const runs = blocks.get("DeliveryRun");
    const runPaymentChannel = new Map<string, string>();
    if (runs) {
      for (const row of runs.rows) {
        const record = rowToRecord(runs.columns, row);
        if (record.id && record.paymentChannel) {
          runPaymentChannel.set(record.id, record.paymentChannel);
        }
      }
    }

    const accounting = blocks.get("AccountingState");
    if (accounting?.rows.length) {
      for (const row of accounting.rows) {
        const record = rowToRecord(accounting.columns, row);
        await client.query(
          `INSERT INTO "AccountingState" (id, caisse, om, wave, "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (id) DO UPDATE SET
             caisse = EXCLUDED.caisse,
             om = EXCLUDED.om,
             wave = EXCLUDED.wave,
             "updatedAt" = EXCLUDED."updatedAt"`,
          [
            record.id ?? "default",
            Number(record.caisse ?? 0),
            Number(record.om ?? 0),
            Number(record.wave ?? 0),
            record.createdAt ?? new Date().toISOString(),
            record.updatedAt ?? new Date().toISOString(),
          ],
        );
      }
      console.log(`✓ AccountingState : ${accounting.rows.length} ligne(s)`);
    }

    const manuals = blocks.get("ManualAccountingEntry");
    if (manuals?.rows.length) {
      for (const row of manuals.rows) {
        const record = rowToRecord(manuals.columns, row);
        const createdAt = record.createdAt ?? new Date().toISOString();
        const updatedAt = record.updatedAt ?? createdAt;

        if (schema.manualPaymentChannel && schema.manualUpdatedAt) {
          await client.query(
            `INSERT INTO "ManualAccountingEntry"
               (id, date, label, amount, type, "paymentChannel", "createdAt", "updatedAt")
             VALUES ($1, $2, $3, $4, $5::"AccountingEntryType", $6::"PaymentChannel", $7, $8)
             ON CONFLICT (id) DO UPDATE SET
               date = EXCLUDED.date,
               label = EXCLUDED.label,
               amount = EXCLUDED.amount,
               type = EXCLUDED.type,
               "paymentChannel" = EXCLUDED."paymentChannel",
               "updatedAt" = EXCLUDED."updatedAt"`,
            [
              record.id,
              record.date,
              record.label,
              Number(record.amount),
              record.type,
              record.paymentChannel ?? "CASH",
              createdAt,
              updatedAt,
            ],
          );
        } else if (schema.manualPaymentChannel) {
          await client.query(
            `INSERT INTO "ManualAccountingEntry"
               (id, date, label, amount, type, "paymentChannel", "createdAt")
             VALUES ($1, $2, $3, $4, $5::"AccountingEntryType", $6::"PaymentChannel", $7)
             ON CONFLICT (id) DO UPDATE SET
               date = EXCLUDED.date,
               label = EXCLUDED.label,
               amount = EXCLUDED.amount,
               type = EXCLUDED.type,
               "paymentChannel" = EXCLUDED."paymentChannel"`,
            [
              record.id,
              record.date,
              record.label,
              Number(record.amount),
              record.type,
              record.paymentChannel ?? "CASH",
              createdAt,
            ],
          );
        } else {
          await client.query(
            `INSERT INTO "ManualAccountingEntry"
               (id, date, label, amount, type, "createdAt")
             VALUES ($1, $2, $3, $4, $5::"AccountingEntryType", $6)
             ON CONFLICT (id) DO UPDATE SET
               date = EXCLUDED.date,
               label = EXCLUDED.label,
               amount = EXCLUDED.amount,
               type = EXCLUDED.type`,
            [
              record.id,
              record.date,
              record.label,
              Number(record.amount),
              record.type,
              createdAt,
            ],
          );
        }
      }
      console.log(`✓ ManualAccountingEntry : ${manuals.rows.length} ligne(s)`);
    }

    if (runs?.rows.length) {
      for (const row of runs.rows) {
        const record = rowToRecord(runs.columns, row);

        if (schema.deliveryRunPaymentChannel) {
          await client.query(
            `INSERT INTO "DeliveryRun"
               (id, date, "totalAmount", "paymentChannel", "createdAt", "updatedAt")
             VALUES ($1, $2, $3, $4::"PaymentChannel", $5, $6)
             ON CONFLICT (id) DO UPDATE SET
               date = EXCLUDED.date,
               "totalAmount" = EXCLUDED."totalAmount",
               "paymentChannel" = EXCLUDED."paymentChannel",
               "updatedAt" = EXCLUDED."updatedAt"`,
            [
              record.id,
              record.date,
              Number(record.totalAmount),
              record.paymentChannel ?? "CASH",
              record.createdAt,
              record.updatedAt,
            ],
          );
        } else {
          await client.query(
            `INSERT INTO "DeliveryRun" (id, date, "totalAmount", "createdAt", "updatedAt")
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (id) DO UPDATE SET
               date = EXCLUDED.date,
               "totalAmount" = EXCLUDED."totalAmount",
               "updatedAt" = EXCLUDED."updatedAt"`,
            [
              record.id,
              record.date,
              Number(record.totalAmount),
              record.createdAt,
              record.updatedAt,
            ],
          );
        }
      }
      console.log(`✓ DeliveryRun : ${runs.rows.length} ligne(s)`);
    }

    const items = blocks.get("DeliveryRunItem");
    if (items?.rows.length) {
      for (const row of items.rows) {
        const record = rowToRecord(items.columns, row);
        const runId = record.runId;
        const paymentChannel =
          record.paymentChannel ??
          (runId ? runPaymentChannel.get(runId) : null) ??
          "CASH";

        if (schema.deliveryItemPaymentChannel) {
          await client.query(
            `INSERT INTO "DeliveryRunItem"
               (id, "runId", label, quantity, "unitPrice", "lineTotal", "paymentChannel",
                "hasRemaining", "remainingNote", "initialRemainingStock", "createdAt", "updatedAt")
             VALUES ($1, $2, $3, $4, $5, $6, $7::"PaymentChannel", $8, $9, $10, $11, $12)
             ON CONFLICT (id) DO UPDATE SET
               "runId" = EXCLUDED."runId",
               label = EXCLUDED.label,
               quantity = EXCLUDED.quantity,
               "unitPrice" = EXCLUDED."unitPrice",
               "lineTotal" = EXCLUDED."lineTotal",
               "paymentChannel" = EXCLUDED."paymentChannel",
               "hasRemaining" = EXCLUDED."hasRemaining",
               "remainingNote" = EXCLUDED."remainingNote",
               "initialRemainingStock" = EXCLUDED."initialRemainingStock",
               "updatedAt" = EXCLUDED."updatedAt"`,
            [
              record.id,
              record.runId,
              record.label,
              Number(record.quantity),
              Number(record.unitPrice),
              Number(record.lineTotal),
              paymentChannel,
              record.hasRemaining === null ? null : record.hasRemaining === "t",
              record.remainingNote,
              record.initialRemainingStock === null
                ? null
                : Number(record.initialRemainingStock),
              record.createdAt,
              record.updatedAt,
            ],
          );
        } else {
          await client.query(
            `INSERT INTO "DeliveryRunItem"
               (id, "runId", label, quantity, "unitPrice", "lineTotal",
                "hasRemaining", "remainingNote", "initialRemainingStock", "createdAt", "updatedAt")
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
             ON CONFLICT (id) DO UPDATE SET
               "runId" = EXCLUDED."runId",
               label = EXCLUDED.label,
               quantity = EXCLUDED.quantity,
               "unitPrice" = EXCLUDED."unitPrice",
               "lineTotal" = EXCLUDED."lineTotal",
               "hasRemaining" = EXCLUDED."hasRemaining",
               "remainingNote" = EXCLUDED."remainingNote",
               "initialRemainingStock" = EXCLUDED."initialRemainingStock",
               "updatedAt" = EXCLUDED."updatedAt"`,
            [
              record.id,
              record.runId,
              record.label,
              Number(record.quantity),
              Number(record.unitPrice),
              Number(record.lineTotal),
              record.hasRemaining === null ? null : record.hasRemaining === "t",
              record.remainingNote,
              record.initialRemainingStock === null
                ? null
                : Number(record.initialRemainingStock),
              record.createdAt,
              record.updatedAt,
            ],
          );
        }
      }
      console.log(`✓ DeliveryRunItem : ${items.rows.length} ligne(s)`);
    }

    const fees = blocks.get("DeliveryRunFee");
    if (fees?.rows.length) {
      for (const row of fees.rows) {
        const record = rowToRecord(fees.columns, row);
        const runId = record.runId;
        const paymentChannel =
          record.paymentChannel ??
          (runId ? runPaymentChannel.get(runId) : null) ??
          "CASH";

        if (schema.deliveryFeePaymentChannel) {
          await client.query(
            `INSERT INTO "DeliveryRunFee"
               (id, "runId", label, amount, "paymentChannel", "createdAt", "updatedAt")
             VALUES ($1, $2, $3, $4, $5::"PaymentChannel", $6, $7)
             ON CONFLICT (id) DO UPDATE SET
               "runId" = EXCLUDED."runId",
               label = EXCLUDED.label,
               amount = EXCLUDED.amount,
               "paymentChannel" = EXCLUDED."paymentChannel",
               "updatedAt" = EXCLUDED."updatedAt"`,
            [
              record.id,
              record.runId,
              record.label,
              Number(record.amount),
              paymentChannel,
              record.createdAt,
              record.updatedAt,
            ],
          );
        } else {
          await client.query(
            `INSERT INTO "DeliveryRunFee"
               (id, "runId", label, amount, "createdAt", "updatedAt")
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (id) DO UPDATE SET
               "runId" = EXCLUDED."runId",
               label = EXCLUDED.label,
               amount = EXCLUDED.amount,
               "updatedAt" = EXCLUDED."updatedAt"`,
            [
              record.id,
              record.runId,
              record.label,
              Number(record.amount),
              record.createdAt,
              record.updatedAt,
            ],
          );
        }
      }
      console.log(`✓ DeliveryRunFee : ${fees.rows.length} ligne(s)`);
    }

    await client.query("COMMIT");
    console.log("\nRéimport terminé. Vérifie les pages Courses et Comptabilité.");
    if (!schema.manualPaymentChannel || !schema.deliveryItemPaymentChannel) {
      console.log(
        "\nℹ La base cible n'a pas toutes les migrations récentes.",
      );
      console.log("  Lance ensuite : npx prisma migrate deploy");
    }
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
