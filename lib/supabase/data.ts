import { createSupabaseServerClient, hasSupabase } from "@/lib/supabase/server";
import { getMockData } from "@/lib/mock-data";
import { ARCHIVE_STATUS_SLUG, BloggerMaterialType, BloggerRow, BloggerStatusColor, CardTypeRow, ContentCard, ProjectKey, StatusRow } from "@/lib/types";

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

  const [statuses, types, cards] = await Promise.all([
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
    )
  ]);

  return {
    statuses: normalizeStatuses(statuses) ?? fallback.statuses,
    types: types ?? fallback.types,
    cards: normalizeCards(cards) ?? fallback.cards
  };
}

export async function getAdminData() {
  if (!hasSupabase()) return getMockData();

  const supabase = await createSupabaseServerClient();
  if (!supabase) return getMockData();

  const fallback = getMockData();

  const [statuses, types, cards] = await Promise.all([
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
    )
  ]);

  return {
    statuses: normalizeStatuses(statuses) ?? fallback.statuses,
    types: types ?? fallback.types,
    cards: normalizeCards(cards) ?? fallback.cards
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
