"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/toast";
import { deleteTypeAction, upsertTypeAction } from "@/lib/supabase/actions";
import { CardTypeRow } from "@/lib/types";

export function TypeManager({ types }: { types: CardTypeRow[] }) {
  const toast = useToast();
  const [selected, setSelected] = useState<CardTypeRow | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await upsertTypeAction(formData);
      toast.push({ title: res.ok ? "Тип сохранён" : "Ошибка", description: res.message });
      if (res.ok) setSelected(null);
    });
  }

  function del(id: string) {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("id", id);
      const res = await deleteTypeAction(formData);
      toast.push({ title: res.ok ? "Тип удалён" : "Ошибка", description: res.message });
    });
  }

  return (
    <div className="grid gap-4">
      <Card>
        <CardContent className="space-y-4 p-5">
          <div>
            <CardTitle>Типы карточек</CardTitle>
            <CardDescription className="mt-1">Собственные типы с дефолтным соотношением сторон, высотой и crop mode.</CardDescription>
          </div>
          <form key={selected?.id || "new"} onSubmit={submit} className="grid gap-3 md:grid-cols-[1fr_1fr_160px_120px_1fr_auto]">
            <input type="hidden" name="id" value={selected?.id || ""} />
            <Input name="title" placeholder="Название" defaultValue={selected?.title || ""} />
            <Input name="slug" placeholder="slug" defaultValue={selected?.slug || ""} />
            <Select name="default_aspect_ratio" defaultValue={selected?.default_aspect_ratio || "custom"}>
              {["9:16", "16:9", "1:1", "4:5", "custom"].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </Select>
            <Input name="default_height_px" type="number" placeholder="Высота" defaultValue={selected?.default_height_px || 320} />
            <Select name="default_crop_mode" defaultValue={selected?.default_crop_mode || "cover"}>
              {["cover", "contain", "crop"].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </Select>
            <label className="flex items-center gap-2 rounded-2xl border px-3 text-sm" style={{ borderColor: "var(--theme-border)", background: "var(--theme-surface-soft)", color: "var(--theme-text)" }}>
              <Checkbox name="is_active" defaultChecked={selected?.is_active ?? true} /> Активен
            </label>
            <div className="md:col-start-6">
              <Button type="submit" disabled={pending}>
                {selected ? "Обновить" : "Добавить"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      <div className="grid gap-3">
        {types.map((type) => (
          <Card key={type.id}>
            <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="font-medium" style={{ color: "var(--theme-text)" }}>
                  {type.title}
                </div>
                <div className="text-sm" style={{ color: "var(--theme-text-muted)" }}>
                  {type.slug} · {type.default_aspect_ratio} · {type.default_height_px}px · {type.default_crop_mode}
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setSelected(type)}>
                  Редактировать
                </Button>
                <Button variant="ghost" onClick={() => del(type.id)}>
                  Удалить
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
