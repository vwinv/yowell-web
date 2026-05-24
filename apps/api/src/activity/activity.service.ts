import { Injectable, OnModuleInit } from "@nestjs/common";
import type { ActivityLogEntry, ActivityOverview } from "@yowell/shared";
import { randomUUID } from "node:crypto";

import type { AuthUser } from "../auth/auth-user";
import { ActivityStore } from "./activity.store";

const TRACKED_PREFIXES = [
  "/api/sales",
  "/api/stock",
  "/api/accounting",
  "/api/deliveries",
] as const;

const MUTATION_METHODS = new Set(["POST", "PATCH", "PUT", "DELETE"]);

/** Ventes, stock, comptabilité, courses — pas les consultations (GET overview, listes, etc.). */
export function isTrackedActivity(method: string, path: string): boolean {
  const base = path.split("?")[0] ?? path;
  const upper = method.toUpperCase();

  if (!TRACKED_PREFIXES.some((prefix) => base.startsWith(prefix))) {
    return false;
  }

  if (
    upper === "GET" &&
    base.startsWith("/api/sales/") &&
    base.includes("/invoice")
  ) {
    return true;
  }

  return MUTATION_METHODS.has(upper);
}

export type LogActivityInput = {
  user: AuthUser;
  action: string;
  summary: string;
  method: string;
  path: string;
};

@Injectable()
export class ActivityService implements OnModuleInit {
  private readonly store = new ActivityStore();

  onModuleInit() {
    this.store.load();
  }

  log(input: LogActivityInput): ActivityLogEntry {
    const entry: ActivityLogEntry = {
      id: randomUUID(),
      userId: input.user.id,
      userName: input.user.name,
      userEmail: input.user.email,
      action: input.action,
      summary: input.summary,
      method: input.method,
      path: input.path,
      createdAt: new Date().toISOString(),
    };

    const data = this.store.getData();
    data.entries.unshift(entry);
    this.store.setData(data);
    return entry;
  }

  getOverview(
    viewer: AuthUser,
    limit = 150,
  ): ActivityOverview {
    const { entries } = this.store.getData();
    const byRole =
      viewer.role === "admin"
        ? entries
        : entries.filter((e) => e.userId === viewer.id);

    const filtered = byRole.filter((e) =>
      isTrackedActivity(e.method, e.path),
    );

    return {
      entries: filtered.slice(0, limit),
      total: filtered.length,
    };
  }
}
