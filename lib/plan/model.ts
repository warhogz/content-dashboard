import { PlannedDay, PlannedWeek } from "@/lib/types";
import { PlanCard } from "@/lib/supabase/plan-data";

const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
] as const;

export const planDayOrder: PlannedDay[] = ["monday", "tuesday", "wednesday", "thursday"];
export const planWeekOrder: PlannedWeek[] = ["week_1", "week_2", "week_3", "week_4", "week_5"];

export type PlanDayEntry = {
  day: PlannedDay;
  primary: PlanCard | null;
  alternatives: PlanCard[];
};

export type PlanWeekSummary = {
  week: PlannedWeek;
  label: string;
  rangeLabel: string;
  selectedCount: number;
  projectSummary: string;
  roomSummary: string;
  categorySummary: string;
  entries: PlanDayEntry[];
};

export type PlanMonthSummary = {
  label: string;
  timestamp: number;
  weeks: PlanWeekSummary[];
};

function normalizeCountLabel(items: Map<string, number>) {
  return Array.from(items.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "en"))
    .map(([label, count]) => `${label} ${count}`)
    .join(" · ");
}

function sortCards(cards: PlanCard[]) {
  return [...cards].sort((a, b) => {
    if (Boolean(a.is_main_pick) !== Boolean(b.is_main_pick)) {
      return Number(Boolean(b.is_main_pick)) - Number(Boolean(a.is_main_pick));
    }

    const aPriority = typeof a.plan_priority === "number" ? a.plan_priority : -1;
    const bPriority = typeof b.plan_priority === "number" ? b.plan_priority : -1;
    if (aPriority !== bPriority) {
      return bPriority - aPriority;
    }

    const aHasAlternativeLink = Boolean(a.alternative_for);
    const bHasAlternativeLink = Boolean(b.alternative_for);
    if (aHasAlternativeLink !== bHasAlternativeLink) {
      return Number(aHasAlternativeLink) - Number(bHasAlternativeLink);
    }

    return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
  });
}

function parseMonthLabel(label: string | null | undefined) {
  if (!label) return null;

  const [monthName, yearText] = label.trim().split(/\s+/);
  const monthIndex = monthNames.findIndex((month) => month.toLowerCase() === monthName?.toLowerCase());
  const year = Number(yearText);

  if (monthIndex < 0 || !Number.isFinite(year)) return null;

  return new Date(year, monthIndex, 1);
}

function buildRangeLabel(label: string, week: PlannedWeek) {
  const date = parseMonthLabel(label);
  if (!date) return "Monday - Thursday";

  const monthShort = date.toLocaleDateString("en-US", { month: "short" });
  const baseDay = {
    week_1: 1,
    week_2: 8,
    week_3: 15,
    week_4: 22,
    week_5: 29
  }[week];

  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const endDay = Math.min(baseDay + 3, lastDay);

  return `${monthShort} ${baseDay} - ${monthShort} ${endDay}`;
}

function summarizeCards(cards: PlanCard[], key: "project_name" | "room_zone" | "content_category") {
  const counts = new Map<string, number>();

  for (const card of cards) {
    const value = card[key]?.trim();
    if (!value) continue;
    counts.set(value, (counts.get(value) || 0) + 1);
  }

  return normalizeCountLabel(counts);
}

export function buildPlanMonths(cards: PlanCard[]) {
  const grouped = new Map<string, PlanCard[]>();

  for (const card of cards) {
    if (!card.planned_month || !card.planned_week || !card.planned_day) continue;
    const bucket = grouped.get(card.planned_month) || [];
    bucket.push(card);
    grouped.set(card.planned_month, bucket);
  }

  return Array.from(grouped.entries())
    .map(([label, monthCards]): PlanMonthSummary => {
      const timestamp = parseMonthLabel(label)?.getTime() ?? Number.MAX_SAFE_INTEGER;

      const weeks = planWeekOrder.map((week) => {
        const weekCards = monthCards.filter((card) => card.planned_week === week);
        const entries = planDayOrder.map((day) => {
          const dayCards = sortCards(weekCards.filter((card) => card.planned_day === day));
          const [primary = null, ...alternatives] = dayCards;

          return {
            day,
            primary,
            alternatives
          };
        });

        const visibleCards = entries.map((entry) => entry.primary).filter((card): card is PlanCard => Boolean(card));

        return {
          week,
          label: week.replace("week_", "Week "),
          rangeLabel: buildRangeLabel(label, week),
          selectedCount: visibleCards.length,
          projectSummary: summarizeCards(visibleCards, "project_name"),
          roomSummary: summarizeCards(visibleCards, "room_zone"),
          categorySummary: summarizeCards(visibleCards, "content_category"),
          entries
        };
      });

      return {
        label,
        timestamp,
        weeks
      };
    })
    .sort((a, b) => a.timestamp - b.timestamp);
}
