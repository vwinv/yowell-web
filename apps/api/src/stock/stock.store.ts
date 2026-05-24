import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import type { JuiceProduct, ProductionRecord } from "@yowell/shared";

export type StockData = {
  products: JuiceProduct[];
  productions: ProductionRecord[];
};

const DATA_DIR = join(process.cwd(), "data");
const DATA_FILE = join(DATA_DIR, "stock.json");

const emptyData = (): StockData => ({
  products: [],
  productions: [],
});

export class StockStore {
  private data: StockData = emptyData();

  load(): StockData {
    if (!existsSync(DATA_FILE)) {
      mkdirSync(DATA_DIR, { recursive: true });
      this.data = emptyData();
      this.save();
      return this.data;
    }

    const raw = readFileSync(DATA_FILE, "utf-8");
    this.data = JSON.parse(raw) as StockData;
    return this.data;
  }

  save(): void {
    mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(DATA_FILE, JSON.stringify(this.data, null, 2), "utf-8");
  }

  getData(): StockData {
    return this.data;
  }

  setData(data: StockData): void {
    this.data = data;
    this.save();
  }
}
