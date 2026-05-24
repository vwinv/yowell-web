import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import type { UserRole } from "@yowell/shared";

export type UserRecord = {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: UserRole;
  active: boolean;
  createdAt: string;
};

export type UsersData = {
  users: UserRecord[];
};

const DATA_DIR = join(process.cwd(), "data");
const DATA_FILE = join(DATA_DIR, "users.json");

const emptyData = (): UsersData => ({ users: [] });

export class UsersStore {
  private data: UsersData = emptyData();

  load(): UsersData {
    if (!existsSync(DATA_FILE)) {
      mkdirSync(DATA_DIR, { recursive: true });
      this.data = emptyData();
      this.save();
      return this.data;
    }
    this.data = JSON.parse(readFileSync(DATA_FILE, "utf-8")) as UsersData;
    if (!Array.isArray(this.data.users)) {
      this.data.users = [];
    }
    return this.data;
  }

  save(): void {
    mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(DATA_FILE, JSON.stringify(this.data, null, 2), "utf-8");
  }

  getData(): UsersData {
    return this.data;
  }

  setData(data: UsersData): void {
    this.data = data;
    this.save();
  }
}
