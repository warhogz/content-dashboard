"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminMediaEditor } from "@/components/admin-media-editor";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyState } from "@/components/empty-state";
import { MediaFilterControls, mediaSummary, useMediaFilters } from "@/components/media-dashboard";
import { MediaOutletCard } from "@/components/media-outlet-card";
import { Button } from "@/components/ui/button";
import { CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { deleteMediaOutletAction } from "@/lib/supabase/media-actions";
import { MediaOutletRow } from "@/lib/types";

export function AdminMediaWorkspace({
  initialData
}: {
  initialData: { outlets: MediaOutletRow[] };
}) {
  const router = useRouter();
  const toast = useToast();
  const filters = useMediaFilters(initialData.outlets);
  const summary = mediaSummary(initialData.outlets);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingOutlet, setEditingOutlet] = useState<MediaOutletRow | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const openNew = () => {
    setEditingOutlet(null);
    setEditorOpen(true);
  };

  const openEdit = (outlet: MediaOutletRow) => {
    setEditingOutlet(outlet);
    setEditorOpen(true);
  };

  const deleteOutlet = async (id: string) => {
    const formData = new FormData();
    formData.set("id", id);
    const res = await deleteMediaOutletAction(formData);
    toast.push({ title: res.ok ? "Удалено" : "Ошибка", description: res.message });
    router.refresh();
  };

  return (
    <main className="page-shell py-6 sm:py-8">
      <div
        className="mb-6 rounded-[32px] border p-5 backdrop-blur-2xl sm:p-6"
        style={{
          borderColor: "var(--theme-border)",
          background: "var(--theme-panel-bg)",
          boxShadow: "var(--theme-shadow)"
        }}
      >
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="label">Workspace</div>
            <CardTitle className="mt-2 text-2xl sm:text-3xl">Press CRM</CardTitle>
            <div
              className="mt-4 inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-full border p-1 backdrop-blur-xl"
              style={{ borderColor: "var(--theme-border)", background: "var(--theme-surface-soft)", boxShadow: "var(--theme-shadow-lift)" }}
            >
              <Link href="/admin" className="rounded-full px-3 py-2 text-sm font-medium transition sm:px-4" style={{ color: "var(--theme-text-muted)" }}>
                Content
              </Link>
              <Link href="/admin/bloggers" className="rounded-full px-3 py-2 text-sm font-medium transition sm:px-4" style={{ color: "var(--theme-text-muted)" }}>
                Bloggers
              </Link>
              <span
                className="rounded-full px-3 py-2 text-sm font-medium sm:px-4"
                style={{
                  color: "var(--theme-text)",
                  background: "var(--theme-surface-strong)",
                  boxShadow: "0 0 0 1px var(--theme-border) inset, 0 10px 28px color-mix(in srgb, var(--theme-accent) 16%, transparent)"
                }}
              >
                Press
              </span>
              <Link href="/admin/plan" className="rounded-full px-3 py-2 text-sm font-medium transition sm:px-4" style={{ color: "var(--theme-text-muted)" }}>
                Plan
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:min-w-[320px]">
            {[
              { label: "Total", value: summary.total },
              { label: summary.reachUnit ? `Reach · ${summary.reachUnit}` : "Reach", value: summary.reachValue },
              { label: "Active", value: summary.active, wide: true }
            ].map((item) => (
              <div
                key={item.label}
                className={item.wide ? "col-span-2 rounded-2xl border p-4 sm:col-span-1" : "rounded-2xl border p-4"}
                style={{ borderColor: "var(--theme-border)", background: "var(--theme-surface-strong)" }}
              >
                <div className="text-[11px] uppercase tracking-[0.18em]" style={{ color: "var(--theme-text-muted)" }}>
                  {item.label}
                </div>
                <div className="mt-2 text-2xl font-semibold" style={{ color: "var(--theme-text)" }}>
                  {item.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div
        className="mb-6 grid gap-3 rounded-[28px] border p-4 backdrop-blur-2xl md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_240px_200px_auto]"
        style={{
          borderColor: "var(--theme-border)",
          background: "var(--theme-surface)",
          boxShadow: "var(--theme-shadow-lift)"
        }}
      >
        <MediaFilterControls filters={filters} />

        <div className="flex gap-3 xl:justify-end">
          <Button variant="outline" className="flex-1 xl:flex-none" onClick={filters.reset}>
            Сбросить
          </Button>
          <Button className="flex-1 xl:flex-none" onClick={openNew}>
            New outlet
          </Button>
        </div>
      </div>

      {filters.filtered.length ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {filters.filtered.map((outlet) => (
            <div key={outlet.id} className="flex h-full flex-col gap-3">
              <MediaOutletCard outlet={outlet} />
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => openEdit(outlet)}>
                  Edit
                </Button>
                <Button className="hover:bg-[var(--theme-button-ghost-hover)]" variant="ghost" size="sm" onClick={() => setConfirmDelete(outlet.id)}>
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title="Издания не найдены" description="Попробуй другой статус или добавь первое издание — можно просто вставить текст предложения." />
      )}

      <AdminMediaEditor open={editorOpen} onOpenChange={setEditorOpen} outlet={editingOutlet} onSaved={() => router.refresh()} />

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
        title="Delete outlet?"
        description="This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => {
          if (!confirmDelete) return;
          deleteOutlet(confirmDelete);
          setConfirmDelete(null);
        }}
      />
    </main>
  );
}
