import { PlannedDay, PlannedWeek } from "@/lib/types";

export const PLAN_PROJECT_PRESETS = ["Avalon", "NOB\u00c9L", "Versal", "Somma"] as const;
export const PLAN_ROOM_PRESETS = ["Kitchen", "Bathroom", "Bedroom", "Living Room", "Founder", "Exterior", "Materials"] as const;
export const PLAN_CATEGORY_PRESETS = ["Carousel", "Trend Reel", "Talking Head", "Reels Overview"] as const;

export const PLAN_WEEK_OPTIONS: Array<{ value: PlannedWeek; label: string }> = [
  { value: "week_1", label: "Week 1" },
  { value: "week_2", label: "Week 2" },
  { value: "week_3", label: "Week 3" },
  { value: "week_4", label: "Week 4" },
  { value: "week_5", label: "Week 5" }
];

export const PLAN_DAY_OPTIONS: Array<{ value: PlannedDay; label: string }> = [
  { value: "monday", label: "Monday" },
  { value: "tuesday", label: "Tuesday" },
  { value: "wednesday", label: "Wednesday" },
  { value: "thursday", label: "Thursday" }
];

export function getPlannedMonthOptions(baseDate = new Date()) {
  return Array.from({ length: 12 }, (_, index) => {
    const date = new Date(baseDate.getFullYear(), baseDate.getMonth() + index, 1);
    return date.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric"
    });
  });
}
