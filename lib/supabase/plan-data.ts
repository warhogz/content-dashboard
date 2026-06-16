import { createSupabaseServerClient, hasSupabase } from "@/lib/supabase/server";
import { ContentCard, PlannedDay, PlannedWeek } from "@/lib/types";

export type PlanCard = Pick<
  ContentCard,
  | "id"
  | "title"
  | "subtitle"
  | "link"
  | "thumbnail_url"
  | "project_name"
  | "room_zone"
  | "content_category"
  | "ready_for_plan"
  | "planned_month"
  | "planned_week"
  | "planned_day"
  | "is_main_pick"
  | "alternative_for"
  | "plan_priority"
  | "created_at"
>;

const PLAN_CARD_SELECT = [
  "id",
  "title",
  "subtitle",
  "link",
  "thumbnail_url",
  "project_name",
  "room_zone",
  "content_category",
  "ready_for_plan",
  "planned_month",
  "planned_week",
  "planned_day",
  "is_main_pick",
  "alternative_for",
  "plan_priority",
  "created_at"
].join(", ");

function normalizePlanCards(cards: PlanCard[] | null | undefined) {
  if (!cards) return [];

  return cards.map((card) => ({
    ...card,
    project_name: card.project_name?.trim() || null,
    room_zone: card.room_zone?.trim() || null,
    content_category: card.content_category?.trim() || null,
    ready_for_plan: Boolean(card.ready_for_plan),
    planned_month: card.planned_month?.trim() || null,
    planned_week: (card.planned_week || null) as PlannedWeek | null,
    planned_day: (card.planned_day || null) as PlannedDay | null,
    is_main_pick: Boolean(card.is_main_pick),
    alternative_for: card.alternative_for || null,
    plan_priority: typeof card.plan_priority === "number" ? card.plan_priority : card.plan_priority ? Number(card.plan_priority) : null
  }));
}

export async function getPlanCardsData() {
  if (!hasSupabase()) {
    return { cards: [] as PlanCard[] };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { cards: [] as PlanCard[] };
  }

  const { data, error } = await supabase
    .from("cards")
    .select(PLAN_CARD_SELECT)
    .eq("ready_for_plan", true)
    .eq("is_archived", false)
    .not("planned_month", "is", null)
    .not("planned_week", "is", null)
    .not("planned_day", "is", null)
    .order("planned_month")
    .order("planned_week")
    .order("planned_day")
    .order("is_main_pick", { ascending: false })
    .order("plan_priority", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Supabase query failed for plan-cards", error);
    return { cards: [] as PlanCard[] };
  }

  return {
    cards: normalizePlanCards(data as unknown as PlanCard[])
  };
}
