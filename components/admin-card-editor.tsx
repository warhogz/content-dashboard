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
import { CardAspectRatio, CardCropMode, CardTypeRow, ContentCard, StatusRow } from "@/lib/types";
import { upsertCardAction } from "@/lib/supabase/actions";
import { ImagePreview } from "@/components/image-preview";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const aspectPresets: CardAspectRatio[] = ["9:16", "16:9", "1:1", "4:5", "custom"];
const cropPresets: CardCropMode[] = ["cover", "contain", "crop"];

function clampHeight(value: number) {
  return Math.max(80, Math.min(1200, value));
}

const toggleLabelClass = "flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/85 transition hover:bg-white/8";
const uploadLabelClass = "inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/85 transition hover:bg-white/8";

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

  const [preview, setPreview] = useState({
    aspect_ratio: card?.aspect_ratio || "custom",
    height_px: card?.height_px || 320,
    crop_mode: card?.crop_mode || "cover"
  });

  useEffect(() => {
    setThumbnailUrl(card?.thumbnail_url || "");
    setPreview({
      aspect_ratio: card?.aspect_ratio || "custom",
      height_px: card?.height_px || 320,
      crop_mode: card?.crop_mode || "cover"
    });
  }, [card, open]);

  const typeDefaults = types.find((t) => t.id === (card?.type_id || types[0]?.id));
  const currentHeight = preview.height_px || typeDefaults?.default_height_px || 320;

  const uploadImage = async (file: File) => {
    if (!supabase) {
      toast.push({ title: "Supabase not configured", description: "Use a direct image URL for now." });
      return;
    }
    const ext = file.name.split(".").pop() || "jpg";
    const path = `cards/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("thumbnails").upload(path, file, { upsert: true });
    if (error) {
      toast.push({ title: "Upload failed", description: error.message });
      return;
    }
    const { data } = supabase.storage.from("thumbnails").getPublicUrl(path);
    setThumbnailUrl(data.publicUrl);
    toast.push({ title: "Image uploaded" });
  };

  const typeId = card?.type_id || types[0]?.id || "";
  const statusId = card?.status_id || statuses[0]?.id || "";

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("thumbnail_url", thumbnailUrl || card?.thumbnail_url || "");
    startTransition(async () => {
      const result = await upsertCardAction(formData);
      if (!result.ok) {
        toast.push({ title: "Could not save card", description: result.message });
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
      description="Quick content management without extra clutter"
      className="sm:max-w-4xl"
    >
      <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[1fr_0.95fr]">
        <input type="hidden" name="id" defaultValue={card?.id || ""} />
        <input type="hidden" name="thumbnail_url" value={thumbnailUrl || card?.thumbnail_url || ""} />

        <div className="space-y-4">
          <Card>
            <CardContent className="space-y-4 p-5">
              <div>
                <CardTitle>Main fields</CardTitle>
                <CardDescription className="mt-1">Title, type, status and link</CardDescription>
              </div>

              <div className="grid gap-3">
                <Input name="title" defaultValue={card?.title || ""} placeholder="Card title" />
                <div className="grid gap-3 md:grid-cols-2">
                  <Select name="type_id" defaultValue={typeId}>
                    {types.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
                  </Select>
                  <Select name="status_id" defaultValue={statusId}>
                    {statuses.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
                  </Select>
                </div>
                <Input name="link" defaultValue={card?.link || ""} placeholder="https://" />
                <Input name="subtitle" defaultValue={card?.subtitle || ""} placeholder="Subtitle" />
                <Textarea name="notes" defaultValue={card?.notes || ""} placeholder="Admin note" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4 p-5">
              <div>
                <CardTitle>Display settings</CardTitle>
                <CardDescription className="mt-1">Aspect ratio, height and crop mode</CardDescription>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Select
                  name="aspect_ratio"
                  defaultValue={card?.aspect_ratio || "custom"}
                  onChange={(e) => setPreview((p) => ({ ...p, aspect_ratio: e.target.value as CardAspectRatio }))}
                >
                  {aspectPresets.map((p) => <option key={p} value={p}>{p}</option>)}
                </Select>
                <Select
                  name="crop_mode"
                  defaultValue={card?.crop_mode || "cover"}
                  onChange={(e) => setPreview((p) => ({ ...p, crop_mode: e.target.value as CardCropMode }))}
                >
                  {cropPresets.map((p) => <option key={p} value={p}>{p}</option>)}
                </Select>
              </div>

              <Input
                name="height_px"
                type="number"
                min={80}
                max={1200}
                defaultValue={card?.height_px || typeDefaults?.default_height_px || 320}
                onChange={(e) => setPreview((p) => ({ ...p, height_px: clampHeight(Number(e.target.value || currentHeight)) }))}
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <label className={toggleLabelClass}>
                  <Checkbox name="is_hidden" defaultChecked={card?.is_hidden || false} /> Hide on public page
                </label>
                <label className={toggleLabelClass}>
                  <Checkbox name="is_pinned" defaultChecked={card?.is_pinned || false} /> Pin to top
                </label>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardContent className="space-y-4 p-5">
              <div>
                <CardTitle>Preview</CardTitle>
                <CardDescription className="mt-1">Upload a file or paste an image URL</CardDescription>
              </div>
              <ImagePreview
                src={thumbnailUrl || card?.thumbnail_url}
                alt={card?.title || "Preview"}
                aspectRatio={preview.aspect_ratio}
                heightPx={preview.height_px || typeDefaults?.default_height_px || 320}
                cropMode={preview.crop_mode}
              />
              <Input
                value={thumbnailUrl}
                onChange={(e) => setThumbnailUrl(e.target.value)}
                placeholder="Image URL"
              />
              <div>
                <label className={uploadLabelClass}>
                  Upload image
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0])} />
                </label>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>{pending ? "Saving..." : "Save"}</Button>
          </div>
        </div>
      </form>
    </Dialog>
  );
}
