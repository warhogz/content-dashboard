"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SearchBar } from "@/components/search-bar";
import { FilterBar } from "@/components/filter-bar";
import { AdminCardEditor } from "@/components/admin-card-editor";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { StatusManager } from "@/components/status-manager";
import { TypeManager } from "@/components/type-manager";
import { ContentCard, CardTypeRow, StatusRow } from "@/lib/types";
import { useToast } from "@/components/ui/toast";
import { deleteCardAction, duplicateCardAction, toggleCardHiddenAction, toggleCardPinnedAction } from "@/lib/supabase/actions";
import { CardItem } from "@/components/card-item";

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
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<ContentCard | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const filteredCards = useMemo(() => {
    return data.cards.filter((card) => {
      const text = `${card.title} ${card.subtitle || ""} ${card.notes || ""}`.toLowerCase();
      const matchesSearch = text.includes(search.toLowerCase());
      const matchesType = selectedType ? card.type_id === selectedType : true;
      const matchesStatus = selectedStatus ? card.status_id === selectedStatus : true;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [data.cards, search, selectedType, selectedStatus]);

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
    toast.push({ title: res.ok ? "Deleted" : "Error", description: res.message });
    router.refresh();
  };

  const duplicateCard = async (id: string) => {
    const formData = new FormData();
    formData.set("id", id);
    const res = await duplicateCardAction(formData);
    toast.push({ title: res.ok ? "Duplicated" : "Error", description: res.message });
    router.refresh();
  };

  const toggleHidden = async (card: ContentCard) => {
    const formData = new FormData();
    formData.set("id", card.id);
    formData.set("is_hidden", String(card.is_hidden));
    const res = await toggleCardHiddenAction(formData);
    toast.push({ title: res.ok ? "Updated" : "Error", description: res.message });
    router.refresh();
  };

  const togglePinned = async (card: ContentCard) => {
    const formData = new FormData();
    formData.set("id", card.id);
    formData.set("is_pinned", String(card.is_pinned));
    const res = await toggleCardPinnedAction(formData);
    toast.push({ title: res.ok ? "Updated" : "Error", description: res.message });
    router.refresh();
  };

  return (
    <main className="page-shell py-6 sm:py-8">
      <div className="mb-6 rounded-[32px] border border-white/10 bg-white/6 p-5 shadow-2xl shadow-black/20 backdrop-blur-2xl sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="label">Workspace</div>
            <CardTitle className="mt-2 text-2xl sm:text-3xl">Content Cards</CardTitle>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:min-w-[320px]">
            <div className="rounded-2xl border border-white/10 bg-white/6 p-4">
              <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">Cards</div>
              <div className="mt-2 text-2xl font-semibold text-white">{data.cards.length}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/6 p-4">
              <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">Statuses</div>
              <div className="mt-2 text-2xl font-semibold text-white">{data.statuses.length}</div>
            </div>
            <div className="col-span-2 rounded-2xl border border-white/10 bg-white/6 p-4 sm:col-span-1">
              <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">Types</div>
              <div className="mt-2 text-2xl font-semibold text-white">{data.types.length}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6 grid gap-3 rounded-[28px] border border-white/10 bg-white/5 p-4 shadow-soft backdrop-blur-2xl xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
        <SearchBar value={search} onChange={setSearch} />
        <FilterBar
          types={data.types}
          statusIds={data.statuses}
          selectedType={selectedType}
          selectedStatus={selectedStatus}
          onTypeChange={setSelectedType}
          onStatusChange={setSelectedStatus}
          onReset={() => { setSelectedType(""); setSelectedStatus(""); setSearch(""); }}
        />
        <Button className="xl:self-start" onClick={openNew}>New card</Button>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {filteredCards.map((card) => (
          <div key={card.id} className="flex h-full flex-col gap-3">
            <CardItem
              item={card}
              onCopy={duplicateCard}
              onToggleHidden={() => toggleHidden(card)}
              onTogglePinned={() => togglePinned(card)}
              compact
            />
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => openEdit(card)}>Edit</Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(card.id)}>Delete</Button>
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
