"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminBloggerEditor } from "@/components/admin-blogger-editor";
import { BloggerCard } from "@/components/blogger-card";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyState } from "@/components/empty-state";
import { SearchBar } from "@/components/search-bar";
import { Button } from "@/components/ui/button";
import { CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { deleteBloggerAction } from "@/lib/supabase/blogger-actions";
import { BloggerRow } from "@/lib/types";

export function AdminBloggersWorkspace({
  initialData
}: {
  initialData: { bloggers: BloggerRow[] };
}) {
  const router = useRouter();
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingBlogger, setEditingBlogger] = useState<BloggerRow | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const statusOptions = useMemo(() => {
    return Array.from(new Set(initialData.bloggers.map((item) => item.status?.trim()).filter((value): value is string => Boolean(value)))).sort((a, b) =>
      a.localeCompare(b, "ru")
    );
  }, [initialData.bloggers]);

  const filteredBloggers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return [...initialData.bloggers]
      .filter((blogger) => {
        const matchesStatus = statusFilter ? (blogger.status || "") === statusFilter : true;
        const haystack = `${blogger.display_name} ${blogger.username || ""}`.toLowerCase();
        const matchesSearch = query ? haystack.includes(query) : true;
        return matchesStatus && matchesSearch;
      })
      .sort((a, b) => {
        const timeA = a.updated_at || a.created_at || "";
        const timeB = b.updated_at || b.created_at || "";
        return timeA < timeB ? 1 : -1;
      });
  }, [initialData.bloggers, search, statusFilter]);

  const openNew = () => {
    setEditingBlogger(null);
    setEditorOpen(true);
  };

  const openEdit = (blogger: BloggerRow) => {
    setEditingBlogger(blogger);
    setEditorOpen(true);
  };

  const deleteBlogger = async (id: string) => {
    const formData = new FormData();
    formData.set("id", id);
    const res = await deleteBloggerAction(formData);
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
            <CardTitle className="mt-2 text-2xl sm:text-3xl">Bloggers CRM</CardTitle>
            <div className="mt-4 inline-flex items-center gap-1 rounded-full border p-1 backdrop-blur-xl" style={{ borderColor: "var(--theme-border)", background: "var(--theme-surface-soft)", boxShadow: "var(--theme-shadow-lift)" }}>
              <Link href="/admin" className="rounded-full px-4 py-2 text-sm font-medium transition" style={{ color: "var(--theme-text-muted)" }}>
                Content
              </Link>
              <span
                className="rounded-full px-4 py-2 text-sm font-medium"
                style={{
                  color: "var(--theme-text)",
                  background: "var(--theme-surface-strong)",
                  boxShadow: "0 0 0 1px var(--theme-border) inset, 0 10px 28px color-mix(in srgb, var(--theme-accent) 16%, transparent)"
                }}
              >
                Bloggers
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:min-w-[320px]">
            {[
              { label: "Total", value: initialData.bloggers.length },
              { label: "Statuses", value: statusOptions.length },
              { label: "Instagram", value: initialData.bloggers.filter((item) => item.instagram_url).length, wide: true }
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
        className="mb-6 grid gap-3 rounded-[28px] border p-4 backdrop-blur-2xl xl:grid-cols-[minmax(0,1fr)_320px_auto]"
        style={{
          borderColor: "var(--theme-border)",
          background: "var(--theme-surface)",
          boxShadow: "var(--theme-shadow-lift)"
        }}
      >
        <SearchBar value={search} onChange={setSearch} placeholder="Поиск по имени или username" />

        <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option value="">Все статусы</option>
          {statusOptions.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </Select>

        <div className="flex gap-3 xl:justify-end">
          <Button
            variant="outline"
            onClick={() => {
              setSearch("");
              setStatusFilter("");
            }}
          >
            Сбросить
          </Button>
          <Button onClick={openNew}>New blogger</Button>
        </div>
      </div>

      {filteredBloggers.length ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {filteredBloggers.map((blogger) => (
            <div key={blogger.id} className="flex h-full flex-col gap-3">
              <BloggerCard blogger={blogger} />
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => openEdit(blogger)}>
                  Edit
                </Button>
                <Button className="hover:bg-[var(--theme-button-ghost-hover)]" variant="ghost" size="sm" onClick={() => setConfirmDelete(blogger.id)}>
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title="Блогеры не найдены" description="Попробуй другой статус или добавь первую карточку блогера." />
      )}

      <AdminBloggerEditor open={editorOpen} onOpenChange={setEditorOpen} blogger={editingBlogger} onSaved={() => router.refresh()} />

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
        title="Delete blogger?"
        description="This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => {
          if (!confirmDelete) return;
          deleteBlogger(confirmDelete);
          setConfirmDelete(null);
        }}
      />
    </main>
  );
}
