import { createSupabaseServerClient, hasSupabase } from "@/lib/supabase/server";
import { getMockData } from "@/lib/mock-data";
import { CardTypeRow, ContentCard, StatusRow } from "@/lib/types";

async function safeQuery<T>(query: () => Promise<any>) {
  try {
    const result = await query();
    if (result.error) {
      console.error(result.error);
      return null;
    }
    return result.data as T;
  } catch (e) {
    console.error(e);
    return null;
  }
}

export async function getDashboardData() {
  if (!hasSupabase()) return getMockData();

  const supabase = await createSupabaseServerClient();
  if (!supabase) return getMockData();

  const statuses = await safeQuery<StatusRow[]>(
    () =>
      supabase
        .from("statuses")
        .select("*")
        .eq("is_active", true)
        .order("sort_order")
  );

  const types = await safeQuery<CardTypeRow[]>(
    () =>
      supabase
        .from("card_types")
        .select("*")
        .eq("is_active", true)
        .order("sort_order")
  );

  const cards = await safeQuery<ContentCard[]>(
    () =>
      supabase
        .from("cards")
        .select("*, status:statuses(*), type:card_types(*)")
        .order("is_pinned", { ascending: false })
        .order("sort_order")
  );

  const fallback = getMockData();

  return {
    statuses: statuses ?? fallback.statuses,
    types: types ?? fallback.types,
    cards: cards ?? fallback.cards
  };
}

export async function getAdminData() {
  if (!hasSupabase()) return getMockData();

  const supabase = await createSupabaseServerClient();
  if (!supabase) return getMockData();

  const statuses = await safeQuery<StatusRow[]>(
    () =>
      supabase
        .from("statuses")
        .select("*")
        .order("sort_order")
  );

  const types = await safeQuery<CardTypeRow[]>(
    () =>
      supabase
        .from("card_types")
        .select("*")
        .order("sort_order")
  );

  const cards = await safeQuery<ContentCard[]>(
    () =>
      supabase
        .from("cards")
        .select("*, status:statuses(*), type:card_types(*)")
        .order("is_pinned", { ascending: false })
        .order("sort_order")
  );

  const fallback = getMockData();

  return {
    statuses: statuses ?? fallback.statuses,
    types: types ?? fallback.types,
    cards: cards ?? fallback.cards
  };
}