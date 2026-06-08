"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServiceClient, hasSupabase } from "@/lib/supabase/server";
import { ARCHIVE_STATUS_SLUG, type BloggerRow, type CardAspectRatio, type CardCropMode, type ProjectKey } from "@/lib/types";
import { slugify } from "@/lib/utils";

type ActionResult = { ok: true; message: string } | { ok: false; message: string };

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

async function refreshAll() {
  revalidatePath("/");
  revalidatePath("/bloggers");
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

export async function upsertCardAction(formData: FormData): Promise<ActionResult> {
  const supabase = await getService();
  if (!supabase) return fail("Supabase не настроен");

  const id = String(formData.get("id") || "");
  let previousThumbnailUrl: string | null = null;

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
    return fail("Заполни название, тип, статус и ссылку");
  }

  if (payload.project_key !== "main" && payload.project_key !== "mena") {
    return fail("Некорректный проект");
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
          sort_order: await nextSortOrder("cards", {
            status_id: payload.status_id,
            project_key: payload.project_key
          })
        }
      : payload;

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
      sort_order,
      is_archived: false,
      archived_at: null,
      archived_from_status_id: null
    });
    if (error) return fail(error.message);
  }

  await refreshAll();
  return ok("Карточка сохранена");
}

export async function deleteCardAction(formData: FormData): Promise<ActionResult> {
  const supabase = await getService();
  if (!supabase) return fail("Supabase не настроен");

  const id = String(formData.get("id") || "");
  if (!id) return fail("Не найден ID");

  const { data: cardData, error: cardReadError } = await supabase
    .from("cards")
    .select("thumbnail_url")
    .eq("id", id)
    .maybeSingle();

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
  return ok("Карточка удалена");
}

export async function duplicateCardAction(formData: FormData): Promise<ActionResult> {
  const supabase = await getService();
  if (!supabase) return fail("Supabase не настроен");

  const id = String(formData.get("id") || "");
  const { data, error } = await supabase.from("cards").select("*").eq("id", id).single();
  if (error || !data) return fail(error?.message || "Карточка не найдена");

  const projectKey = (data.project_key || "main") as ProjectKey;
  const duplicateStatusId = data.archived_from_status_id || data.status_id;
  const sort_order = await nextSortOrder("cards", {
    status_id: duplicateStatusId,
    project_key: projectKey
  });

  const insert = {
    project_key: projectKey,
    title: `${data.title} — копия`,
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
    subtitle: data.subtitle,
    notes: data.notes
  };

  const { error: insertError } = await supabase.from("cards").insert(insert);
  if (insertError) return fail(insertError.message);

  await refreshAll();
  return ok("Карточка продублирована");
}

export async function toggleCardHiddenAction(formData: FormData): Promise<ActionResult> {
  const supabase = await getService();
  if (!supabase) return fail("Supabase не настроен");

  const id = String(formData.get("id") || "");
  const current = String(formData.get("is_hidden") || "false") === "true";
  const { error } = await supabase.from("cards").update({ is_hidden: !current }).eq("id", id);
  if (error) return fail(error.message);

  await refreshAll();
  return ok(current ? "Карточка показана" : "Карточка скрыта");
}

export async function toggleCardPinnedAction(formData: FormData): Promise<ActionResult> {
  const supabase = await getService();
  if (!supabase) return fail("Supabase не настроен");

  const id = String(formData.get("id") || "");
  const current = String(formData.get("is_pinned") || "false") === "true";
  const { error } = await supabase.from("cards").update({ is_pinned: !current }).eq("id", id);
  if (error) return fail(error.message);

  await refreshAll();
  return ok(current ? "Карточка откреплена" : "Карточка закреплена");
}

export async function toggleCardArchivedAction(formData: FormData): Promise<ActionResult> {
  const supabase = await getService();
  if (!supabase) return fail("Supabase не настроен");

  const id = String(formData.get("id") || "");
  if (!id) return fail("Не найден ID");

  const current = String(formData.get("is_archived") || "false") === "true";
  const { data: card, error: cardError } = await supabase
    .from("cards")
    .select("status_id, is_archived, archived_from_status_id, status:statuses!cards_status_id_fkey(slug)")
    .eq("id", id)
    .maybeSingle();

  if (cardError || !card) {
    return fail(cardError?.message || "Карточка не найдена");
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
    return ok("Карточка отправлена в архив");
  }

  const restoreStatusId =
    card.archived_from_status_id ||
    (currentStatusSlug !== ARCHIVE_STATUS_SLUG ? card.status_id : null) ||
    (await getFirstActiveStatusId(supabase));

  if (!restoreStatusId) {
    return fail("Не найден статус для возврата из архива");
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
  return ok("Карточка возвращена из архива");
}

export async function moveCardAction(formData: FormData): Promise<ActionResult> {
  const supabase = await getService();
  if (!supabase) return fail("Supabase не настроен");

  const id = String(formData.get("id") || "");
  const status_id = String(formData.get("status_id") || "");
  const sort_order = Number(formData.get("sort_order") || 1);
  const { error } = await supabase.from("cards").update({ status_id, sort_order }).eq("id", id);
  if (error) return fail(error.message);

  await refreshAll();
  return ok("Карточка перемещена");
}

export async function upsertStatusAction(formData: FormData): Promise<ActionResult> {
  const supabase = await getService();
  if (!supabase) return fail("Supabase не настроен");

  const id = String(formData.get("id") || "");
  const title = String(formData.get("title") || "").trim();
  const color = String(formData.get("color") || "#64748b");
  const slug = slugify(String(formData.get("slug") || title));

  if (!title) return fail("Укажи название статуса");
  if (slug === ARCHIVE_STATUS_SLUG) {
    return fail("Статус archive больше не используется. Для архивации применяй отдельное действие.");
  }

  const payload = {
    title,
    slug,
    color,
    is_active: formData.get("is_active") === "on",
    show_on_public: formData.get("show_on_public") === "on"
  };

  if (id) {
    const { error } = await supabase.from("statuses").update(payload).eq("id", id);
    if (error) return fail(error.message);
  } else {
    const sort_order = await nextSortOrder("statuses");
    const { error } = await supabase.from("statuses").insert({ ...payload, sort_order });
    if (error) return fail(error.message);
  }

  await refreshAll();
  return ok("Статус сохранен");
}

export async function deleteStatusAction(formData: FormData): Promise<ActionResult> {
  const supabase = await getService();
  if (!supabase) return fail("Supabase не настроен");

  const id = String(formData.get("id") || "");
  const { error } = await supabase.from("statuses").delete().eq("id", id);
  if (error) return fail(error.message);

  await refreshAll();
  return ok("Статус удален");
}

export async function upsertTypeAction(formData: FormData): Promise<ActionResult> {
  const supabase = await getService();
  if (!supabase) return fail("Supabase не настроен");

  const id = String(formData.get("id") || "");
  const title = String(formData.get("title") || "").trim();
  const payload = {
    title,
    slug: slugify(String(formData.get("slug") || title)),
    default_aspect_ratio: String(formData.get("default_aspect_ratio") || "custom"),
    default_height_px: Number(formData.get("default_height_px") || 320),
    default_crop_mode: String(formData.get("default_crop_mode") || "cover"),
    is_active: formData.get("is_active") === "on"
  };

  if (!title) return fail("Укажи название типа");

  if (id) {
    const { error } = await supabase.from("card_types").update(payload).eq("id", id);
    if (error) return fail(error.message);
  } else {
    const sort_order = await nextSortOrder("card_types");
    const { error } = await supabase.from("card_types").insert({ ...payload, sort_order });
    if (error) return fail(error.message);
  }

  await refreshAll();
  return ok("Тип сохранен");
}

export async function deleteTypeAction(formData: FormData): Promise<ActionResult> {
  const supabase = await getService();
  if (!supabase) return fail("Supabase не настроен");

  const id = String(formData.get("id") || "");
  const { error } = await supabase.from("card_types").delete().eq("id", id);
  if (error) return fail(error.message);

  await refreshAll();
  return ok("Тип удален");
}
