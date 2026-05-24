import { BadRequestException } from "@nestjs/common";
import type { StatsPeriod, StatsPeriodPreset } from "@yowell/shared";

export type StatsPeriodInput = {
  preset?: string;
  from?: string;
  to?: string;
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function monthStart(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

function formatPeriodLabel(from: string, to: string): string {
  const opts: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "long",
    year: "numeric",
  };
  const fromLabel = new Date(from).toLocaleDateString("fr-FR", opts);
  const toLabel = new Date(to).toLocaleDateString("fr-FR", opts);
  if (from === to) return fromLabel;
  return `Du ${fromLabel} au ${toLabel}`;
}

export function resolveStatsPeriod(input: StatsPeriodInput): StatsPeriod {
  const preset = (input.preset ?? "month") as StatsPeriodPreset;
  const today = todayIso();
  const now = new Date();

  if (preset === "custom") {
    const from = input.from?.slice(0, 10);
    const to = input.to?.slice(0, 10);
    if (!from || !to) {
      throw new BadRequestException(
        "Indique une date de début et une date de fin.",
      );
    }
    if (from > to) {
      throw new BadRequestException(
        "La date de début doit être avant la date de fin.",
      );
    }
    return {
      preset: "custom",
      from,
      to,
      label: formatPeriodLabel(from, to),
    };
  }

  if (preset === "today") {
    return {
      preset: "today",
      from: today,
      to: today,
      label: "Aujourd'hui",
    };
  }

  if (preset === "week") {
    const start = new Date(now);
    start.setDate(start.getDate() - 6);
    const from = start.toISOString().slice(0, 10);
    return {
      preset: "week",
      from,
      to: today,
      label: "7 derniers jours",
    };
  }

  if (preset === "year") {
    const from = `${now.getFullYear()}-01-01`;
    return {
      preset: "year",
      from,
      to: today,
      label: `Année ${now.getFullYear()}`,
    };
  }

  const from = monthStart(now);
  return {
    preset: "month",
    from,
    to: today,
    label: "Ce mois",
  };
}

export function eachDayInPeriod(from: string, to: string): string[] {
  const days: string[] = [];
  const cursor = new Date(from);
  const end = new Date(to);
  while (cursor <= end) {
    days.push(cursor.toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}
