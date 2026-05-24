import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import type { Client } from "@yowell/shared";

export type ClientsData = {
  clients: Client[];
};

const DATA_DIR = join(process.cwd(), "data");
const DATA_FILE = join(DATA_DIR, "clients.json");

const emptyData = (): ClientsData => ({ clients: [] });

export class ClientsStore {
  private data: ClientsData = emptyData();

  load(): ClientsData {
    if (!existsSync(DATA_FILE)) {
      mkdirSync(DATA_DIR, { recursive: true });
      this.data = emptyData();
      this.save();
      return this.data;
    }
    this.data = JSON.parse(readFileSync(DATA_FILE, "utf-8")) as ClientsData;
    return this.data;
  }

  save(): void {
    mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(DATA_FILE, JSON.stringify(this.data, null, 2), "utf-8");
  }

  getData(): ClientsData {
    return this.data;
  }

  setData(data: ClientsData): void {
    this.data = data;
    this.save();
  }
}
