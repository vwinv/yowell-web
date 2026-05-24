import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { DEFAULT_CAISSE_AMOUNT, type ManualAccountingEntry } from "@yowell/shared";

export type AccountingData = {
  manualEntries: ManualAccountingEntry[];
  caisse: number;
};

const DATA_DIR = join(process.cwd(), "data");
const DATA_FILE = join(DATA_DIR, "accounting.json");

const emptyData = (): AccountingData => ({
  manualEntries: [],
  caisse: DEFAULT_CAISSE_AMOUNT,
});

export class AccountingStore {
  private data: AccountingData = emptyData();

  load(): AccountingData {
    if (!existsSync(DATA_FILE)) {
      mkdirSync(DATA_DIR, { recursive: true });
      this.data = emptyData();
      this.save();
      return this.data;
    }
    this.data = JSON.parse(readFileSync(DATA_FILE, "utf-8")) as AccountingData;
    if (!Array.isArray(this.data.manualEntries)) {
      this.data.manualEntries = [];
    }
    if (typeof this.data.caisse !== "number" || this.data.caisse < 0) {
      this.data.caisse = DEFAULT_CAISSE_AMOUNT;
      this.save();
    }
    return this.data;
  }

  save(): void {
    mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(DATA_FILE, JSON.stringify(this.data, null, 2), "utf-8");
  }

  getData(): AccountingData {
    return this.data;
  }

  setData(data: AccountingData): void {
    this.data = data;
    this.save();
  }
}
