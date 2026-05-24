import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import type { ActivityLogEntry } from "@yowell/shared";

export type ActivityData = {
  entries: ActivityLogEntry[];
};

const DATA_DIR = join(process.cwd(), "data");
const DATA_FILE = join(DATA_DIR, "activity.json");
const MAX_ENTRIES = 5000;

const emptyData = (): ActivityData => ({ entries: [] });

export class ActivityStore {
  private data: ActivityData = emptyData();

  load(): ActivityData {
    if (!existsSync(DATA_FILE)) {
      mkdirSync(DATA_DIR, { recursive: true });
      this.data = emptyData();
      this.save();
      return this.data;
    }
    this.data = JSON.parse(readFileSync(DATA_FILE, "utf-8")) as ActivityData;
    if (!Array.isArray(this.data.entries)) {
      this.data.entries = [];
    }
    return this.data;
  }

  save(): void {
    mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(DATA_FILE, JSON.stringify(this.data, null, 2), "utf-8");
  }

  getData(): ActivityData {
    return this.data;
  }

  setData(data: ActivityData): void {
    if (data.entries.length > MAX_ENTRIES) {
      data.entries = data.entries.slice(0, MAX_ENTRIES);
    }
    this.data = data;
    this.save();
  }
}
