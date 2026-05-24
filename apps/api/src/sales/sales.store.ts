import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import type { Sale } from "@yowell/shared";

export type SalesData = {
  sales: Sale[];
};

const DATA_DIR = join(process.cwd(), "data");
const DATA_FILE = join(DATA_DIR, "sales.json");

const emptyData = (): SalesData => ({ sales: [] });

export class SalesStore {
  private data: SalesData = emptyData();

  load(): SalesData {
    if (!existsSync(DATA_FILE)) {
      mkdirSync(DATA_DIR, { recursive: true });
      this.data = emptyData();
      this.save();
      return this.data;
    }
    this.data = JSON.parse(readFileSync(DATA_FILE, "utf-8")) as SalesData;
    return this.data;
  }

  save(): void {
    mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(DATA_FILE, JSON.stringify(this.data, null, 2), "utf-8");
  }

  getData(): SalesData {
    return this.data;
  }

  setData(data: SalesData): void {
    this.data = data;
    this.save();
  }
}
