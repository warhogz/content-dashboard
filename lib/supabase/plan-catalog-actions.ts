"use server";

import { revalidatePath } from "next/cache";
import { DEFAULT_PLAN_METADATA_CATALOGS, mergeCatalogValues, normalizePlanMetadataCatalogs } from "@/lib/plan/catalogs";
import { createSupabaseServiceClient, hasSupabase } from "@/lib/supabase/server";
import { PLAN_METADATA_CATALOGS_KEY } from "@/lib/supabase/plan-catalogs";
import { PlanMetadataCatalogKind } from "@/lib/types";

type ActionResult = { ok: true; message: string } | { ok: false; message: string };

function ok(message: string): ActionResult {
  return { ok: true, message };
}

function fail(message: string): ActionResult {
  return { ok: false, message };
}

async function getService() {
  if (!hasSupabase()) return null;
  return createSupabaseServiceClient();
}

function normalizeCatalogValue(value: FormDataEntryValue | null) {
  return String(value || "").trim();
}

function normalizeKind(value: FormDataEntryValue | null) {
  const kind = String(value || "").trim();
  return kind === "projects" || kind === "rooms" || kind === "categories" ? (kind as PlanMetadataCatalogKind) : null;
}

async function readCurrentCatalogs() {
  const supabase = await getService();
  if (!supabase) return { supabase: null, catalogs: DEFAULT_PLAN_METADATA_CATALOGS };

  const { data, error } = await supabase.from("ui_preferences").select("id, value").eq("key", PLAN_METADATA_CATALOGS_KEY).maybeSingle();
  if (error) {
    return { supabase, catalogs: DEFAULT_PLAN_METADATA_CATALOGS, id: null, error: error.message };
  }

  return {
    supabase,
    id: data?.id || null,
    catalogs: normalizePlanMetadataCatalogs(data?.value, DEFAULT_PLAN_METADATA_CATALOGS),
    error: null
  };
}

function refreshCatalogs() {
  revalidatePath("/admin");
  revalidatePath("/admin/plan");
  revalidatePath("/settings");
}

export async function upsertPlanMetadataCatalogItemAction(formData: FormData): Promise<ActionResult> {
  const kind = normalizeKind(formData.get("kind"));
  const value = normalizeCatalogValue(formData.get("value"));
  const previousValue = normalizeCatalogValue(formData.get("previous_value"));

  if (!kind) return fail("Invalid metadata section");
  if (!value) return fail("Enter a value");

  const current = await readCurrentCatalogs();
  if (!current.supabase) return fail("Supabase is not configured");
  if (current.error) return fail(current.error);

  const nextValues = [...current.catalogs[kind]];
  const previousIndex = previousValue ? nextValues.findIndex((item) => item.toLowerCase() === previousValue.toLowerCase()) : -1;
  const duplicateIndex = nextValues.findIndex((item) => item.toLowerCase() === value.toLowerCase());

  if (duplicateIndex >= 0 && duplicateIndex !== previousIndex) {
    return fail("This value already exists");
  }

  if (previousIndex >= 0) {
    nextValues[previousIndex] = value;
  } else {
    nextValues.push(value);
  }

  const payload = {
    ...current.catalogs,
    [kind]: mergeCatalogValues(nextValues)
  };

  const query = current.id
    ? current.supabase.from("ui_preferences").update({ value: payload }).eq("id", current.id)
    : current.supabase.from("ui_preferences").insert({ key: PLAN_METADATA_CATALOGS_KEY, value: payload });

  const { error } = await query;
  if (error) return fail(error.message);

  refreshCatalogs();
  return ok(previousIndex >= 0 ? "Metadata value updated" : "Metadata value added");
}

export async function deletePlanMetadataCatalogItemAction(formData: FormData): Promise<ActionResult> {
  const kind = normalizeKind(formData.get("kind"));
  const value = normalizeCatalogValue(formData.get("value"));

  if (!kind || !value) return fail("Invalid metadata item");

  const current = await readCurrentCatalogs();
  if (!current.supabase) return fail("Supabase is not configured");
  if (current.error) return fail(current.error);

  const nextValues = current.catalogs[kind].filter((item) => item.toLowerCase() !== value.toLowerCase());
  const payload = {
    ...current.catalogs,
    [kind]: mergeCatalogValues(nextValues)
  };

  const query = current.id
    ? current.supabase.from("ui_preferences").update({ value: payload }).eq("id", current.id)
    : current.supabase.from("ui_preferences").insert({ key: PLAN_METADATA_CATALOGS_KEY, value: payload });

  const { error } = await query;
  if (error) return fail(error.message);

  refreshCatalogs();
  return ok("Metadata value removed");
}
