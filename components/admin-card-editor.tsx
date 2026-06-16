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
import { ImagePreview } from "@/components/image-preview";
import { mergeCatalogValues } from "@/lib/plan/catalogs";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { upsertCardAction } from "@/lib/supabase/card-actions";
import { optimizeImageForUpload } from "@/lib/image-optimizer";
import { CardAspectRatio, CardCropMode, CardTypeRow, ContentCard, PlanMetadataCatalogs, ProjectKey, StatusRow } from "@/lib/types";

const aspectPresets: CardAspectRatio[] = ["9:16", "16:9", "1:1", "4:5", "custom"];
const cropPresets: CardCropMode[] = ["cover", "contain", "crop"];
const metadataOtherValue = "__other";
const toggleLabelClass =
  "flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm transition hover:bg-[var(--theme-surface-strong)]";
const uploadLabelClass =
  "inline-flex cursor-pointer items-center gap-2 rounded-2xl border px-4 py-3 text-sm transition hover:bg-[var(--theme-surface-strong)]";

type PresetFieldState = {
  preset: string;
  custom: string;
};

function clampHeight(value: number) {
  return Math.max(80, Math.min(1200, value));
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
    case "image/jpeg":
      return "jpg";
    case "image/avif":
      return "avif";
    default:
      return "jpg";
  }
}

function createPresetFieldState(value: string | null | undefined, options: readonly string[]): PresetFieldState {
  if (!value) return { preset: "", custom: "" };
  if (options.includes(value)) {
    return { preset: value, custom: "" };
  }
  return { preset: metadataOtherValue, custom: value };
}

function resolvePresetFieldValue(field: PresetFieldState) {
  if (!field.preset) return "";
  return field.preset === metadataOtherValue ? field.custom.trim() : field.preset;
}

function PresetField({
  label,
  value,
  options,
  otherPlaceholder,
  onChange
}: {
  label: string;
  value: PresetFieldState;
  options: readonly string[];
  otherPlaceholder: string;
  onChange: (value: PresetFieldState) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="label">{label}</div>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,0.92fr)]">
        <Select value={value.preset} onChange={(event) => onChange({ preset: event.target.value, custom: value.custom })}>
          <option value="">Not set</option>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
          <option value={metadataOtherValue}>Other</option>
        </Select>
        {value.preset === metadataOtherValue ? (
          <Input value={value.custom} onChange={(event) => onChange({ preset: value.preset, custom: event.target.value })} placeholder={otherPlaceholder} />
        ) : (
          <div
            className="hidden rounded-2xl border px-4 py-3 text-sm sm:flex sm:items-center"
            style={{ borderColor: "var(--theme-border-soft)", background: "var(--theme-surface-soft)", color: "var(--theme-text-muted)" }}
          >
            Select Other to enter a custom value
          </div>
        )}
      </div>
    </div>
  );
}

export function AdminCardEditor({
  open,
  onOpenChange,
  card,
  statuses,
  types,
  catalogs,
  onSaved
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card: ContentCard | null;
  statuses: StatusRow[];
  types: CardTypeRow[];
  catalogs: PlanMetadataCatalogs;
  onSaved?: () => void;
}) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [thumbnailUrl, setThumbnailUrl] = useState(card?.thumbnail_url || "");
  const [projectKey, setProjectKey] = useState<ProjectKey>(card?.project_key || "main");
  const [readyForPlan, setReadyForPlan] = useState(Boolean(card?.ready_for_plan));
  const [preview, setPreview] = useState({
    aspect_ratio: card?.aspect_ratio || "custom",
    height_px: card?.height_px || 320,
    crop_mode: card?.crop_mode || "cover"
  });
  const projectOptions = useMemo(() => mergeCatalogValues(catalogs.projects, card?.project_name ? [card.project_name] : []), [card?.project_name, catalogs.projects]);
  const roomOptions = useMemo(() => mergeCatalogValues(catalogs.rooms, card?.room_zone ? [card.room_zone] : []), [card?.room_zone, catalogs.rooms]);
  const [projectField, setProjectField] = useState<PresetFieldState>(() => createPresetFieldState(card?.project_name || null, projectOptions));
  const [roomField, setRoomField] = useState<PresetFieldState>(() => createPresetFieldState(card?.room_zone || null, roomOptions));

  useEffect(() => {
    setThumbnailUrl(card?.thumbnail_url || "");
    setProjectKey(card?.project_key || "main");
    setReadyForPlan(Boolean(card?.ready_for_plan));
    setPreview({
      aspect_ratio: card?.aspect_ratio || "custom",
      height_px: card?.height_px || 320,
      crop_mode: card?.crop_mode || "cover"
    });
    setProjectField(createPresetFieldState(card?.project_name || null, projectOptions));
    setRoomField(createPresetFieldState(card?.room_zone || null, roomOptions));
  }, [card, open, projectOptions, roomOptions]);

  const typeDefaults = types.find((type) => type.id === (card?.type_id || types[0]?.id));
  const currentHeight = preview.height_px || typeDefaults?.default_height_px || 320;
  const typeId = card?.type_id || types[0]?.id || "";
  const availableStatusIds = new Set(statuses.map((status) => status.id));
  const statusId =
    (card?.archived_from_status_id && availableStatusIds.has(card.archived_from_status_id) ? card.archived_from_status_id : null) ||
    (card?.status_id && availableStatusIds.has(card.status_id) ? card.status_id : null) ||
    statuses[0]?.id ||
    "";
  const resolvedProjectName = resolvePresetFieldValue(projectField);
  const resolvedRoomZone = resolvePresetFieldValue(roomField);

  const uploadImage = async (file: File) => {
    if (!supabase) {
      toast.push({ title: "Supabase is not configured", description: "For now you can keep using a direct image URL." });
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
      toast.push({ title: "Upload failed", description: error.message });
      return;
    }

    const { data } = supabase.storage.from("thumbnails").getPublicUrl(path);
    setThumbnailUrl(data.publicUrl);
    toast.push({
      title: optimized.changed ? "Image optimized and uploaded" : "Image uploaded",
      description: optimized.changed ? `${formatFileSize(optimized.originalSize)} -> ${formatFileSize(optimized.optimizedSize)}` : undefined
    });
  };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    formData.set("thumbnail_url", thumbnailUrl || card?.thumbnail_url || "");
    formData.set("project_key", projectKey);
    formData.set("project_name", resolvedProjectName);
    formData.set("room_zone", resolvedRoomZone);
    if (readyForPlan) {
      formData.set("ready_for_plan", "on");
    } else {
      formData.delete("ready_for_plan");
    }

    startTransition(async () => {
      const result = await upsertCardAction(formData);
      if (!result.ok) {
        toast.push({ title: "Failed to save card", description: result.message });
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
      title={card ? "Edit card" : "New card"}
      description="Fast content management without clutter."
      className="sm:max-w-4xl"
    >
      <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[1fr_0.95fr]">
        <input type="hidden" name="id" defaultValue={card?.id || ""} />
        <input type="hidden" name="thumbnail_url" value={thumbnailUrl || card?.thumbnail_url || ""} />
        <input type="hidden" name="project_key" value={projectKey} />
        <input type="hidden" name="project_name" value={resolvedProjectName} />
        <input type="hidden" name="room_zone" value={resolvedRoomZone} />

        <div className="space-y-4">
          <Card>
            <CardContent className="space-y-4 p-5">
              <div>
                <CardTitle>Core fields</CardTitle>
                <CardDescription className="mt-1">Title, project, type, status and main Dropbox link.</CardDescription>
              </div>

              <div className="grid gap-3">
                <Input name="title" defaultValue={card?.title || ""} placeholder="Card title" />
                <div className="space-y-2">
                  <div className="label">Project</div>
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
                <Input name="subtitle" defaultValue={card?.subtitle || ""} placeholder="Subtitle" />
                <Textarea name="notes" defaultValue={card?.notes || ""} placeholder="Internal note" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4 p-5">
              <div>
                <CardTitle>Display settings</CardTitle>
                <CardDescription className="mt-1">Aspect ratio, height and crop behavior for the public card.</CardDescription>
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
                <label
                  className={toggleLabelClass}
                  style={{ borderColor: "var(--theme-border)", background: "var(--theme-surface-soft)", color: "var(--theme-text)" }}
                >
                  <Checkbox name="is_hidden" defaultChecked={card?.is_hidden || false} /> Hide from public board
                </label>
                <label
                  className={toggleLabelClass}
                  style={{ borderColor: "var(--theme-border)", background: "var(--theme-surface-soft)", color: "var(--theme-text)" }}
                >
                  <Checkbox name="is_pinned" defaultChecked={card?.is_pinned || false} /> Pin to top
                </label>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4 p-5">
              <div>
                <CardTitle>Content metadata</CardTitle>
                <CardDescription className="mt-1">Optional planner metadata. The separate planner stays the main workflow, but you can fill it here too when it is convenient.</CardDescription>
              </div>

              <PresetField
                label="Project Name"
                value={projectField}
                options={projectOptions}
                otherPlaceholder="Custom project name"
                onChange={setProjectField}
              />

              <PresetField
                label="Room / Zone"
                value={roomField}
                options={roomOptions}
                otherPlaceholder="Custom room or zone"
                onChange={setRoomField}
              />
              <label
                className={toggleLabelClass}
                style={{ borderColor: "var(--theme-border)", background: "var(--theme-surface-soft)", color: "var(--theme-text)" }}
              >
                <Checkbox name="ready_for_plan" checked={readyForPlan} onChange={(event) => setReadyForPlan(event.target.checked)} /> Ready for plan
              </label>
            </CardContent>
          </Card>

        </div>

        <div className="space-y-4">
          <Card>
            <CardContent className="space-y-4 p-5">
              <div>
                <CardTitle>Preview</CardTitle>
                <CardDescription className="mt-1">Upload an image or paste an image URL.</CardDescription>
              </div>

              <ImagePreview
                src={thumbnailUrl || card?.thumbnail_url}
                alt={card?.title || "Preview"}
                aspectRatio={preview.aspect_ratio}
                heightPx={preview.height_px || typeDefaults?.default_height_px || 320}
                cropMode={preview.crop_mode}
              />

              <Input value={thumbnailUrl} onChange={(event) => setThumbnailUrl(event.target.value)} placeholder="Image URL" />

              <div>
                <label
                  className={uploadLabelClass}
                  style={{ borderColor: "var(--theme-border)", background: "var(--theme-surface-soft)", color: "var(--theme-text)" }}
                >
                  Upload image
                  <input type="file" accept="image/*" className="hidden" onChange={(event) => event.target.files?.[0] && uploadImage(event.target.files[0])} />
                </label>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </form>
    </Dialog>
  );
}
