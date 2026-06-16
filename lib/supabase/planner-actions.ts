"use server";

import { revalidatePath } from "next/cache";
import { monthLabelToSortDate } from "@/lib/plan/dates";
import { createSupabaseServiceClient, hasSupabase } from "@/lib/supabase/server";
import { PlanEntryRole, PlannedDay, PlannedWeek, ProjectKey } from "@/lib/types";

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

function normalizeWeekKey(value: string) {
  return ["week_1", "week_2", "week_3", "week_4", "week_5"].includes(value) ? (value as PlannedWeek) : null;
}

function normalizeDayKey(value: string) {
  return ["monday", "tuesday", "wednesday", "thursday"].includes(value) ? (value as PlannedDay) : null;
}

function normalizeRole(value: string) {
  return value === "main" || value === "alternative" ? (value as PlanEntryRole) : null;
}

async function getOrCreatePlanWeek(projectKey: ProjectKey, monthLabel: string, weekKey: PlannedWeek) {
  const supabase = await getService();
  if (!supabase) return { supabase: null, weekId: null, error: "Supabase is not configured" };

  const monthSortDate = monthLabelToSortDate(monthLabel);
  if (!monthSortDate) {
    return { supabase, weekId: null, error: "Invalid month label" };
  }

  const existing = await supabase
    .from("plan_weeks")
    .select("id")
    .eq("project_key", projectKey)
    .eq("month_sort_date", monthSortDate)
    .eq("week_key", weekKey)
    .maybeSingle();

  if (existing.data?.id) {
    return { supabase, weekId: existing.data.id, error: null };
  }

  if (existing.error) {
    return { supabase, weekId: null, error: existing.error.message };
  }

  const inserted = await supabase
    .from("plan_weeks")
    .insert({
      project_key: projectKey,
      month_label: monthLabel,
      month_sort_date: monthSortDate,
      week_key: weekKey
    })
    .select("id")
    .single();

  if (inserted.error || !inserted.data?.id) {
    return { supabase, weekId: null, error: inserted.error?.message || "Failed to create week container" };
  }

  return { supabase, weekId: inserted.data.id, error: null };
}

function refreshPlanner() {
  revalidatePath("/admin/plan");
  revalidatePath("/plan");
}

export async function setPlanEntryAction(formData: FormData): Promise<ActionResult> {
  const projectKey = (String(formData.get("project_key") || "main") || "main") as ProjectKey;
  const monthLabel = String(formData.get("month_label") || "").trim();
  const weekKey = normalizeWeekKey(String(formData.get("week_key") || ""));
  const dayKey = normalizeDayKey(String(formData.get("day_key") || ""));
  const role = normalizeRole(String(formData.get("role") || ""));
  const position = Number(formData.get("position") || 0);
  const cardId = String(formData.get("card_id") || "").trim();

  if (!monthLabel || !weekKey || !dayKey || !role) {
    return fail("Missing planner slot data");
  }

  if (projectKey !== "main" && projectKey !== "mena") {
    return fail("Invalid project");
  }

  if ((role === "main" && position !== 0) || (role === "alternative" && position !== 1 && position !== 2)) {
    return fail("Invalid slot position");
  }

  const { supabase, weekId, error } = await getOrCreatePlanWeek(projectKey, monthLabel, weekKey);
  if (!supabase || !weekId) {
    return fail(error || "Planner is unavailable");
  }

  const currentSlot = await supabase
    .from("plan_entries")
    .select("id, card_id")
    .eq("plan_week_id", weekId)
    .eq("day_key", dayKey)
    .eq("role", role)
    .eq("position", position)
    .maybeSingle();

  if (currentSlot.error) {
    return fail(currentSlot.error.message);
  }

  if (!cardId) {
    if (!currentSlot.data?.id) {
      return ok("Slot is already empty");
    }

    const cleared = await supabase.from("plan_entries").delete().eq("id", currentSlot.data.id);
    if (cleared.error) return fail(cleared.error.message);

    refreshPlanner();
    return ok("Slot cleared");
  }

  const duplicateUsage = await supabase
    .from("plan_entries")
    .select("id, day_key, role, position")
    .eq("plan_week_id", weekId)
    .eq("card_id", cardId)
    .maybeSingle();

  if (duplicateUsage.error) {
    return fail(duplicateUsage.error.message);
  }

  if (duplicateUsage.data && duplicateUsage.data.id !== currentSlot.data?.id) {
    return fail("This card is already used in the selected week");
  }

  if (currentSlot.data?.card_id === cardId) {
    return ok("Slot already uses this card");
  }

  const payload = {
    plan_week_id: weekId,
    card_id: cardId,
    day_key: dayKey,
    role,
    position
  };

  const result = currentSlot.data?.id
    ? await supabase.from("plan_entries").update({ card_id: cardId }).eq("id", currentSlot.data.id)
    : await supabase.from("plan_entries").insert(payload);

  if (result.error) {
    return fail(result.error.message);
  }

  refreshPlanner();
  return ok(role === "main" ? "Main post updated" : "Alternative updated");
}

export async function clearPlanWeekAction(formData: FormData): Promise<ActionResult> {
  const projectKey = (String(formData.get("project_key") || "main") || "main") as ProjectKey;
  const monthLabel = String(formData.get("month_label") || "").trim();
  const weekKey = normalizeWeekKey(String(formData.get("week_key") || ""));

  if (!monthLabel || !weekKey) {
    return fail("Missing week data");
  }

  const { supabase, weekId, error } = await getOrCreatePlanWeek(projectKey, monthLabel, weekKey);
  if (!supabase || !weekId) {
    return fail(error || "Planner is unavailable");
  }

  const deleted = await supabase.from("plan_entries").delete().eq("plan_week_id", weekId);
  if (deleted.error) return fail(deleted.error.message);

  refreshPlanner();
  return ok("Week cleared");
}
