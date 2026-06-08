"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminCardEditor } from "@/components/admin-card-editor";
import { CardItem } from "@/components/card-item";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { FilterBar } from "@/components/filter-bar";
import { ImagePreload } from "@/components/image-preload";
import { ProjectSegmentedToggle } from "@/components/project-segmented-toggle";
import { SearchBar } from "@/components/search-bar";
import { StatusManager } from "@/components/status-manager";
import { TypeManager } from "@/components/type-manager";
import { Button } from "@/components/ui/button";
import { CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { resolveCardPreviewUrl } from "@/lib/dropbox-links";
import { deleteCardAction, duplicateCardAction, toggleCardArchivedAction, toggleCardHiddenAction, toggleCardPinnedAction } from "@/lib/supabase/actions";
import { CardTypeRow, ContentCard, StatusRow } from "@/lib/types";

type AdminArchiveScope = "active" | "archive" | "all";

function cardDateValue(card: ContentCard) {
  return card.created_at ? new Date(card.created_at).getTime() : 0;
}

function archivedDateValue(card: ContentCard) {
  return card.archived_at ? new Date(card.archived_at).getTime() : 0;
}

export function AdminWorkspace({
  initialData
}: {
  initialData: { statuses: StatusRow[]; types: CardTypeRow[]; cards: ContentCard[] };
}) {
  const router = useRouter();
  const toast = useToast();
  const data = initialData;
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [archiveScope, setArchiveScope] = useState<AdminArchiveScope>("active");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<ContentCard | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const filteredCards = useMemo(() => {
    return data.cards
      .filter((card) => {
        if (archiveScope === "active" && card.is_archived) return false;
        if (archiveScope === "archive" && !card.is_archived) return false;

        const text = `${card.title} ${card.subtitle || ""} ${card.notes || ""}`.toLowerCase();
        const matchesSearch = text.includes(search.toLowerCase());
        const matchesType = selectedType ? card.type_id === selectedType : true;
        const matchesStatus = selectedStatus ? card.status_id === selectedStatus : true;
        return matchesSearch && matchesType && matchesStatus;
      })
      .sort((a, b) => {
        if (archiveScope === "archive") {
          return archivedDateValue(b) - archivedDateValue(a) || cardDateValue(b) - cardDateValue(a);
        }

        if (a.is_archived !== b.is_archived) {
          return Number(a.is_archived) - Number(b.is_archived);
        }

        return Number(b.is_pinned) - Number(a.is_pinned) || cardDateValue(b) - cardDateValue(a) || b.sort_order - a.sort_order;
      });
  }, [archiveScope, data.cards, search, selectedStatus, selectedType]);

  const preloadUrls = useMemo(
    () =>
      filteredCards
        .map((card) => resolveCardPreviewUrl(card.thumbnail_url))
        .filter((url): url is string => Boolean(url)),
    [filteredCards]
  );

  const activeCount = useMemo(() => data.cards.filter((card) => !card.is_archived).length, [data.cards]);
  const archiveCount = useMemo(() => data.cards.filter((card) => card.is_archived).length, [data.cards]);

  const openNew = () => {
    setEditingCard(null);
    setEditorOpen(true);
  };

  const openEdit = (card: ContentCard) => {
    setEditingCard(card);
    setEditorOpen(true);
  };

  const deleteCard = async (id: string) => {
    const formData = new FormData();
    formData.set("id", id);
    const res = await deleteCardAction(formData);
    toast.push({ title: res.ok ? "Удалено" : "Ошибка", description: res.message });
    router.refresh();
  };

  const duplicateCard = async (id: string) => {
    const formData = new FormData();
    formData.set("id", id);
    const res = await duplicateCardAction(formData);
    toast.push({ title: res.ok ? "Создан дубликат" : "Ошибка", description: res.message });
    router.refresh();
  };

  const toggleHidden = async (card: ContentCard) => {
    const formData = new FormData();
    formData.set("id", card.id);
    formData.set("is_hidden", String(card.is_hidden));
    const res = await toggleCardHiddenAction(formData);
    toast.push({ title: res.ok ? "Обновлено" : "Ошибка", description: res.message });
    router.refresh();
  };

  const togglePinned = async (card: ContentCard) => {
    const formData = new FormData();
    formData.set("id", card.id);
    formData.set("is_pinned", String(card.is_pinned));
    const res = await toggleCardPinnedAction(formData);
    toast.push({ title: res.ok ? "Обновлено" : "Ошибка", description: res.message });
    router.refresh();
  };

  const toggleArchived = async (card: ContentCard) => {
    const formData = new FormData();
    formData.set("id", card.id);
    formData.set("is_archived", String(card.is_archived));
    const res = await toggleCardArchivedAction(formData);
    toast.push({ title: res.ok ? "Обновлено" : "Ошибка", description: res.message });
    router.refresh();
  };

  return (
    <main className="page-shell py-6 sm:py-8">
      <ImagePreload urls={preloadUrls} concurrency={8} priorityCount={16} />

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
            <CardTitle className="mt-2 text-2xl sm:text-3xl">Content Cards</CardTitle>
            <div
              className="mt-4 inline-flex items-center gap-1 rounded-full border p-1 backdrop-blur-xl"
              style={{ borderColor: "var(--theme-border)", background: "var(--theme-surface-soft)", boxShadow: "var(--theme-shadow-lift)" }}
            >
              <span
                className="rounded-full px-4 py-2 text-sm font-medium"
                style={{
                  color: "var(--theme-text)",
                  background: "var(--theme-surface-strong)",
                  boxShadow: "0 0 0 1px var(--theme-border) inset, 0 10px 28px color-mix(in srgb, var(--theme-accent) 16%, transparent)"
                }}
              >
                Content
              </span>
              <Link href="/admin/bloggers" className="rounded-full px-4 py-2 text-sm font-medium transition" style={{ color: "var(--theme-text-muted)" }}>
                Bloggers
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:min-w-[320px]">
            {[
              { label: "Active", value: activeCount },
              { label: "Archive", value: archiveCount },
              { label: "Types", value: data.types.length, wide: true }
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
        className="mb-6 grid gap-3 rounded-[28px] border p-4 backdrop-blur-2xl xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
        style={{
          borderColor: "var(--theme-border)",
          background: "var(--theme-surface)",
          boxShadow: "var(--theme-shadow-lift)"
        }}
      >
        <div className="space-y-3">
          <ProjectSegmentedToggle
            value={archiveScope}
            onChange={setArchiveScope}
            options={[
              { value: "active", label: "Active" },
              { value: "archive", label: "Archive" },
              { value: "all", label: "All" }
            ]}
          />
          <SearchBar value={search} onChange={setSearch} />
        </div>

        <FilterBar
          types={data.types}
          statusIds={data.statuses}
          selectedType={selectedType}
          selectedStatus={selectedStatus}
          onTypeChange={setSelectedType}
          onStatusChange={setSelectedStatus}
          onReset={() => {
            setSelectedType("");
            setSelectedStatus("");
            setSearch("");
            setArchiveScope("active");
          }}
        />

        <Button className="xl:self-start" onClick={openNew}>
          New card
        </Button>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {filteredCards.map((card, index) => (
          <div key={card.id} className="flex h-full flex-col gap-3">
            <CardItem
              item={card}
              onCopy={duplicateCard}
              onToggleHidden={() => toggleHidden(card)}
              onTogglePinned={() => togglePinned(card)}
              onToggleArchived={() => toggleArchived(card)}
              compact
              imagePriority={index < 6 ? "high" : "auto"}
            />
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => openEdit(card)}>
                Edit
              </Button>
              <Button className="hover:bg-[var(--theme-button-ghost-hover)]" variant="ghost" size="sm" onClick={() => setConfirmDelete(card.id)}>
                Delete
              </Button>
            </div>
          </div>
        ))}
      </div>

      <AdminCardEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        card={editingCard}
        statuses={data.statuses}
        types={data.types}
        onSaved={() => router.refresh()}
      />

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
        title="Delete card?"
        description="This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => {
          if (!confirmDelete) return;
          deleteCard(confirmDelete);
          setConfirmDelete(null);
        }}
      />

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <StatusManager statuses={data.statuses} />
        <TypeManager types={data.types} />
      </div>
    </main>
  );
}
