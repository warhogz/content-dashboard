"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServiceClient, hasSupabase } from "@/lib/supabase/server";
import { type BloggerStatusColor, type MediaAudienceType, type MediaOutletRow } from "@/lib/types";

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

async function removeLogoFromStorage(
  supabase: NonNullable<Awaited<ReturnType<typeof getService>>>,
  logoUrl: string | null | undefined,
  context: Record<string, unknown>
) {
  const storagePath = extractThumbnailStoragePath(logoUrl);
  if (!storagePath) return;

  const { error } = await supabase.storage.from("thumbnails").remove([storagePath]);
  if (error) {
    console.error("Failed to delete media outlet logo from storage", {
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

function parseOptionalInt(formData: FormData, key: string) {
  const raw = String(formData.get(key) || "").trim();
  if (!raw) return null;

  const numeric = Number(raw.replace(/[^\d]/g, ""));
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
}

function parseOptionalDate(formData: FormData, key: string) {
  const raw = String(formData.get(key) || "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null;
}

function parseStatusColor(formData: FormData): BloggerStatusColor {
  const value = String(formData.get("status_color") || "gray").trim();
  if (value === "blue" || value === "green" || value === "yellow" || value === "orange" || value === "red" || value === "purple") {
    return value;
  }
  return "gray";
}

function parseAudienceType(formData: FormData): MediaAudienceType {
  const value = String(formData.get("audience_type") || "followers").trim();
  if (value === "monthly_views" || value === "email" || value === "print") return value;
  return "followers";
}

async function refreshMedia() {
  revalidatePath("/press");
  revalidatePath("/admin/press");
}

async function loadExistingOutlet(
  supabase: NonNullable<Awaited<ReturnType<typeof getService>>>,
  id: string
) {
  const { data, error } = await supabase.from("media_outlets").select("logo_url").eq("id", id).maybeSingle();

  if (error) {
    console.error("Failed to load existing media outlet before update", error);
    return null;
  }

  return data as Pick<MediaOutletRow, "logo_url"> | null;
}

export async function upsertMediaOutletAction(formData: FormData): Promise<ActionResult> {
  const supabase = await getService();
  if (!supabase) return fail("Supabase не настроен");

  const id = String(formData.get("id") || "");

  const payload = {
    name: String(formData.get("name") || "").trim(),
    logo_url: parseOptionalText(formData, "logo_url"),
    region: parseOptionalText(formData, "region"),
    languages: parseOptionalText(formData, "languages"),
    founded_year: parseOptionalInt(formData, "founded_year"),
    audience: parseOptionalInt(formData, "audience"),
    audience_type: parseAudienceType(formData),
    audience_note: parseOptionalText(formData, "audience_note"),
    instagram_url: parseOptionalText(formData, "instagram_url"),
    website_url: parseOptionalText(formData, "website_url"),
    extra_url: parseOptionalText(formData, "extra_url"),
    formats: parseOptionalText(formData, "formats"),
    price: parseOptionalText(formData, "price"),
    price_note: parseOptionalText(formData, "price_note"),
    price_alt: parseOptionalText(formData, "price_alt"),
    price_alt_note: parseOptionalText(formData, "price_alt_note"),
    payment_terms: parseOptionalText(formData, "payment_terms"),
    offer_until: parseOptionalDate(formData, "offer_until"),
    open_questions: parseOptionalText(formData, "open_questions"),
    status: parseOptionalText(formData, "status"),
    status_color: parseStatusColor(formData),
    notes: parseOptionalText(formData, "notes")
  };

  if (!payload.name) {
    return fail("Укажи название издания");
  }

  if (id) {
    const existing = await loadExistingOutlet(supabase, id);
    const { error } = await supabase.from("media_outlets").update(payload).eq("id", id);
    if (error) return fail(error.message);

    if (existing?.logo_url && existing.logo_url !== payload.logo_url) {
      await removeLogoFromStorage(supabase, existing.logo_url, {
        outletId: id,
        reason: "media-logo-replaced"
      });
    }
  } else {
    const { error } = await supabase.from("media_outlets").insert(payload);
    if (error) return fail(error.message);
  }

  await refreshMedia();
  return ok("Издание сохранено");
}

export async function deleteMediaOutletAction(formData: FormData): Promise<ActionResult> {
  const supabase = await getService();
  if (!supabase) return fail("Supabase не настроен");

  const id = String(formData.get("id") || "");
  if (!id) return fail("Не найден ID");

  const existing = await loadExistingOutlet(supabase, id);
  const { error } = await supabase.from("media_outlets").delete().eq("id", id);
  if (error) return fail(error.message);

  await removeLogoFromStorage(supabase, existing?.logo_url, {
    outletId: id,
    reason: "media-outlet-deleted"
  });

  await refreshMedia();
  return ok("Издание удалено");
}
