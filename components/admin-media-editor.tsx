"use client";

import { useEffect, useMemo, useState, useTransition, type FormEvent, type ReactNode } from "react";
import { Check, Sparkles } from "lucide-react";
import { MediaOutletCard } from "@/components/media-outlet-card";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { optimizeImageForUpload } from "@/lib/image-optimizer";
import { mediaAudienceTypes, mediaStatusColorMap, mediaStatusPresets, parseMediaOffer } from "@/lib/media";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { upsertMediaOutletAction } from "@/lib/supabase/media-actions";
import { BloggerStatusColor, MediaAudienceType, MediaOutletRow } from "@/lib/types";

type Draft = Record<
  | "name"
  | "logo_url"
  | "region"
  | "languages"
  | "founded_year"
  | "audience"
  | "audience_note"
  | "instagram_url"
  | "website_url"
  | "extra_url"
  | "formats"
  | "price"
  | "price_note"
  | "price_alt"
  | "price_alt_note"
  | "payment_terms"
  | "offer_until"
  | "open_questions"
  | "status"
  | "notes",
  string
> & { status_color: BloggerStatusColor; audience_type: MediaAudienceType };

function toDraft(outlet: MediaOutletRow | null): Draft {
  return {
    name: outlet?.name || "",
    logo_url: outlet?.logo_url || "",
    region: outlet?.region || "",
    languages: outlet?.languages || "",
    founded_year: outlet?.founded_year ? String(outlet.founded_year) : "",
    audience: outlet?.audience ? String(outlet.audience) : "",
    audience_type: outlet?.audience_type || "followers",
    audience_note: outlet?.audience_note || "",
    instagram_url: outlet?.instagram_url || "",
    website_url: outlet?.website_url || "",
    extra_url: outlet?.extra_url || "",
    formats: outlet?.formats || "",
    price: outlet?.price || "",
    price_note: outlet?.price_note || "",
    price_alt: outlet?.price_alt || "",
    price_alt_note: outlet?.price_alt_note || "",
    payment_terms: outlet?.payment_terms || "",
    offer_until: outlet?.offer_until || "",
    open_questions: outlet?.open_questions || "",
    status: outlet?.status || "",
    status_color: outlet?.status_color || "gray",
    notes: outlet?.notes || ""
  };
}

function toNumber(value: string) {
  const numeric = Number(value.replace(/[^\d]/g, ""));
  return numeric > 0 ? numeric : null;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function extensionFromMimeType(type: string) {
  switch (type) {
    case "image/webp":
      return "webp";
    case "image/png":
      return "png";
    case "image/avif":
      return "avif";
    default:
      return "jpg";
  }
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-medium" style={{ color: "var(--theme-text-muted)" }}>
        {label}
        {hint ? <span style={{ color: "var(--theme-label)" }}> · {hint}</span> : null}
      </span>
      {children}
    </label>
  );
}

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <Card>
      <CardContent className="space-y-4 p-4 sm:p-5">
        <div>
          <CardTitle>{title}</CardTitle>
          {description ? <CardDescription className="mt-1">{description}</CardDescription> : null}
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

export function AdminMediaEditor({
  open,
  onOpenChange,
  outlet,
  onSaved
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  outlet: MediaOutletRow | null;
  onSaved?: () => void;
}) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [draft, setDraft] = useState<Draft>(() => toDraft(outlet));
  const [pasteText, setPasteText] = useState("");

  useEffect(() => {
    setDraft(toDraft(outlet));
    setPasteText("");
  }, [outlet, open]);

  const set = <K extends keyof Draft>(key: K) => (value: Draft[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const bind = (key: Exclude<keyof Draft, "status_color" | "audience_type">) => ({
    name: key,
    value: draft[key],
    onChange: (event: { target: { value: string } }) => set(key)(event.target.value)
  });

  const previewOutlet: MediaOutletRow = {
    id: outlet?.id || "preview",
    name: draft.name || "Название издания",
    logo_url: draft.logo_url || null,
    region: draft.region || null,
    languages: draft.languages || null,
    founded_year: toNumber(draft.founded_year),
    audience: toNumber(draft.audience),
    audience_type: draft.audience_type,
    audience_note: draft.audience_note || null,
    instagram_url: draft.instagram_url || null,
    website_url: draft.website_url || null,
    extra_url: draft.extra_url || null,
    formats: draft.formats || null,
    price: draft.price || null,
    price_note: draft.price_note || null,
    price_alt: draft.price_alt || null,
    price_alt_note: draft.price_alt_note || null,
    payment_terms: draft.payment_terms || null,
    offer_until: draft.offer_until || null,
    open_questions: draft.open_questions || null,
    status: draft.status || null,
    status_color: draft.status_color,
    notes: draft.notes || null
  };

  const applyPastedText = () => {
    const parsed = parseMediaOffer(pasteText);
    const entries = Object.entries(parsed).filter(([, value]) => value !== undefined && value !== null && value !== "");
    if (!entries.length) {
      toast.push({ title: "Ничего не распознано", description: "Заполни поля вручную — текст сохранится в заметках, если вставить его туда." });
      return;
    }

    setDraft((current) => {
      const next = { ...current };
      for (const [key, value] of entries) {
        (next as Record<string, unknown>)[key] = String(value);
      }
      if (!current.status) {
        next.status = "Новое предложение";
        next.status_color = "blue";
      }
      return next;
    });
    toast.push({ title: `Заполнено полей: ${entries.length}`, description: "Проверь превью и поправь, если что-то распозналось не так." });
  };

  const uploadLogo = async (file: File) => {
    if (!supabase) {
      toast.push({ title: "Supabase не настроен", description: "Пока можно использовать прямую ссылку на изображение." });
      return;
    }

    const optimized = await optimizeImageForUpload(file, { maxDimension: 800, quality: 0.85 });
    const uploadFile = optimized.file;
    const path = `media/logo/${crypto.randomUUID()}.${extensionFromMimeType(uploadFile.type)}`;
    const { error } = await supabase.storage.from("thumbnails").upload(path, uploadFile, {
      upsert: true,
      contentType: uploadFile.type
    });

    if (error) {
      toast.push({ title: "Ошибка загрузки", description: error.message });
      return;
    }

    const { data } = supabase.storage.from("thumbnails").getPublicUrl(path);
    set("logo_url")(data.publicUrl);
    toast.push({
      title: optimized.changed ? "Логотип оптимизирован и загружен" : "Логотип загружен",
      description: optimized.changed ? `${formatFileSize(optimized.originalSize)} -> ${formatFileSize(optimized.optimizedSize)}` : undefined
    });
  };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData();
    formData.set("id", outlet?.id || "");
    for (const [key, value] of Object.entries(draft)) {
      formData.set(key, value);
    }

    startTransition(async () => {
      const result = await upsertMediaOutletAction(formData);
      if (!result.ok) {
        toast.push({ title: "Не удалось сохранить издание", description: result.message });
        return;
      }

      toast.push({ title: result.message });
      onOpenChange(false);
      onSaved?.();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={outlet ? "Редактировать издание" : "Новое издание"}
      description="Вставь ответ площадки — поля заполнятся сами. Дальше остаётся проверить и сохранить."
      className="sm:max-w-6xl"
    >
      <form onSubmit={handleSubmit} className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-6">
        <div className="min-w-0 space-y-4">
          <Section title="Быстрое заполнение" description="Скопируй сообщение с предложением целиком: ссылки, аудитория, цены, условия и дедлайн разберутся автоматически.">
            <Textarea value={pasteText} onChange={(event) => setPasteText(event.target.value)} placeholder="Также ответ от … — медиаплощадки о …" className="min-h-32" />
            <Button type="button" variant="secondary" className="w-full sm:w-auto" onClick={applyPastedText} disabled={!pasteText.trim()}>
              <Sparkles className="h-4 w-4" />
              Разобрать текст
            </Button>
          </Section>

          <Section title="Издание">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Field label="Название">
                  <Input {...bind("name")} placeholder="ALJABERI Media UAE" required />
                </Field>
              </div>
              <Field label="Регион">
                <Input {...bind("region")} placeholder="UAE · Dubai" />
              </Field>
              <Field label="Языки">
                <Input {...bind("languages")} placeholder="EN / AR" />
              </Field>
              <Field label="Работает с" hint="год">
                <Input {...bind("founded_year")} inputMode="numeric" placeholder="2013" />
              </Field>
              <Field label="Аудитория" hint="число">
                <Input {...bind("audience")} inputMode="numeric" placeholder="1900000" />
              </Field>
              <div className="grid gap-1.5 sm:col-span-2">
                <span className="text-xs font-medium" style={{ color: "var(--theme-text-muted)" }}>
                  Что это за число
                </span>
                <div className="flex flex-wrap gap-2">
                  {mediaAudienceTypes.map((item) => {
                    const active = draft.audience_type === item.value;
                    return (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => set("audience_type")(item.value)}
                        className="rounded-full border px-3 py-1.5 text-xs font-medium transition"
                        style={{
                          borderColor: active ? "color-mix(in srgb, var(--theme-accent) 56%, var(--theme-border))" : "var(--theme-border)",
                          color: active ? "var(--theme-text)" : "var(--theme-text-muted)",
                          background: active ? "var(--theme-surface-strong)" : "var(--theme-surface-soft)"
                        }}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="sm:col-span-2">
                <Field label="Комментарий к аудитории">
                  <Input {...bind("audience_note")} placeholder="Статистику охватов пока не предоставили" />
                </Field>
              </div>
            </div>
          </Section>

          <Section title="Статус">
            <div className="flex flex-wrap gap-2">
              {mediaStatusPresets.map((preset) => {
                const active = draft.status === preset.label;
                const color = mediaStatusColorMap[preset.color];
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => setDraft((current) => ({ ...current, status: preset.label, status_color: preset.color }))}
                    className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition"
                    style={{
                      borderColor: active ? `${color}88` : "var(--theme-border)",
                      color: active ? "var(--theme-text)" : "var(--theme-text-muted)",
                      background: active ? `${color}22` : "var(--theme-surface-soft)"
                    }}
                  >
                    <span className="h-2 w-2 rounded-full" style={{ background: color }} />
                    {preset.label}
                  </button>
                );
              })}
            </div>
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
              <Field label="Свой статус">
                <Input {...bind("status")} placeholder="Ждём медиакит" />
              </Field>
              <div className="flex h-11 items-center gap-1.5">
                {(Object.keys(mediaStatusColorMap) as BloggerStatusColor[]).map((color) => (
                  <button
                    key={color}
                    type="button"
                    aria-label={color}
                    onClick={() => set("status_color")(color)}
                    className="flex h-8 w-8 items-center justify-center rounded-full border transition"
                    style={{
                      background: mediaStatusColorMap[color],
                      borderColor: draft.status_color === color ? "var(--theme-text)" : "transparent",
                      boxShadow: draft.status_color === color ? `0 0 16px ${mediaStatusColorMap[color]}` : "none"
                    }}
                  >
                    {draft.status_color === color ? <Check className="h-4 w-4 text-white" /> : null}
                  </button>
                ))}
              </div>
            </div>
          </Section>

          <Section title="Предложение">
            <Field label="Формат размещения" hint="каждый пункт с новой строки">
              <Textarea {...bind("formats")} placeholder={"1 рекламный Reel\n1 Stories бесплатно"} />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Цена">
                <Input {...bind("price")} placeholder="3 150 AED" />
              </Field>
              <Field label="Пояснение к цене">
                <Input {...bind("price_note")} placeholder="≈ $858 · предложенная цена" />
              </Field>
              <Field label="Цена при условиях">
                <Input {...bind("price_alt")} placeholder="2 250 AED" />
              </Field>
              <Field label="Какие условия">
                <Input {...bind("price_alt_note")} placeholder="≈ $613 · подписка, отметка, хештег" />
              </Field>
            </div>
            <Field label="Условия оплаты">
              <Input {...bind("payment_terms")} placeholder="Предоплата 50%, остаток — до публикации" />
            </Field>
            <Field label="Предложение действует до">
              <Input {...bind("offer_until")} type="date" />
            </Field>
            <Field label="Что нужно уточнить">
              <Textarea {...bind("open_questions")} className="min-h-20" placeholder="Кто снимает Reel, сроки, права использования" />
            </Field>
          </Section>

          <Section title="Ссылки и логотип">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Instagram">
                <Input {...bind("instagram_url")} placeholder="https://instagram.com/…" />
              </Field>
              <Field label="Сайт">
                <Input {...bind("website_url")} placeholder="https://…" />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Другая ссылка" hint="Telegram, медиакит, YouTube">
                  <Input {...bind("extra_url")} placeholder="https://…" />
                </Field>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
              <Field label="Логотип">
                <Input {...bind("logo_url")} placeholder="URL логотипа" />
              </Field>
              <label
                className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-2xl border px-4 text-sm transition hover:bg-[var(--theme-surface-strong)]"
                style={{ borderColor: "var(--theme-border)", background: "var(--theme-surface-soft)", color: "var(--theme-text)" }}
              >
                Загрузить
                <input type="file" accept="image/*" className="hidden" onChange={(event) => event.target.files?.[0] && uploadLogo(event.target.files[0])} />
              </label>
            </div>
          </Section>

          <Section title="Заметки">
            <Textarea {...bind("notes")} placeholder="Контакт менеджера, договорённости, история переписки." />
          </Section>
        </div>

        <div className="min-w-0">
          <div className="space-y-4 lg:sticky lg:top-0">
            <div className="label">Превью карточки</div>
            <MediaOutletCard outlet={previewOutlet} interactive={false} />
            <div className="flex items-center justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Отмена
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Сохраняю..." : "Сохранить"}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </Dialog>
  );
}
