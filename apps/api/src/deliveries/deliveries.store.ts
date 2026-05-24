import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import type { DeliveryRun } from "@yowell/shared";

export type DeliveriesData = {
  runs: DeliveryRun[];
};

const DATA_DIR = join(process.cwd(), "data");
const DATA_FILE = join(DATA_DIR, "deliveries.json");

const emptyData = (): DeliveriesData => ({ runs: [] });

export class DeliveriesStore {
  private data: DeliveriesData = emptyData();

  load(): DeliveriesData {
    if (!existsSync(DATA_FILE)) {
      mkdirSync(DATA_DIR, { recursive: true });
      this.data = emptyData();
      this.save();
      return this.data;
    }
    this.data = JSON.parse(readFileSync(DATA_FILE, "utf-8")) as DeliveriesData;
    return this.data;
  }

  save(): void {
    mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(DATA_FILE, JSON.stringify(this.data, null, 2), "utf-8");
  }

  getData(): DeliveriesData {
    return this.data;
  }

  setData(data: DeliveriesData): void {
    this.data = data;
    this.save();
  }
}
