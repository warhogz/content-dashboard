"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServiceClient, hasSupabase } from "@/lib/supabase/server";
import { ARCHIVE_STATUS_SLUG, type CardAspectRatio, type CardCropMode, type ContentCard, type PlannedDay, type PlannedWeek, type ProjectKey } from "@/lib/types";

type ActionResult = { ok: true; message: string } | { ok: false; message: string };

export type CardPlanningEditorData = {
  planning: {
    project_name: string | null;
    room_zone: string | null;
    content_category: string | null;
    ready_for_plan: boolean;
    planned_month: string | null;
    planned_week: PlannedWeek | null;
    planned_day: PlannedDay | null;
    is_main_pick: boolean;
    alternative_for: string | null;
    plan_priority: number | null;
  };
  alternatives: Array<{
    id: string;
    title: string;
    project_name: string | null;
    planned_month: string | null;
    planned_week: PlannedWeek | null;
    planned_day: PlannedDay | null;
    alternative_for: string | null;
  }>;
};

function fail(message: string): ActionResult {
  return { ok: false, message };
}

function ok(message: string): ActionResult {
  return { ok: true, message };
}

function extractThumbnailStoragePath(thumbnailUrl: string | null | undefined) {
  if (!thumbnailUrl) return null;

  try {
    const url = new URL(thumbnailUrl);
    const match = url.pathname.match(/\/storage\/v1\/object\/(?:public|sign|authenticated)\/thumbnails\/(.+)$/);
    if (!match?.[1]) return null;
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}

async function getService() {
  if (!hasSupabase()) return null;
  return createSupabaseServiceClient();
}

async function removeThumbnailFromStorage(
  supabase: NonNullable<Awaited<ReturnType<typeof getService>>>,
  thumbnailUrl: string | null | undefined,
  context: Record<string, unknown>
) {
  const storagePath = extractThumbnailStoragePath(thumbnailUrl);
  if (!storagePath) return;

  const { error } = await supabase.storage.from("thumbnails").remove([storagePath]);
  if (error) {
    console.error("Failed to delete thumbnail from storage", {
      ...context,
      storagePath,
      error
    });
  }
}

async function nextSortOrder(table: "cards" | "statuses" | "card_types", filters?: Record<string, string>) {
  const supabase = await getService();
  if (!supabase) return 1;

  let query = supabase.from(table).select("sort_order").order("sort_order", { ascending: false }).limit(1);
  if (filters) {
    for (const [field, value] of Object.entries(filters)) {
      query = query.eq(field, value);
    }
  }

  const { data } = await query;
  return ((data?.[0]?.sort_order as number | undefined) ?? 0) + 1;
}

function parseOptionalTextValue(value: FormDataEntryValue | null) {
  const text = String(value || "").trim();
  return text || null;
}

function parseOptionalNumberValue(value: FormDataEntryValue | null) {
  const text = String(value || "").trim();
  if (!text) return null;
  const number = Number(text);
  return Number.isFinite(number) ? number : null;
}

function hasPlanningFields(formData: FormData) {
  return [
    "project_name",
    "room_zone",
    "content_category",
    "ready_for_plan",
    "planned_month",
    "planned_week",
    "planned_day",
    "is_main_pick",
    "alternative_for",
    "plan_priority"
  ].some((key) => formData.has(key));
}

async function refreshAll() {
  revalidatePath("/");
  revalidatePath("/bloggers");
  revalidatePath("/plan");
  revalidatePath("/canvas");
  revalidatePath("/admin");
  revalidatePath("/admin/bloggers");
  revalidatePath("/settings");
}

async function getFirstActiveStatusId(supabase: NonNullable<Awaited<ReturnType<typeof getService>>>) {
  const { data } = await supabase
    .from("statuses")
    .select("id")
    .neq("slug", ARCHIVE_STATUS_SLUG)
    .eq("is_active", true)
    .order("sort_order")
    .limit(1)
    .maybeSingle();

  return data?.id ?? null;
}

async function validateAlternativeFor(
  supabase: NonNullable<Awaited<ReturnType<typeof getService>>>,
  currentId: string,
  alternativeFor: string | null
) {
  if (!alternativeFor) return null;
  if (currentId && alternativeFor === currentId) {
    return "Card cannot be an alternative to itself";
  }

  const { data: target, error: targetError } = await supabase
    .from("cards")
    .select("id, alternative_for")
    .eq("id", alternativeFor)
    .maybeSingle();

  if (targetError || !target) {
    return targetError?.message || "Main card for alternative was not found";
  }

  if (target.alternative_for) {
    return "You can only choose a main card that is not itself an alternative";
  }

  if (currentId) {
    const { data: dependent } = await supabase.from("cards").select("id").eq("alternative_for", currentId).limit(1).maybeSingle();
    if (dependent) {
      return "A card with linked alternatives cannot itself become an alternative";
    }
  }

  return null;
}

function getPlanningPayload(formData: FormData) {
  if (!hasPlanningFields(formData)) return null;

  return {
    project_name: parseOptionalTextValue(formData.get("project_name")),
    room_zone: parseOptionalTextValue(formData.get("room_zone")),
    content_category: parseOptionalTextValue(formData.get("content_category")),
    ready_for_plan: formData.get("ready_for_plan") === "on",
    planned_month: parseOptionalTextValue(formData.get("planned_month")),
    planned_week: parseOptionalTextValue(formData.get("planned_week")) as PlannedWeek | null,
    planned_day: parseOptionalTextValue(formData.get("planned_day")) as PlannedDay | null,
    is_main_pick: formData.get("is_main_pick") === "on",
    alternative_for: parseOptionalTextValue(formData.get("alternative_for")),
    plan_priority: parseOptionalNumberValue(formData.get("plan_priority"))
  };
}

export async function getCardPlanningEditorDataAction(cardId: string | null): Promise<CardPlanningEditorData> {
  const supabase = await getService();
  if (!supabase) {
    return {
      planning: {
        project_name: null,
        room_zone: null,
        content_category: null,
        ready_for_plan: false,
        planned_month: null,
        planned_week: null,
        planned_day: null,
        is_main_pick: false,
        alternative_for: null,
        plan_priority: null
      },
      alternatives: []
    };
  }

  const [planningCardResult, alternativeCardsResult] = await Promise.all([
    cardId
      ? supabase
          .from("cards")
          .select(
            "project_name, room_zone, content_category, ready_for_plan, planned_month, planned_week, planned_day, is_main_pick, alternative_for, plan_priority"
          )
          .eq("id", cardId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase
      .from("cards")
      .select("id, title, project_name, planned_month, planned_week, planned_day, alternative_for")
      .eq("is_archived", false)
      .order("created_at", { ascending: false })
  ]);

  if (planningCardResult.error) {
    console.error("Failed to load card planning data", planningCardResult.error);
  }

  if (alternativeCardsResult.error) {
    console.error("Failed to load planning alternative options", alternativeCardsResult.error);
  }

  const planning = planningCardResult.data
    ? {
        project_name: planningCardResult.data.project_name || null,
        room_zone: planningCardResult.data.room_zone || null,
        content_category: planningCardResult.data.content_category || null,
        ready_for_plan: Boolean(planningCardResult.data.ready_for_plan),
        planned_month: planningCardResult.data.planned_month || null,
        planned_week: (planningCardResult.data.planned_week || null) as PlannedWeek | null,
        planned_day: (planningCardResult.data.planned_day || null) as PlannedDay | null,
        is_main_pick: Boolean(planningCardResult.data.is_main_pick),
        alternative_for: planningCardResult.data.alternative_for || null,
        plan_priority:
          typeof planningCardResult.data.plan_priority === "number"
            ? planningCardResult.data.plan_priority
            : planningCardResult.data.plan_priority
              ? Number(planningCardResult.data.plan_priority)
              : null
      }
    : {
        project_name: null,
        room_zone: null,
        content_category: null,
        ready_for_plan: false,
        planned_month: null,
        planned_week: null,
        planned_day: null,
        is_main_pick: false,
        alternative_for: null,
        plan_priority: null
      };

  const alternatives = (alternativeCardsResult.data ?? [])
    .filter((item) => item.id !== cardId)
    .map((item) => ({
      id: item.id,
      title: item.title,
      project_name: item.project_name || null,
      planned_month: item.planned_month || null,
      planned_week: (item.planned_week || null) as PlannedWeek | null,
      planned_day: (item.planned_day || null) as PlannedDay | null,
      alternative_for: item.alternative_for || null
    }));

  return { planning, alternatives };
}

export async function upsertCardAction(formData: FormData): Promise<ActionResult> {
  const supabase = await getService();
  if (!supabase) return fail("Supabase не настроен");

  const id = String(formData.get("id") || "");
  let previousThumbnailUrl: string | null = null;
  const planningPayload = getPlanningPayload(formData);

  const payload = {
    title: String(formData.get("title") || "").trim(),
    project_key: (String(formData.get("project_key") || "main").trim() || "main") as ProjectKey,
    type_id: String(formData.get("type_id") || ""),
    status_id: String(formData.get("status_id") || ""),
    link: String(formData.get("link") || "").trim(),
    thumbnail_url: String(formData.get("thumbnail_url") || "").trim() || null,
    aspect_ratio: String(formData.get("aspect_ratio") || "custom") as CardAspectRatio,
    height_px: Number(formData.get("height_px") || 320),
    crop_mode: String(formData.get("crop_mode") || "cover") as CardCropMode,
    subtitle: String(formData.get("subtitle") || "").trim() || null,
    notes: String(formData.get("notes") || "").trim() || null,
    is_hidden: formData.get("is_hidden") === "on",
    is_pinned: formData.get("is_pinned") === "on"
  };

  if (!payload.title || !payload.type_id || !payload.status_id || !payload.link) {
    return fail("Fill in title, type, status and link");
  }

  if (payload.project_key !== "main" && payload.project_key !== "mena") {
    return fail("Invalid project");
  }

  if (planningPayload) {
    if (planningPayload.is_main_pick && planningPayload.alternative_for) {
      return fail("Main pick cannot simultaneously be marked as an alternative");
    }

    const alternativeValidationMessage = await validateAlternativeFor(supabase, id, planningPayload.alternative_for);
    if (alternativeValidationMessage) {
      return fail(alternativeValidationMessage);
    }
  }

  if (id) {
    const { data: existingCard, error: existingCardError } = await supabase
      .from("cards")
      .select("thumbnail_url, status_id, project_key")
      .eq("id", id)
      .maybeSingle();

    if (existingCardError) {
      console.error("Failed to load existing card before update", existingCardError);
    }

    previousThumbnailUrl = existingCard?.thumbnail_url ?? null;

    const shouldResetSortOrder =
      existingCard?.status_id !== payload.status_id ||
      (existingCard?.project_key || "main") !== payload.project_key;

    const nextPayload = shouldResetSortOrder
      ? {
          ...payload,
          ...(planningPayload ?? {}),
          sort_order: await nextSortOrder("cards", {
            status_id: payload.status_id,
            project_key: payload.project_key
          })
        }
      : {
          ...payload,
          ...(planningPayload ?? {})
        };

    const { error } = await supabase.from("cards").update(nextPayload).eq("id", id);
    if (error) return fail(error.message);

    if (previousThumbnailUrl && previousThumbnailUrl !== payload.thumbnail_url) {
      await removeThumbnailFromStorage(supabase, previousThumbnailUrl, {
        cardId: id,
        reason: "card-thumbnail-replaced"
      });
    }
  } else {
    const sort_order = await nextSortOrder("cards", {
      status_id: payload.status_id,
      project_key: payload.project_key
    });

    const { error } = await supabase.from("cards").insert({
      ...payload,
      ...(planningPayload ?? {}),
      sort_order,
      is_archived: false,
      archived_at: null,
      archived_from_status_id: null
    });
    if (error) return fail(error.message);
  }

  await refreshAll();
  return ok("Card saved");
}

export async function deleteCardAction(formData: FormData): Promise<ActionResult> {
  const supabase = await getService();
  if (!supabase) return fail("Supabase не настроен");

  const id = String(formData.get("id") || "");
  if (!id) return fail("ID not found");

  const { data: cardData, error: cardReadError } = await supabase.from("cards").select("thumbnail_url").eq("id", id).maybeSingle();

  if (cardReadError) {
    console.error("Failed to load card thumbnail before delete", cardReadError);
  }

  const { error } = await supabase.from("cards").delete().eq("id", id);
  if (error) return fail(error.message);

  await removeThumbnailFromStorage(supabase, cardData?.thumbnail_url, {
    cardId: id,
    reason: "card-deleted"
  });

  await refreshAll();
  return ok("Card deleted");
}

export async function duplicateCardAction(formData: FormData): Promise<ActionResult> {
  const supabase = await getService();
  if (!supabase) return fail("Supabase не настроен");

  const id = String(formData.get("id") || "");
  const { data, error } = await supabase
    .from("cards")
    .select("title, project_key, type_id, status_id, archived_from_status_id, link, thumbnail_url, aspect_ratio, height_px, crop_mode, is_hidden, is_pinned, subtitle, notes")
    .eq("id", id)
    .single();
  if (error || !data) return fail(error?.message || "Card not found");

  const projectKey = (data.project_key || "main") as ProjectKey;
  const duplicateStatusId = data.archived_from_status_id || data.status_id;
  const sort_order = await nextSortOrder("cards", {
    status_id: duplicateStatusId,
    project_key: projectKey
  });

  const insert = {
    project_key: projectKey,
    title: `${data.title} — copy`,
    type_id: data.type_id,
    status_id: duplicateStatusId,
    link: data.link,
    thumbnail_url: data.thumbnail_url,
    aspect_ratio: data.aspect_ratio,
    height_px: data.height_px,
    crop_mode: data.crop_mode,
    sort_order,
    is_hidden: data.is_hidden,
    is_pinned: data.is_pinned,
    is_archived: false,
    archived_at: null,
    archived_from_status_id: null,
    project_name: null,
    room_zone: null,
    content_category: null,
    ready_for_plan: false,
    planned_month: null,
    planned_week: null,
    planned_day: null,
    is_main_pick: false,
    alternative_for: null,
    plan_priority: null,
    subtitle: data.subtitle,
    notes: data.notes
  };

  const { error: insertError } = await supabase.from("cards").insert(insert);
  if (insertError) return fail(insertError.message);

  await refreshAll();
  return ok("Duplicate created");
}

export async function toggleCardHiddenAction(formData: FormData): Promise<ActionResult> {
  const supabase = await getService();
  if (!supabase) return fail("Supabase не настроен");

  const id = String(formData.get("id") || "");
  const current = String(formData.get("is_hidden") || "false") === "true";
  const { error } = await supabase.from("cards").update({ is_hidden: !current }).eq("id", id);
  if (error) return fail(error.message);

  await refreshAll();
  return ok(current ? "Card is visible" : "Card hidden");
}

export async function toggleCardPinnedAction(formData: FormData): Promise<ActionResult> {
  const supabase = await getService();
  if (!supabase) return fail("Supabase не настроен");

  const id = String(formData.get("id") || "");
  const current = String(formData.get("is_pinned") || "false") === "true";
  const { error } = await supabase.from("cards").update({ is_pinned: !current }).eq("id", id);
  if (error) return fail(error.message);

  await refreshAll();
  return ok(current ? "Card unpinned" : "Card pinned");
}

export async function toggleCardArchivedAction(formData: FormData): Promise<ActionResult> {
  const supabase = await getService();
  if (!supabase) return fail("Supabase не настроен");

  const id = String(formData.get("id") || "");
  if (!id) return fail("ID not found");

  const current = String(formData.get("is_archived") || "false") === "true";
  const { data: card, error: cardError } = await supabase
    .from("cards")
    .select("status_id, is_archived, archived_from_status_id, status:statuses!cards_status_id_fkey(slug)")
    .eq("id", id)
    .maybeSingle();

  if (cardError || !card) {
    return fail(cardError?.message || "Card not found");
  }

  const statusRelation = card.status as { slug?: string } | { slug?: string }[] | null | undefined;
  const currentStatusSlug = Array.isArray(statusRelation) ? statusRelation[0]?.slug : statusRelation?.slug;

  if (!current) {
    const archivedFromStatusId = currentStatusSlug === ARCHIVE_STATUS_SLUG ? card.archived_from_status_id : card.status_id;
    const { error } = await supabase
      .from("cards")
      .update({
        is_archived: true,
        archived_at: new Date().toISOString(),
        archived_from_status_id: archivedFromStatusId
      })
      .eq("id", id);

    if (error) return fail(error.message);

    await refreshAll();
    return ok("Card archived");
  }

  const restoreStatusId =
    card.archived_from_status_id ||
    (currentStatusSlug !== ARCHIVE_STATUS_SLUG ? card.status_id : null) ||
    (await getFirstActiveStatusId(supabase));

  if (!restoreStatusId) {
    return fail("No status found to restore the card from archive");
  }

  const { error } = await supabase
    .from("cards")
    .update({
      is_archived: false,
      archived_at: null,
      archived_from_status_id: null,
      status_id: restoreStatusId
    })
    .eq("id", id);

  if (error) return fail(error.message);

  await refreshAll();
  return ok("Card restored from archive");
}
