"use client";

import { useEffect, useMemo, useState, useTransition, type FormEvent } from "react";
import { BloggerCard } from "@/components/blogger-card";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { optimizeImageForUpload } from "@/lib/image-optimizer";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { upsertBloggerAction } from "@/lib/supabase/blogger-actions";
import { BloggerRow } from "@/lib/types";

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

type UploadKind = "avatar" | "profile";

export function AdminBloggerEditor({
  open,
  onOpenChange,
  blogger,
  onSaved
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  blogger: BloggerRow | null;
  onSaved?: () => void;
}) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [avatarUrl, setAvatarUrl] = useState(blogger?.avatar_url || "");
  const [profileScreenshotUrl, setProfileScreenshotUrl] = useState(blogger?.profile_screenshot_url || "");
  const [displayName, setDisplayName] = useState(blogger?.display_name || "");
  const [username, setUsername] = useState(blogger?.username || "");
  const [followers, setFollowers] = useState(blogger?.followers ? String(blogger.followers) : "");
  const [price, setPrice] = useState(blogger?.price || "");
  const [priceDescription, setPriceDescription] = useState(blogger?.price_description || "");
  const [status, setStatus] = useState(blogger?.status || "");
  const [notes, setNotes] = useState(blogger?.notes || "");
  const [instagramUrl, setInstagramUrl] = useState(blogger?.instagram_url || "");
  const [scriptUrl, setScriptUrl] = useState(blogger?.script_url || "");

  useEffect(() => {
    setAvatarUrl(blogger?.avatar_url || "");
    setProfileScreenshotUrl(blogger?.profile_screenshot_url || "");
    setDisplayName(blogger?.display_name || "");
    setUsername(blogger?.username || "");
    setFollowers(blogger?.followers ? String(blogger.followers) : "");
    setPrice(blogger?.price || "");
    setPriceDescription(blogger?.price_description || "");
    setStatus(blogger?.status || "");
    setNotes(blogger?.notes || "");
    setInstagramUrl(blogger?.instagram_url || "");
    setScriptUrl(blogger?.script_url || "");
  }, [blogger, open]);

  const previewBlogger: BloggerRow = {
    id: blogger?.id || "preview",
    display_name: displayName || "Имя блогера",
    username: username || null,
    avatar_url: avatarUrl || null,
    profile_screenshot_url: profileScreenshotUrl || null,
    followers: followers ? Number(followers.replace(/[^\d]/g, "")) || null : null,
    price: price || null,
    price_description: priceDescription || null,
    status: status || null,
    notes: notes || null,
    instagram_url: instagramUrl || null,
    script_url: scriptUrl || null
  };

  const uploadImage = async (file: File, kind: UploadKind) => {
    if (!supabase) {
      toast.push({ title: "Supabase не настроен", description: "Пока можно использовать прямую ссылку на изображение." });
      return;
    }

    const optimized = await optimizeImageForUpload(file, { maxDimension: 1600, quality: 0.82 });
    const uploadFile = optimized.file;
    const ext = extensionFromMimeType(uploadFile.type);
    const path = `bloggers/${kind}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("thumbnails").upload(path, uploadFile, {
      upsert: true,
      contentType: uploadFile.type
    });

    if (error) {
      toast.push({ title: "Ошибка загрузки", description: error.message });
      return;
    }

    const { data } = supabase.storage.from("thumbnails").getPublicUrl(path);
    if (kind === "avatar") {
      setAvatarUrl(data.publicUrl);
    } else {
      setProfileScreenshotUrl(data.publicUrl);
    }

    toast.push({
      title: optimized.changed ? "Изображение оптимизировано и загружено" : "Изображение загружено",
      description: optimized.changed ? `${formatFileSize(optimized.originalSize)} -> ${formatFileSize(optimized.optimizedSize)}` : undefined
    });
  };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set("avatar_url", avatarUrl);
    formData.set("profile_screenshot_url", profileScreenshotUrl);

    startTransition(async () => {
      const result = await upsertBloggerAction(formData);
      if (!result.ok) {
        toast.push({ title: "Не удалось сохранить блогера", description: result.message });
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
      title={blogger ? "Редактировать блогера" : "Новый блогер"}
      description="Отдельная CRM-карточка для работы с инфлюенсером без переходов и лишних экранов."
      className="sm:max-w-5xl"
    >
      <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[1fr_0.92fr]">
        <input type="hidden" name="id" defaultValue={blogger?.id || ""} />
        <input type="hidden" name="avatar_url" value={avatarUrl} />
        <input type="hidden" name="profile_screenshot_url" value={profileScreenshotUrl} />

        <div className="space-y-4">
          <Card>
            <CardContent className="space-y-4 p-5">
              <div>
                <CardTitle>Профиль блогера</CardTitle>
                <CardDescription className="mt-1">Имя, username, ссылки и всё, что видно на карточке сразу.</CardDescription>
              </div>

              <div className="grid gap-3">
                <Input name="display_name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Имя блогера" />
                <Input name="username" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="@username" />
                <Input name="followers" value={followers} onChange={(event) => setFollowers(event.target.value)} placeholder="165000" />
                <Input name="status" value={status} onChange={(event) => setStatus(event.target.value)} placeholder="Ждёт ответа / Переговоры / Готов к работе" />
                <Input name="instagram_url" value={instagramUrl} onChange={(event) => setInstagramUrl(event.target.value)} placeholder="Instagram URL" />
                <Input name="script_url" value={scriptUrl} onChange={(event) => setScriptUrl(event.target.value)} placeholder="Script URL" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4 p-5">
              <div>
                <CardTitle>Цена и заметки</CardTitle>
                <CardDescription className="mt-1">Цена — главный акцент карточки, notes — короткий CRM-контекст.</CardDescription>
              </div>

              <div className="grid gap-3">
                <Input name="price" value={price} onChange={(event) => setPrice(event.target.value)} placeholder="4 000 $" />
                <Input name="price_description" value={priceDescription} onChange={(event) => setPriceDescription(event.target.value)} placeholder="за Reels / за интеграцию / По запросу" />
                <Textarea name="notes" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Короткая заметка по переговорам, дедлайнам, договорённостям." />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4 p-5">
              <div>
                <CardTitle>Изображения</CardTitle>
                <CardDescription className="mt-1">Аватар и скриншот профиля загружаются отдельно и показываются прямо на карточке.</CardDescription>
              </div>

              <div className="grid gap-4">
                <Input value={avatarUrl} onChange={(event) => setAvatarUrl(event.target.value)} placeholder="Avatar URL" />
                <label
                  className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm transition hover:bg-[var(--theme-surface-strong)]"
                  style={{ borderColor: "var(--theme-border)", background: "var(--theme-surface-soft)", color: "var(--theme-text)" }}
                >
                  Загрузить аватар
                  <input type="file" accept="image/*" className="hidden" onChange={(event) => event.target.files?.[0] && uploadImage(event.target.files[0], "avatar")} />
                </label>

                <Input value={profileScreenshotUrl} onChange={(event) => setProfileScreenshotUrl(event.target.value)} placeholder="Profile screenshot URL" />
                <label
                  className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm transition hover:bg-[var(--theme-surface-strong)]"
                  style={{ borderColor: "var(--theme-border)", background: "var(--theme-surface-soft)", color: "var(--theme-text)" }}
                >
                  Загрузить скриншот профиля
                  <input type="file" accept="image/*" className="hidden" onChange={(event) => event.target.files?.[0] && uploadImage(event.target.files[0], "profile")} />
                </label>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardContent className="space-y-4 p-5">
              <div>
                <CardTitle>Превью карточки</CardTitle>
                <CardDescription className="mt-1">Карточка самодостаточная: именно так блогер будет выглядеть в основном grid.</CardDescription>
              </div>

              <BloggerCard blogger={previewBlogger} />
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
