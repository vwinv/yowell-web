import type {
  StatsDayPoint,
  StatsEvolutionGranularity,
  StatsPeriodPreset,
} from "@yowell/shared";

type DayTotals = { revenue: number; expenses: number };

function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y!, m! - 1, d);
}

function formatIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function weekStartKey(date: string): string {
  const d = parseLocalDate(date);
  const weekday = d.getDay();
  const diff = weekday === 0 ? -6 : 1 - weekday;
  d.setDate(d.getDate() + diff);
  return formatIsoDate(d);
}

function formatDayLabel(date: string): string {
  return parseLocalDate(date).toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function formatWeekLabel(weekStart: string): string {
  const start = parseLocalDate(weekStart);
  const end = parseLocalDate(weekStart);
  end.setDate(end.getDate() + 6);
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  const from = start.toLocaleDateString("fr-FR", opts);
  const to = end.toLocaleDateString("fr-FR", opts);
  return `${from} – ${to}`;
}

function formatMonthLabel(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  return new Date(y!, m! - 1, 1).toLocaleDateString("fr-FR", {
    month: "short",
    year: "numeric",
  });
}

export function resolveEvolutionGranularity(
  preset: StatsPeriodPreset,
  dayCount: number,
): StatsEvolutionGranularity {
  if (preset === "week" || preset === "today") return "day";
  if (preset === "month") return "week";
  if (preset === "year") return "month";
  if (dayCount <= 14) return "day";
  if (dayCount <= 92) return "week";
  return "month";
}

export function buildEvolutionPoints(
  dayMap: Map<string, DayTotals>,
  preset: StatsPeriodPreset,
): { granularity: StatsEvolutionGranularity; points: StatsDayPoint[] } {
  const sortedDays = [...dayMap.entries()].sort(([a], [b]) => a.localeCompare(b));
  const granularity = resolveEvolutionGranularity(preset, sortedDays.length);

  if (granularity === "day") {
    return {
      granularity,
      points: sortedDays.map(([date, totals]) => ({
        date,
        label: formatDayLabel(date),
        revenue: totals.revenue,
        expenses: totals.expenses,
        profit: totals.revenue - totals.expenses,
      })),
    };
  }

  const buckets = new Map<string, DayTotals>();

  for (const [date, totals] of sortedDays) {
    const key =
      granularity === "week" ? weekStartKey(date) : date.slice(0, 7);
    const bucket = buckets.get(key) ?? { revenue: 0, expenses: 0 };
    bucket.revenue += totals.revenue;
    bucket.expenses += totals.expenses;
    buckets.set(key, bucket);
  }

  const points: StatsDayPoint[] = [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, totals]) => ({
      date: key,
      label:
        granularity === "week" ? formatWeekLabel(key) : formatMonthLabel(key),
      revenue: totals.revenue,
      expenses: totals.expenses,
      profit: totals.revenue - totals.expenses,
    }));

  return { granularity, points };
}

export function evolutionGranularityLabel(
  granularity: StatsEvolutionGranularity,
): string {
  switch (granularity) {
    case "week":
      return "par semaine";
    case "month":
      return "par mois";
    default:
      return "par jour";
  }
}
