import { createSupabaseServerClient, hasSupabase } from "@/lib/supabase/server";
import { getPlanMetadataCatalogs } from "@/lib/supabase/plan-catalogs";
import { plannedDayIso } from "@/lib/plan/dates";
import { getMockData } from "@/lib/mock-data";
import {
  ARCHIVE_STATUS_SLUG,
  BloggerMaterialType,
  BloggerRow,
  BloggerStatusColor,
  CardTypeRow,
  ContentCard,
  PlanMetadataCatalogs,
  PlannedDay,
  PlannedWeek,
  ProjectKey,
  StatusRow
} from "@/lib/types";

const QUERY_TIMEOUT_MS = process.env.NODE_ENV === "development" ? 3500 : 8000;
const BASE_CARD_SELECT = [
  "id",
  "title",
  "project_key",
  "type_id",
  "status_id",
  "link",
  "thumbnail_url",
  "aspect_ratio",
  "height_px",
  "crop_mode",
  "sort_order",
  "is_hidden",
  "is_pinned",
  "is_archived",
  "archived_at",
  "archived_from_status_id",
  "subtitle",
  "notes",
  "created_at",
  "updated_at"
].join(", ");

type PlannerWeekLite = {
  id: string;
  month_label: string;
  week_key: PlannedWeek;
};

type PlannerEntryLite = {
  card_id: string;
  plan_week_id: string;
  day_key: PlannedDay;
  role: "main" | "alternative";
  position: number;
};

function formatQueryError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message
    };
  }

  if (error && typeof error === "object") {
    const maybeError = error as Record<string, unknown>;
    return {
      name: typeof maybeError.name === "string" ? maybeError.name : "UnknownError",
      message: typeof maybeError.message === "string" ? maybeError.message : JSON.stringify(maybeError)
    };
  }

  return {
    name: "UnknownError",
    message: String(error)
  };
}

async function safeQuery<T>(query: (signal: AbortSignal) => Promise<any>, label: string) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), QUERY_TIMEOUT_MS);

  try {
    const result = await query(controller.signal);
    if (result.error) {
      const formatted = formatQueryError(result.error);
      if (formatted.name === "AbortError") {
        console.warn(`Supabase query timed out for ${label}`);
        return null;
      }
      console.error(`Supabase query failed for ${label}`, formatted);
      return null;
    }
    return result.data as T;
  } catch (e) {
    const formatted = formatQueryError(e);
    if (formatted.name === "AbortError") {
      console.warn(`Supabase query timed out for ${label}`);
      return null;
    }
    console.error(`Supabase query threw for ${label}`, formatted);
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

function normalizeCards(cards: ContentCard[] | null | undefined) {
  if (!cards) return null;

  return cards.map((card) => ({
    ...card,
    project_key: (card.project_key || "main") as ProjectKey,
    is_archived: Boolean(card.is_archived || card.status?.slug === ARCHIVE_STATUS_SLUG),
    archived_at:
      card.archived_at ||
      (card.status?.slug === ARCHIVE_STATUS_SLUG ? card.updated_at || card.created_at || null : null),
    archived_from_status_id: card.archived_from_status_id || null
  }));
}

function normalizePlannerWeeks(rows: Array<Record<string, unknown>> | null | undefined) {
  return (rows ?? []).map((row) => ({
    id: String(row.id || ""),
    month_label: String(row.month_label || ""),
    week_key: (row.week_key as PlannedWeek) || "week_1"
  }));
}

function normalizePlannerEntries(rows: Array<Record<string, unknown>> | null | undefined) {
  return (rows ?? []).map((row) => ({
    card_id: String(row.card_id || ""),
    plan_week_id: String(row.plan_week_id || ""),
    day_key: (row.day_key as PlannedDay) || "monday",
    role: row.role === "alternative" ? "alternative" : "main",
    position: typeof row.position === "number" ? row.position : Number(row.position || 0)
  }));
}

function buildScheduledDateMap(weeks: PlannerWeekLite[], entries: PlannerEntryLite[]) {
  const weeksById = new Map(weeks.map((week) => [week.id, week]));
  const bestByCardId = new Map<string, { scheduledFor: string; role: "main" | "alternative"; position: number }>();

  for (const entry of entries) {
    if (entry.role !== "main") continue;

    const week = weeksById.get(entry.plan_week_id);
    if (!week || !entry.card_id) continue;

    const scheduledFor = plannedDayIso(week.month_label, week.week_key, entry.day_key);
    if (!scheduledFor) continue;

    const current = bestByCardId.get(entry.card_id);
    if (!current) {
      bestByCardId.set(entry.card_id, {
        scheduledFor,
        role: entry.role,
        position: entry.position
      });
      continue;
    }

    const currentPriority = `${current.role === "main" ? "0" : "1"}-${current.position}-${current.scheduledFor}`;
    const nextPriority = `${entry.role === "main" ? "0" : "1"}-${entry.position}-${scheduledFor}`;

    if (nextPriority < currentPriority) {
      bestByCardId.set(entry.card_id, {
        scheduledFor,
        role: entry.role,
        position: entry.position
      });
    }
  }

  return new Map(Array.from(bestByCardId.entries()).map(([cardId, value]) => [cardId, value.scheduledFor]));
}

function attachScheduledDates(cards: ContentCard[] | null | undefined, weeks: PlannerWeekLite[], entries: PlannerEntryLite[]) {
  if (!cards) return null;

  const scheduledDateMap = buildScheduledDateMap(weeks, entries);
  return cards.map((card) => ({
    ...card,
    scheduled_for_date: scheduledDateMap.get(card.id) || null
  }));
}

function normalizeStatuses(statuses: StatusRow[] | null | undefined) {
  if (!statuses) return null;
  return statuses.filter((status) => status.slug !== ARCHIVE_STATUS_SLUG);
}

function normalizeBloggers(bloggers: BloggerRow[] | null | undefined) {
  if (!bloggers) return null;

  return bloggers.map((blogger) => ({
    ...blogger,
    username: blogger.username?.trim() || null,
    display_name: blogger.display_name?.trim() || "Unnamed blogger",
    avatar_url: blogger.avatar_url || null,
    followers: typeof blogger.followers === "number" ? blogger.followers : blogger.followers ? Number(blogger.followers) : null,
    price: blogger.price?.trim() || null,
    price_description: blogger.price_description?.trim() || null,
    status: blogger.status?.trim() || null,
    status_color: (
      blogger.status_color === "blue" ||
      blogger.status_color === "green" ||
      blogger.status_color === "yellow" ||
      blogger.status_color === "orange" ||
      blogger.status_color === "red" ||
      blogger.status_color === "purple"
        ? blogger.status_color
        : "gray"
    ) as BloggerStatusColor,
    notes: blogger.notes?.trim() || null,
    instagram_url: blogger.instagram_url?.trim() || null,
    material_type: (blogger.material_type === "script" || blogger.material_type === "video" ? blogger.material_type : "none") as BloggerMaterialType,
    material_url: blogger.material_url?.trim() || null
  }));
}

export async function getDashboardData() {
  if (!hasSupabase()) return getMockData();

  const supabase = await createSupabaseServerClient();
  if (!supabase) return getMockData();

  const fallback = getMockData();

  const [statuses, types, cards, planWeeks, planEntries] = await Promise.all([
    safeQuery<StatusRow[]>(
      async (signal) =>
        await supabase
          .from("statuses")
          .select("*")
          .eq("is_active", true)
          .order("sort_order")
          .abortSignal(signal),
      "dashboard-statuses"
    ),
    safeQuery<CardTypeRow[]>(
      async (signal) =>
        await supabase
          .from("card_types")
          .select("*")
          .eq("is_active", true)
          .order("sort_order")
          .abortSignal(signal),
      "dashboard-types"
    ),
    safeQuery<ContentCard[]>(
      async (signal) =>
        await supabase
          .from("cards")
          .select(`${BASE_CARD_SELECT}, status:statuses!cards_status_id_fkey(*), type:card_types(*)`)
          .order("is_pinned", { ascending: false })
          .order("created_at", { ascending: false })
          .order("sort_order")
          .abortSignal(signal),
      "dashboard-cards"
    ),
    safeQuery<Array<Record<string, unknown>>>(
      async (signal) =>
        await supabase
          .from("plan_weeks")
          .select("id, month_label, week_key")
          .abortSignal(signal),
      "dashboard-plan-weeks"
    ),
    safeQuery<Array<Record<string, unknown>>>(
      async (signal) =>
        await supabase
          .from("plan_entries")
          .select("card_id, plan_week_id, day_key, role, position")
          .abortSignal(signal),
      "dashboard-plan-entries"
    )
  ]);

  const normalizedWeeks = normalizePlannerWeeks(planWeeks);
  const normalizedEntries = normalizePlannerEntries(planEntries);
  const normalizedCards = normalizeCards(cards);

  return {
    statuses: normalizeStatuses(statuses) ?? fallback.statuses,
    types: types ?? fallback.types,
    cards: attachScheduledDates(normalizedCards, normalizedWeeks, normalizedEntries) ?? fallback.cards
  };
}

export async function getAdminData() {
  if (!hasSupabase()) {
    const fallback = getMockData();
    return {
      ...fallback,
      catalogs: await getPlanMetadataCatalogs()
    };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    const fallback = getMockData();
    return {
      ...fallback,
      catalogs: await getPlanMetadataCatalogs()
    };
  }

  const fallback = getMockData();

  const [statuses, types, cards, catalogs, planWeeks, planEntries] = await Promise.all([
    safeQuery<StatusRow[]>(
      async (signal) =>
        await supabase
          .from("statuses")
          .select("*")
          .order("sort_order")
          .abortSignal(signal),
      "admin-statuses"
    ),
    safeQuery<CardTypeRow[]>(
      async (signal) =>
        await supabase
          .from("card_types")
          .select("*")
          .order("sort_order")
          .abortSignal(signal),
      "admin-types"
    ),
    safeQuery<ContentCard[]>(
      async (signal) =>
        await supabase
          .from("cards")
          .select(`${BASE_CARD_SELECT}, status:statuses!cards_status_id_fkey(*), type:card_types(*)`)
          .order("is_pinned", { ascending: false })
          .order("created_at", { ascending: false })
          .order("sort_order")
          .abortSignal(signal),
      "admin-cards"
    ),
    getPlanMetadataCatalogs(),
    safeQuery<Array<Record<string, unknown>>>(
      async (signal) =>
        await supabase
          .from("plan_weeks")
          .select("id, month_label, week_key")
          .abortSignal(signal),
      "admin-plan-weeks"
    ),
    safeQuery<Array<Record<string, unknown>>>(
      async (signal) =>
        await supabase
          .from("plan_entries")
          .select("card_id, plan_week_id, day_key, role, position")
          .abortSignal(signal),
      "admin-plan-entries"
    )
  ]);

  const normalizedWeeks = normalizePlannerWeeks(planWeeks);
  const normalizedEntries = normalizePlannerEntries(planEntries);
  const normalizedCards = normalizeCards(cards);

  return {
    statuses: normalizeStatuses(statuses) ?? fallback.statuses,
    types: types ?? fallback.types,
    cards: attachScheduledDates(normalizedCards, normalizedWeeks, normalizedEntries) ?? fallback.cards,
    catalogs: (catalogs as PlanMetadataCatalogs) ?? { projects: [], rooms: [], categories: [] }
  };
}

export async function getBloggersData() {
  if (!hasSupabase()) return { bloggers: getMockData().bloggers ?? [] };

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { bloggers: getMockData().bloggers ?? [] };

  const bloggers = await safeQuery<BloggerRow[]>(
    async (signal) =>
      await supabase
        .from("bloggers")
        .select("*")
        .order("created_at", { ascending: false })
        .abortSignal(signal),
    "bloggers"
  );

  return {
    bloggers: normalizeBloggers(bloggers) ?? getMockData().bloggers ?? []
  };
}

export async function getAdminBloggersData() {
  if (!hasSupabase()) return { bloggers: getMockData().bloggers ?? [] };

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { bloggers: getMockData().bloggers ?? [] };

  const bloggers = await safeQuery<BloggerRow[]>(
    async (signal) =>
      await supabase
        .from("bloggers")
        .select("*")
        .order("created_at", { ascending: false })
        .abortSignal(signal),
    "admin-bloggers"
  );

  return {
    bloggers: normalizeBloggers(bloggers) ?? getMockData().bloggers ?? []
  };
}
