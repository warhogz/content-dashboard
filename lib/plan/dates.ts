import { PlannedDay, PlannedWeek } from "@/lib/types";

const monthMap: Record<string, number> = {
  january: 0,
  february: 1,
  march: 2,
  april: 3,
  may: 4,
  june: 5,
  july: 6,
  august: 7,
  september: 8,
  october: 9,
  november: 10,
  december: 11
};

export const plannerWeekOrder: PlannedWeek[] = ["week_1", "week_2", "week_3", "week_4", "week_5"];
export const plannerDayOrder: PlannedDay[] = ["monday", "tuesday", "wednesday", "thursday"];

export function parseMonthLabelToDate(monthLabel: string | null | undefined) {
  if (!monthLabel) return null;

  const [monthName, yearText] = monthLabel.trim().split(/\s+/);
  const monthIndex = monthMap[monthName?.toLowerCase() || ""];
  const year = Number(yearText);

  if (monthIndex == null || !Number.isFinite(year)) return null;
  return new Date(year, monthIndex, 1);
}

export function monthLabelToSortDate(monthLabel: string | null | undefined) {
  const date = parseMonthLabelToDate(monthLabel);
  if (!date) return null;

  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

const weekIndex: Record<PlannedWeek, number> = {
  week_1: 0,
  week_2: 1,
  week_3: 2,
  week_4: 3,
  week_5: 4
};

// Week N of a month starts on the N-th Monday of that month, so every
// Monday–Thursday slot maps to a real calendar day and no two months overlap.
// Thursday of the last week may spill into the next month (e.g. Mon 29 → Thu 2).
export function planWeekMonday(monthLabel: string | null | undefined, weekKey: PlannedWeek) {
  const monthStart = parseMonthLabelToDate(monthLabel);
  if (!monthStart) return null;

  const firstMondayOffset = (8 - monthStart.getDay()) % 7;
  return new Date(monthStart.getFullYear(), monthStart.getMonth(), 1 + firstMondayOffset + weekIndex[weekKey] * 7);
}

// Week 5 only exists in months that have five Mondays.
export function isPlanWeekInMonth(monthLabel: string | null | undefined, weekKey: PlannedWeek) {
  const monthStart = parseMonthLabelToDate(monthLabel);
  const monday = planWeekMonday(monthLabel, weekKey);
  if (!monthStart || !monday) return true;
  return monday.getMonth() === monthStart.getMonth();
}

export function plannedDayDate(monthLabel: string, weekKey: PlannedWeek, dayKey: PlannedDay) {
  const monday = planWeekMonday(monthLabel, weekKey);
  if (!monday) return null;

  return new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + plannerDayOrder.indexOf(dayKey));
}

function monthDayEn(date: Date) {
  return `${date.toLocaleDateString("en-US", { month: "short" })} ${date.getDate()}`;
}

export function weekRangeLabel(monthLabel: string, weekKey: PlannedWeek) {
  const start = plannedDayDate(monthLabel, weekKey, "monday");
  const end = plannedDayDate(monthLabel, weekKey, "thursday");
  if (!start || !end) return "Monday - Thursday";

  return `${monthDayEn(start)} - ${monthDayEn(end)}`;
}

export function dayHeading(monthLabel: string, weekKey: PlannedWeek, dayKey: PlannedDay) {
  const date = plannedDayDate(monthLabel, weekKey, dayKey);
  return date ? `${dayKey.toUpperCase()} · ${monthDayEn(date)}` : dayKey.toUpperCase();
}
export function plannedDayIso(monthLabel: string, weekKey: PlannedWeek, dayKey: PlannedDay) {
  const date = plannedDayDate(monthLabel, weekKey, dayKey);
  if (!date) return null;

  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function formatPlannedDateRuShort(value: string | null | undefined) {
  if (!value) return null;

  const [yearText, monthText, dayText] = value.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return value;
  }

  return new Date(year, month - 1, day).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short"
  });
}

function localTodayIso() {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isPlannedDateActive(value: string | null | undefined) {
  if (!value) return false;
  return value >= localTodayIso();
}
