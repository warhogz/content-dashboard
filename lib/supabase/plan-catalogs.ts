import { DEFAULT_PLAN_METADATA_CATALOGS, normalizePlanMetadataCatalogs } from "@/lib/plan/catalogs";
import { createSupabaseServiceClient, hasSupabase } from "@/lib/supabase/server";
import { PlanMetadataCatalogs } from "@/lib/types";

export const PLAN_METADATA_CATALOGS_KEY = "plan_metadata_catalogs";

export async function getPlanMetadataCatalogs(): Promise<PlanMetadataCatalogs> {
  if (!hasSupabase()) {
    return DEFAULT_PLAN_METADATA_CATALOGS;
  }

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return DEFAULT_PLAN_METADATA_CATALOGS;
  }

  const { data, error } = await supabase.from("ui_preferences").select("value").eq("key", PLAN_METADATA_CATALOGS_KEY).maybeSingle();

  if (error) {
    console.error("Failed to load plan metadata catalogs", error);
    return DEFAULT_PLAN_METADATA_CATALOGS;
  }

  return normalizePlanMetadataCatalogs(data?.value, DEFAULT_PLAN_METADATA_CATALOGS);
}
