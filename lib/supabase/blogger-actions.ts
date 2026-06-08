"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServiceClient, hasSupabase } from "@/lib/supabase/server";
import { type BloggerMaterialType, type BloggerRow } from "@/lib/types";

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
    console.error("Failed to delete blogger media from storage", {
      ...context,
      storagePath,
      error
    });
  }
}

function parseOptionalText(formData: FormData, key: string) {
  const value = String(formData.get(key) || "").trim();
  return value || null;
}

function parseOptionalFollowers(formData: FormData) {
  const raw = String(formData.get("followers") || "").trim();
  if (!raw) return null;

  const numeric = Number(raw.replace(/[^\d]/g, ""));
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
}

function parseMaterialType(formData: FormData): BloggerMaterialType {
  const value = String(formData.get("material_type") || "none").trim();
  if (value === "script" || value === "video") return value;
  return "none";
}

async function refreshBloggers() {
  revalidatePath("/bloggers");
  revalidatePath("/admin/bloggers");
}

async function loadExistingBlogger(
  supabase: NonNullable<Awaited<ReturnType<typeof getService>>>,
  id: string
) {
  const { data, error } = await supabase
    .from("bloggers")
    .select("avatar_url")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("Failed to load existing blogger before update", error);
    return null;
  }

  return data as Pick<BloggerRow, "avatar_url"> | null;
}

export async function upsertBloggerAction(formData: FormData): Promise<ActionResult> {
  const supabase = await getService();
  if (!supabase) return fail("Supabase РЅРµ РЅР°СЃС‚СЂРѕРµРЅ");

  const id = String(formData.get("id") || "");
  const materialType = parseMaterialType(formData);

  const payload = {
    username: parseOptionalText(formData, "username"),
    display_name: String(formData.get("display_name") || "").trim(),
    avatar_url: parseOptionalText(formData, "avatar_url"),
    followers: parseOptionalFollowers(formData),
    price: parseOptionalText(formData, "price"),
    price_description: parseOptionalText(formData, "price_description"),
    status: parseOptionalText(formData, "status"),
    notes: parseOptionalText(formData, "notes"),
    instagram_url: parseOptionalText(formData, "instagram_url"),
    material_type: materialType,
    material_url: materialType === "none" ? null : parseOptionalText(formData, "material_url")
  };

  if (!payload.display_name) {
    return fail("РЈРєР°Р¶Рё РёРјСЏ Р±Р»РѕРіРµСЂР°");
  }

  if (id) {
    const existing = await loadExistingBlogger(supabase, id);
    const { error } = await supabase.from("bloggers").update(payload).eq("id", id);
    if (error) return fail(error.message);

    if (existing?.avatar_url && existing.avatar_url !== payload.avatar_url) {
      await removeThumbnailFromStorage(supabase, existing.avatar_url, {
        bloggerId: id,
        reason: "blogger-avatar-replaced"
      });
    }
  } else {
    const { error } = await supabase.from("bloggers").insert(payload);
    if (error) return fail(error.message);
  }

  await refreshBloggers();
  return ok("Р‘Р»РѕРіРµСЂ СЃРѕС…СЂР°РЅРµРЅ");
}

export async function deleteBloggerAction(formData: FormData): Promise<ActionResult> {
  const supabase = await getService();
  if (!supabase) return fail("Supabase РЅРµ РЅР°СЃС‚СЂРѕРµРЅ");

  const id = String(formData.get("id") || "");
  if (!id) return fail("РќРµ РЅР°Р№РґРµРЅ ID");

  const existing = await loadExistingBlogger(supabase, id);
  const { error } = await supabase.from("bloggers").delete().eq("id", id);
  if (error) return fail(error.message);

  await removeThumbnailFromStorage(supabase, existing?.avatar_url, {
    bloggerId: id,
    reason: "blogger-deleted-avatar"
  });

  await refreshBloggers();
  return ok("Р‘Р»РѕРіРµСЂ СѓРґР°Р»РµРЅ");
}
