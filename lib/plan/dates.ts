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

export function weekRangeLabel(monthLabel: string, weekKey: PlannedWeek) {
  const date = parseMonthLabelToDate(monthLabel);
  if (!date) return "Monday - Thursday";

  const monthShort = date.toLocaleDateString("en-US", { month: "short" });
  const startDay = {
    week_1: 1,
    week_2: 8,
    week_3: 15,
    week_4: 22,
    week_5: 29
  }[weekKey];
  const endDay = Math.min(startDay + 3, new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate());

  return `${monthShort} ${startDay} - ${monthShort} ${endDay}`;
}

export function dayHeading(monthLabel: string, weekKey: PlannedWeek, dayKey: PlannedDay) {
  const date = parseMonthLabelToDate(monthLabel);
  const monthShort = date ? date.toLocaleDateString("en-US", { month: "short" }) : "Plan";
  const startDay = {
    week_1: 1,
    week_2: 8,
    week_3: 15,
    week_4: 22,
    week_5: 29
  }[weekKey];
  const numericDay = startDay + plannerDayOrder.indexOf(dayKey);

  return `${dayKey.toUpperCase()} · ${monthShort} ${numericDay}`;
}

export function plannedDayDate(monthLabel: string, weekKey: PlannedWeek, dayKey: PlannedDay) {
  const date = parseMonthLabelToDate(monthLabel);
  if (!date) return null;

  const startDay = {
    week_1: 1,
    week_2: 8,
    week_3: 15,
    week_4: 22,
    week_5: 29
  }[weekKey];
  const numericDay = startDay + plannerDayOrder.indexOf(dayKey);
  const lastDayOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();

  if (numericDay < 1 || numericDay > lastDayOfMonth) return null;

  return new Date(date.getFullYear(), date.getMonth(), numericDay);
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
