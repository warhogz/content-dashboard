import { getMockData } from "@/lib/mock-data";
import { getPlanMetadataCatalogs } from "@/lib/supabase/plan-catalogs";
import { plannerDayOrder, plannerWeekOrder, weekRangeLabel } from "@/lib/plan/dates";
import { calculatePlanWeekScore, type PlanScoreResult } from "@/lib/plan/score";
import { createSupabaseServerClient, hasSupabase } from "@/lib/supabase/server";
import { CardTypeRow, ContentCard, PlanEntryRole, PlannedDay, PlannedWeek, PlanEntryRow, PlanMetadataCatalogs, PlanWeekRow, ProjectKey, StatusRow } from "@/lib/types";

type PlannerCardRelation = {
  id: string;
  title: string;
  slug?: string;
  color?: string;
} | null;

export type PlannerLibraryCard = Pick<
  ContentCard,
  | "id"
  | "title"
  | "subtitle"
  | "project_key"
  | "type_id"
  | "status_id"
  | "link"
  | "thumbnail_url"
  | "aspect_ratio"
  | "height_px"
  | "crop_mode"
  | "is_archived"
  | "archived_at"
  | "project_name"
  | "room_zone"
  | "content_category"
  | "ready_for_plan"
  | "created_at"
> & {
  status: PlannerCardRelation;
  type: PlannerCardRelation;
};

export type PlannerResolvedEntry = PlanEntryRow & {
  card: PlannerLibraryCard | null;
};

export type PlannerWeekSummary = PlanWeekRow & {
  rangeLabel: string;
  entries: PlannerResolvedEntry[];
  mainCards: PlannerLibraryCard[];
  score: PlanScoreResult;
  postsCount: number;
  categorySummary: string;
};

const PLANNER_CARD_SELECT = [
  "id",
  "title",
  "subtitle",
  "project_key",
  "type_id",
  "status_id",
  "link",
  "thumbnail_url",
  "aspect_ratio",
  "height_px",
  "crop_mode",
  "is_archived",
  "archived_at",
  "project_name",
  "room_zone",
  "content_category",
  "ready_for_plan",
  "created_at",
  "status:statuses!cards_status_id_fkey(id,title,slug,color)",
  "type:card_types(id,title,slug)"
].join(", ");

function normalizePlannerCard(card: Record<string, unknown>): PlannerLibraryCard {
  const statusValue = card.status as PlannerCardRelation | PlannerCardRelation[] | undefined;
  const typeValue = card.type as PlannerCardRelation | PlannerCardRelation[] | undefined;

  return {
    id: String(card.id || ""),
    title: String(card.title || ""),
    subtitle: typeof card.subtitle === "string" ? card.subtitle : null,
    project_key: ((card.project_key as ProjectKey) || "main") as ProjectKey,
    type_id: String(card.type_id || ""),
    status_id: String(card.status_id || ""),
    link: typeof card.link === "string" ? card.link : "",
    thumbnail_url: typeof card.thumbnail_url === "string" ? card.thumbnail_url : null,
    aspect_ratio: (card.aspect_ratio as ContentCard["aspect_ratio"]) || "custom",
    height_px: typeof card.height_px === "number" ? card.height_px : Number(card.height_px || 320),
    crop_mode: (card.crop_mode as ContentCard["crop_mode"]) || "cover",
    is_archived: Boolean(card.is_archived),
    archived_at: typeof card.archived_at === "string" ? card.archived_at : null,
    project_name: typeof card.project_name === "string" ? card.project_name : null,
    room_zone: typeof card.room_zone === "string" ? card.room_zone : null,
    content_category: typeof card.content_category === "string" ? card.content_category : null,
    ready_for_plan: Boolean(card.ready_for_plan),
    created_at: typeof card.created_at === "string" ? card.created_at : undefined,
    status: Array.isArray(statusValue) ? statusValue[0] || null : statusValue || null,
    type: Array.isArray(typeValue) ? typeValue[0] || null : typeValue || null
  };
}

function summarizeCategories(cards: PlannerLibraryCard[]) {
  const counts = new Map<string, number>();

  for (const card of cards) {
    const typeTitle = card.type?.title?.trim();
    if (!typeTitle) continue;
    counts.set(typeTitle, (counts.get(typeTitle) || 0) + 1);
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "en"))
    .map(([label, count]) => `${label} ${count}`)
    .join(" · ");
}

function normalizePlanWeekRow(row: Record<string, unknown>): PlanWeekRow {
  return {
    id: String(row.id || ""),
    project_key: ((row.project_key as ProjectKey) || "main") as ProjectKey,
    month_label: String(row.month_label || ""),
    month_sort_date: String(row.month_sort_date || ""),
    week_key: (row.week_key as PlannedWeek) || "week_1",
    created_at: typeof row.created_at === "string" ? row.created_at : undefined,
    updated_at: typeof row.updated_at === "string" ? row.updated_at : undefined
  };
}

function normalizePlanEntryRow(row: Record<string, unknown>): PlanEntryRow {
  return {
    id: String(row.id || ""),
    plan_week_id: String(row.plan_week_id || ""),
    card_id: String(row.card_id || ""),
    day_key: (row.day_key as PlannedDay) || "monday",
    role: (row.role as PlanEntryRole) || "main",
    position: typeof row.position === "number" ? row.position : Number(row.position || 0),
    created_at: typeof row.created_at === "string" ? row.created_at : undefined,
    updated_at: typeof row.updated_at === "string" ? row.updated_at : undefined
  };
}

export type AdminPlannerData = {
  cards: PlannerLibraryCard[];
  statuses: StatusRow[];
  types: CardTypeRow[];
  catalogs: PlanMetadataCatalogs;
  weeks: PlannerWeekSummary[];
};

export type PublicPlannerData = {
  weeks: PlannerWeekSummary[];
};

function buildWeekSummaries(weeks: PlanWeekRow[], entries: PlanEntryRow[], cardsMap: Map<string, PlannerLibraryCard>) {
  return weeks.map((week) => {
    const weekEntries = entries
      .filter((entry) => entry.plan_week_id === week.id)
      .sort((a, b) => {
        const dayA = plannerDayOrder.indexOf(a.day_key);
        const dayB = plannerDayOrder.indexOf(b.day_key);
        if (dayA !== dayB) return dayA - dayB;
        if (a.role !== b.role) return a.role === "main" ? -1 : 1;
        return a.position - b.position;
      })
      .map((entry) => ({
        ...entry,
        card: cardsMap.get(entry.card_id) || null
      }));

    const mainCards = plannerDayOrder
      .map((day) => weekEntries.find((entry) => entry.day_key === day && entry.role === "main")?.card || null)
      .filter((card): card is PlannerLibraryCard => Boolean(card));

    return {
      ...week,
      rangeLabel: weekRangeLabel(week.month_label, week.week_key),
      entries: weekEntries,
      mainCards,
      score: calculatePlanWeekScore(mainCards),
      postsCount: mainCards.length,
      categorySummary: summarizeCategories(mainCards)
    } satisfies PlannerWeekSummary;
  });
}

export async function getAdminPlannerData(): Promise<AdminPlannerData> {
  const fallback = getMockData();

  if (!hasSupabase()) {
    return { cards: [], statuses: fallback.statuses, types: fallback.types, catalogs: await getPlanMetadataCatalogs(), weeks: [] };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { cards: [], statuses: fallback.statuses, types: fallback.types, catalogs: await getPlanMetadataCatalogs(), weeks: [] };
  }

  const [statusesResult, typesResult, weeksResult, entriesResult, catalogs] = await Promise.all([
    supabase.from("statuses").select("*").order("sort_order"),
    supabase.from("card_types").select("*").order("sort_order"),
    supabase.from("plan_weeks").select("*").order("month_sort_date", { ascending: false }).order("week_key"),
    supabase.from("plan_entries").select("id, plan_week_id, card_id, day_key, role, position, created_at, updated_at").order("created_at"),
    getPlanMetadataCatalogs()
  ]);

  const normalizedWeeks = (weeksResult.data ?? []).map((row) => normalizePlanWeekRow(row as Record<string, unknown>));
  const normalizedEntries = (entriesResult.data ?? []).map((row) => normalizePlanEntryRow(row as Record<string, unknown>));
  const plannedCardIds = Array.from(new Set(normalizedEntries.map((entry) => entry.card_id).filter(Boolean)));

  const [libraryCardsResult, plannedCardsResult] = await Promise.all([
    supabase
      .from("cards")
      .select(PLANNER_CARD_SELECT)
      .or("is_archived.is.null,is_archived.eq.false")
      .order("created_at", { ascending: false }),
    plannedCardIds.length
      ? supabase.from("cards").select(PLANNER_CARD_SELECT).in("id", plannedCardIds)
      : Promise.resolve({ data: [], error: null })
  ]);

  const allCards = [...(libraryCardsResult.data ?? []), ...(plannedCardsResult.data ?? [])].map((card) =>
    normalizePlannerCard(card as unknown as Record<string, unknown>)
  );

  const cardsMap = new Map<string, PlannerLibraryCard>();
  for (const card of allCards) {
    cardsMap.set(card.id, card);
  }

  const uniqueCards = Array.from(cardsMap.values()).sort((a, b) => (a.created_at || "") < (b.created_at || "") ? 1 : -1);

  const weeks = buildWeekSummaries(normalizedWeeks, normalizedEntries, cardsMap);

  return {
    cards: uniqueCards,
    statuses: (statusesResult.data as StatusRow[] | null) ?? fallback.statuses,
    types: (typesResult.data as CardTypeRow[] | null) ?? fallback.types,
    catalogs,
    weeks
  };
}

export async function getPublicPlannerData(): Promise<PublicPlannerData> {
  if (!hasSupabase()) {
    return { weeks: [] };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { weeks: [] };
  }

  const [weeksResult, entriesResult] = await Promise.all([
    supabase.from("plan_weeks").select("*").order("month_sort_date", { ascending: true }).order("week_key"),
    supabase.from("plan_entries").select("id, plan_week_id, card_id, day_key, role, position, created_at, updated_at").order("created_at")
  ]);

  const normalizedWeeks = (weeksResult.data ?? []).map((row) => normalizePlanWeekRow(row as Record<string, unknown>));
  const normalizedEntries = (entriesResult.data ?? []).map((row) => normalizePlanEntryRow(row as Record<string, unknown>));
  const plannedCardIds = Array.from(new Set(normalizedEntries.map((entry) => entry.card_id).filter(Boolean)));

  if (!plannedCardIds.length || !normalizedWeeks.length) {
    return { weeks: [] };
  }

  const cardsResult = await supabase.from("cards").select(PLANNER_CARD_SELECT).in("id", plannedCardIds);
  const cardsMap = new Map<string, PlannerLibraryCard>();

  for (const card of cardsResult.data ?? []) {
    const normalized = normalizePlannerCard(card as unknown as Record<string, unknown>);
    cardsMap.set(normalized.id, normalized);
  }

  return {
    weeks: buildWeekSummaries(normalizedWeeks, normalizedEntries, cardsMap)
  };
}
