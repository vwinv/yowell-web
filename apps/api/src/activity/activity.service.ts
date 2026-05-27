import { Injectable } from "@nestjs/common";
import type { ActivityLogEntry, ActivityOverview } from "@yowell/shared";

import type { AuthUser } from "../auth/auth-user";
import { mapActivityLogEntry, toPrismaUserRole } from "../prisma/prisma.mappers";
import { PrismaService } from "../prisma/prisma.service";

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
export class ActivityService {
  constructor(private readonly prisma: PrismaService) {}

  async log(input: LogActivityInput): Promise<ActivityLogEntry> {
    const entry = await this.prisma.activityLog.create({
      data: {
        userId: input.user.id,
        userName: input.user.name,
        userEmail: input.user.email,
        action: input.action,
        summary: input.summary,
        method: input.method,
        path: input.path,
      },
    });

    return mapActivityLogEntry(entry);
  }

  async getOverview(
    viewer: AuthUser,
    limit = 150,
  ): Promise<ActivityOverview> {
    const entries = await this.prisma.activityLog.findMany({
      orderBy: { createdAt: "desc" },
    });

    const byRole =
      viewer.role === "admin"
        ? entries
        : entries.filter((entry) => entry.userId === viewer.id);

    const filtered = byRole.filter((entry) =>
      isTrackedActivity(entry.method, entry.path),
    );

    return {
      entries: filtered.slice(0, limit).map(mapActivityLogEntry),
      total: filtered.length,
    };
  }
}
