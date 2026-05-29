"use client";

import { useMemo, useState } from "react";
import { StatusSection } from "@/components/status-section";
import { EmptyState } from "@/components/empty-state";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { CardTypeRow, ContentCard, StatusRow } from "@/lib/types";

function cardDateValue(card: ContentCard) {
  return card.created_at ? new Date(card.created_at).getTime() : 0;
}

export function PublicDashboard({
  statuses,
  types,
  cards
}: {
  statuses: StatusRow[];
  types: CardTypeRow[];
  cards: ContentCard[];
}) {
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedType, setSelectedType] = useState("");

  const filteredCards = useMemo(() => {
    return cards
      .filter((card) => {
        if (card.is_hidden) return false;
        if (selectedStatus && card.status_id !== selectedStatus) return false;
        if (selectedType && card.type_id !== selectedType) return false;
        return true;
      })
      .sort((a, b) => Number(b.is_pinned) - Number(a.is_pinned) || cardDateValue(b) - cardDateValue(a) || b.sort_order - a.sort_order);
  }, [cards, selectedStatus, selectedType]);

  const visibleStatuses = useMemo(() => {
    if (selectedStatus) {
      return statuses.filter((status) => status.id === selectedStatus);
    }

    const ids = new Set(filteredCards.map((card) => card.status_id));
    return statuses.filter((status) => ids.has(status.id));
  }, [filteredCards, selectedStatus, statuses]);

  return (
    <div className="space-y-8">
      <div className="rounded-[30px] border border-white/10 bg-white/5 p-4 backdrop-blur-2xl">
        <div className="mb-3 flex items-center justify-between gap-4">
          <div className="label">Фильтры</div>
          {(selectedStatus || selectedType) ? <div className="text-xs text-white/45">Подборка обновлена</div> : null}
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_1fr_auto]">
          <Select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
            <option value="">Все статусы</option>
            {statuses.map((status) => <option key={status.id} value={status.id}>{status.title}</option>)}
          </Select>
          <Select value={selectedType} onChange={(e) => setSelectedType(e.target.value)}>
            <option value="">Все типы</option>
            {types.map((type) => <option key={type.id} value={type.id}>{type.title}</option>)}
          </Select>
          <Button
            className="md:col-span-2 xl:col-span-1"
            variant="outline"
            onClick={() => {
              setSelectedStatus("");
              setSelectedType("");
            }}
          >
            Сбросить
          </Button>
        </div>
      </div>

      {filteredCards.length ? (
        <div className="grid gap-8">
          {visibleStatuses.map((status) => <StatusSection key={status.id} status={status} cards={filteredCards} />)}
        </div>
      ) : (
        <EmptyState title="Ничего не найдено" description="Попробуй другой статус или тип карточки." />
      )}
    </div>
  );
}
