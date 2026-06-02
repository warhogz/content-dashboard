"use client";

import { useEffect, useMemo, useState, useTransition, type FormEvent } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/toast";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { ProjectSegmentedToggle } from "@/components/project-segmented-toggle";
import { CardAspectRatio, CardCropMode, CardTypeRow, ContentCard, ProjectKey, StatusRow } from "@/lib/types";
import { upsertCardAction } from "@/lib/supabase/actions";
import { ImagePreview } from "@/components/image-preview";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { optimizeImageForUpload } from "@/lib/image-optimizer";

const aspectPresets: CardAspectRatio[] = ["9:16", "16:9", "1:1", "4:5", "custom"];
const cropPresets: CardCropMode[] = ["cover", "contain", "crop"];

function clampHeight(value: number) {
  return Math.max(80, Math.min(1200, value));
}

const toggleLabelClass =
  "flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm transition hover:bg-[var(--theme-surface-strong)]";
const uploadLabelClass =
  "inline-flex cursor-pointer items-center gap-2 rounded-2xl border px-4 py-3 text-sm transition hover:bg-[var(--theme-surface-strong)]";

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
    case "image/jpeg":
      return "jpg";
    case "image/avif":
      return "avif";
    default:
      return "jpg";
  }
}

export function AdminCardEditor({
  open,
  onOpenChange,
  card,
  statuses,
  types,
  onSaved
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card: ContentCard | null;
  statuses: StatusRow[];
  types: CardTypeRow[];
  onSaved?: () => void;
}) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [thumbnailUrl, setThumbnailUrl] = useState(card?.thumbnail_url || "");
  const [projectKey, setProjectKey] = useState<ProjectKey>(card?.project_key || "main");
  const [preview, setPreview] = useState({
    aspect_ratio: card?.aspect_ratio || "custom",
    height_px: card?.height_px || 320,
    crop_mode: card?.crop_mode || "cover"
  });

  useEffect(() => {
    setThumbnailUrl(card?.thumbnail_url || "");
    setProjectKey(card?.project_key || "main");
    setPreview({
      aspect_ratio: card?.aspect_ratio || "custom",
      height_px: card?.height_px || 320,
      crop_mode: card?.crop_mode || "cover"
    });
  }, [card, open]);

  const typeDefaults = types.find((type) => type.id === (card?.type_id || types[0]?.id));
  const currentHeight = preview.height_px || typeDefaults?.default_height_px || 320;
  const typeId = card?.type_id || types[0]?.id || "";
  const availableStatusIds = new Set(statuses.map((status) => status.id));
  const statusId =
    (card?.archived_from_status_id && availableStatusIds.has(card.archived_from_status_id) ? card.archived_from_status_id : null) ||
    (card?.status_id && availableStatusIds.has(card.status_id) ? card.status_id : null) ||
    statuses[0]?.id ||
    "";

  const uploadImage = async (file: File) => {
    if (!supabase) {
      toast.push({ title: "Supabase не настроен", description: "Пока можно использовать прямую ссылку на изображение." });
      return;
    }

    const optimized = await optimizeImageForUpload(file, { maxDimension: 1600, quality: 0.82 });
    const uploadFile = optimized.file;
    const ext = extensionFromMimeType(uploadFile.type);
    const path = `cards/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("thumbnails").upload(path, uploadFile, {
      upsert: true,
      contentType: uploadFile.type
    });

    if (error) {
      toast.push({ title: "Ошибка загрузки", description: error.message });
      return;
    }

    const { data } = supabase.storage.from("thumbnails").getPublicUrl(path);
    setThumbnailUrl(data.publicUrl);
    toast.push({
      title: optimized.changed ? "Изображение оптимизировано и загружено" : "Изображение загружено",
      description: optimized.changed ? `${formatFileSize(optimized.originalSize)} -> ${formatFileSize(optimized.optimizedSize)}` : undefined
    });
  };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    formData.set("thumbnail_url", thumbnailUrl || card?.thumbnail_url || "");
    formData.set("project_key", projectKey);

    startTransition(async () => {
      const result = await upsertCardAction(formData);
      if (!result.ok) {
        toast.push({ title: "Не удалось сохранить карточку", description: result.message });
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
      title={card ? "Редактировать карточку" : "Новая карточка"}
      description="Быстрое управление контентом без лишнего шума"
      className="sm:max-w-4xl"
    >
      <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[1fr_0.95fr]">
        <input type="hidden" name="id" defaultValue={card?.id || ""} />
        <input type="hidden" name="thumbnail_url" value={thumbnailUrl || card?.thumbnail_url || ""} />
        <input type="hidden" name="project_key" value={projectKey} />

        <div className="space-y-4">
          <Card>
            <CardContent className="space-y-4 p-5">
              <div>
                <CardTitle>Основные поля</CardTitle>
                <CardDescription className="mt-1">Название, проект, тип, статус и ссылка.</CardDescription>
              </div>

              <div className="grid gap-3">
                <Input name="title" defaultValue={card?.title || ""} placeholder="Название карточки" />
                <div className="space-y-2">
                  <div className="label">Проект</div>
                  <ProjectSegmentedToggle
                    value={projectKey}
                    onChange={setProjectKey}
                    options={[
                      { value: "main", label: "Main" },
                      { value: "mena", label: "Mena" }
                    ]}
                  />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <Select name="type_id" defaultValue={typeId}>
                    {types.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.title}
                      </option>
                    ))}
                  </Select>
                  <Select name="status_id" defaultValue={statusId}>
                    {statuses.map((status) => (
                      <option key={status.id} value={status.id}>
                        {status.title}
                      </option>
                    ))}
                  </Select>
                </div>
                <Input name="link" defaultValue={card?.link || ""} placeholder="https://" />
                <Input name="subtitle" defaultValue={card?.subtitle || ""} placeholder="Подзаголовок" />
                <Textarea name="notes" defaultValue={card?.notes || ""} placeholder="Внутренняя заметка" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4 p-5">
              <div>
                <CardTitle>Параметры отображения</CardTitle>
                <CardDescription className="mt-1">Соотношение сторон, высота и режим кадрирования.</CardDescription>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Select
                  name="aspect_ratio"
                  defaultValue={card?.aspect_ratio || "custom"}
                  onChange={(event) => setPreview((state) => ({ ...state, aspect_ratio: event.target.value as CardAspectRatio }))}
                >
                  {aspectPresets.map((preset) => (
                    <option key={preset} value={preset}>
                      {preset}
                    </option>
                  ))}
                </Select>
                <Select
                  name="crop_mode"
                  defaultValue={card?.crop_mode || "cover"}
                  onChange={(event) => setPreview((state) => ({ ...state, crop_mode: event.target.value as CardCropMode }))}
                >
                  {cropPresets.map((preset) => (
                    <option key={preset} value={preset}>
                      {preset}
                    </option>
                  ))}
                </Select>
              </div>

              <Input
                name="height_px"
                type="number"
                min={80}
                max={1200}
                defaultValue={card?.height_px || typeDefaults?.default_height_px || 320}
                onChange={(event) => setPreview((state) => ({ ...state, height_px: clampHeight(Number(event.target.value || currentHeight)) }))}
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <label className={toggleLabelClass} style={{ borderColor: "var(--theme-border)", background: "var(--theme-surface-soft)", color: "var(--theme-text)" }}>
                  <Checkbox name="is_hidden" defaultChecked={card?.is_hidden || false} /> Скрыть на публичной странице
                </label>
                <label className={toggleLabelClass} style={{ borderColor: "var(--theme-border)", background: "var(--theme-surface-soft)", color: "var(--theme-text)" }}>
                  <Checkbox name="is_pinned" defaultChecked={card?.is_pinned || false} /> Закрепить наверху
                </label>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardContent className="space-y-4 p-5">
              <div>
                <CardTitle>Превью</CardTitle>
                <CardDescription className="mt-1">Загрузи файл или вставь URL изображения.</CardDescription>
              </div>

              <ImagePreview
                src={thumbnailUrl || card?.thumbnail_url}
                alt={card?.title || "Превью"}
                aspectRatio={preview.aspect_ratio}
                heightPx={preview.height_px || typeDefaults?.default_height_px || 320}
                cropMode={preview.crop_mode}
              />

              <Input value={thumbnailUrl} onChange={(event) => setThumbnailUrl(event.target.value)} placeholder="URL изображения" />

              <div>
                <label className={uploadLabelClass} style={{ borderColor: "var(--theme-border)", background: "var(--theme-surface-soft)", color: "var(--theme-text)" }}>
                  Загрузить изображение
                  <input type="file" accept="image/*" className="hidden" onChange={(event) => event.target.files?.[0] && uploadImage(event.target.files[0])} />
                </label>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Сохраняю..." : "Сохранить"}
            </Button>
          </div>
        </div>
      </form>
    </Dialog>
  );
}
