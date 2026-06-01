"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/toast";
import { deleteStatusAction, upsertStatusAction } from "@/lib/supabase/actions";
import { StatusRow } from "@/lib/types";

export function StatusManager({ statuses }: { statuses: StatusRow[] }) {
  const toast = useToast();
  const [selected, setSelected] = useState<StatusRow | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await upsertStatusAction(formData);
      toast.push({ title: res.ok ? "Статус сохранён" : "Ошибка", description: res.message });
      if (res.ok) setSelected(null);
    });
  }

  function del(id: string) {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("id", id);
      const res = await deleteStatusAction(formData);
      toast.push({ title: res.ok ? "Статус удалён" : "Ошибка", description: res.message });
    });
  }

  return (
    <div className="grid gap-4">
      <Card>
        <CardContent className="space-y-4 p-5">
          <div>
            <CardTitle>Статусы</CardTitle>
            <CardDescription className="mt-1">Добавление, переименование, цвет и видимость на публичной странице.</CardDescription>
          </div>
          <form key={selected?.id || "new"} onSubmit={submit} className="grid gap-3 md:grid-cols-[1fr_1fr_120px_1fr_auto]">
            <input type="hidden" name="id" value={selected?.id || ""} />
            <Input name="title" placeholder="Название" defaultValue={selected?.title || ""} />
            <Input name="slug" placeholder="slug" defaultValue={selected?.slug || ""} />
            <Input
              name="color"
              type="color"
              defaultValue={selected?.color || "#f43f5e"}
              className="h-11 w-full rounded-2xl p-1"
              style={{ borderColor: "var(--theme-border)", background: "var(--theme-surface-soft)", boxShadow: "none" }}
            />
            <div className="flex flex-wrap gap-3">
              <label className="flex items-center gap-2 rounded-2xl border px-3 text-sm" style={{ borderColor: "var(--theme-border)", background: "var(--theme-surface-soft)", color: "var(--theme-text)" }}>
                <Checkbox name="is_active" defaultChecked={selected?.is_active ?? true} /> Активен
              </label>
              <label className="flex items-center gap-2 rounded-2xl border px-3 text-sm" style={{ borderColor: "var(--theme-border)", background: "var(--theme-surface-soft)", color: "var(--theme-text)" }}>
                <Checkbox name="show_on_public" defaultChecked={selected?.show_on_public ?? true} /> Публичный
              </label>
            </div>
            <Button type="submit" disabled={pending}>
              {selected ? "Обновить" : "Добавить"}
            </Button>
          </form>
        </CardContent>
      </Card>
      <div className="grid gap-3">
        {statuses.map((status) => (
          <Card key={status.id}>
            <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="font-medium" style={{ color: "var(--theme-text)" }}>
                  {status.title}
                </div>
                <div className="text-sm" style={{ color: "var(--theme-text-muted)" }}>
                  {status.slug} · #{status.color.replace("#", "")}
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setSelected(status)}>
                  Редактировать
                </Button>
                <Button variant="ghost" onClick={() => del(status.id)}>
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
