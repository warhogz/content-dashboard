"use client";

import { useMemo, useState } from "react";
import { StatusSection } from "@/components/status-section";
import { EmptyState } from "@/components/empty-state";
import { ProjectSegmentedToggle } from "@/components/project-segmented-toggle";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { CardTypeRow, ContentCard, StatusRow } from "@/lib/types";

export type CardSortMode = "oldest" | "newest";
type ProjectScope = "all" | "mena";
const heroStatusSlugs = ["done", "waiting-feedback", "revisions"] as const;

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
  const [sortMode, setSortMode] = useState<CardSortMode>("oldest");
  const [projectScope, setProjectScope] = useState<ProjectScope>("all");

  const projectCards = useMemo(() => {
    const projectKey = projectScope === "mena" ? "mena" : "main";
    return cards.filter((card) => !card.is_hidden && (card.project_key || "main") === projectKey);
  }, [cards, projectScope]);

  const filteredCards = useMemo(() => {
    return projectCards
      .filter((card) => {
        if (selectedStatus && card.status_id !== selectedStatus) return false;
        if (selectedType && card.type_id !== selectedType) return false;
        return true;
      })
      .sort((a, b) => {
        const pinnedDiff = Number(b.is_pinned) - Number(a.is_pinned);
        if (pinnedDiff !== 0) return pinnedDiff;

        const dateDiff = sortMode === "newest" ? cardDateValue(b) - cardDateValue(a) : cardDateValue(a) - cardDateValue(b);
        if (dateDiff !== 0) return dateDiff;

        return sortMode === "newest" ? b.sort_order - a.sort_order : a.sort_order - b.sort_order;
      });
  }, [projectCards, selectedStatus, selectedType, sortMode]);

  const heroStats = useMemo(() => {
    return heroStatusSlugs.map((slug) => {
      const status = statuses.find((item) => item.slug === slug);
      return {
        slug,
        title: status?.title ?? slug,
        color: status?.color ?? "#64748b",
        count: status ? projectCards.filter((card) => card.status_id === status.id).length : 0
      };
    });
  }, [projectCards, statuses]);

  const visibleStatuses = useMemo(() => {
    if (selectedStatus) {
      return statuses.filter((status) => status.id === selectedStatus);
    }

    const ids = new Set(filteredCards.map((card) => card.status_id));
    return statuses.filter((status) => ids.has(status.id));
  }, [filteredCards, selectedStatus, statuses]);

  return (
    <div className="space-y-8">
      <section
        className="overflow-hidden rounded-[32px] border p-5 backdrop-blur-2xl sm:p-6 lg:p-8"
        style={{
          borderColor: "var(--theme-border)",
          background: "var(--theme-hero-bg)",
          boxShadow: "var(--theme-shadow)"
        }}
      >
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="max-w-2xl">
            <div className="label">{projectScope === "mena" ? "Mena" : "Лента контента"}</div>
          </div>
          <div className="grid w-full gap-3 sm:grid-cols-3">
            {heroStats.map((item) => (
              <div
                key={item.slug}
                className="rounded-[26px] border px-4 py-4 text-left backdrop-blur-xl sm:px-5"
                style={{
                  borderColor: `${item.color}55`,
                  background: "var(--theme-surface-soft)",
                  boxShadow: `0 0 0 1px ${item.color}18 inset, 0 0 38px ${item.color}24`
                }}
              >
                <div className="text-[11px] uppercase tracking-[0.2em]" style={{ color: "var(--theme-text-muted)" }}>
                  {item.title}
                </div>
                <div className="mt-3 flex items-end justify-between gap-4">
                  <div className="text-3xl font-semibold sm:text-4xl" style={{ color: "var(--theme-text)" }}>
                    {item.count}
                  </div>
                  <span className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: item.color, boxShadow: `0 0 18px ${item.color}` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div
        className="rounded-[30px] border p-4 backdrop-blur-2xl"
        style={{
          borderColor: "var(--theme-border)",
          background: "var(--theme-surface)",
          boxShadow: "var(--theme-shadow)"
        }}
      >
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="label">Фильтры</div>
            <ProjectSegmentedToggle
              value={projectScope}
              onChange={setProjectScope}
              options={[
                { value: "all", label: "LA" },
                { value: "mena", label: "Mena" }
              ]}
            />
          </div>
          {selectedStatus || selectedType || sortMode !== "oldest" || projectScope !== "all" ? (
            <div className="text-xs" style={{ color: "var(--theme-text-muted)" }}>
              Подборка обновлена
            </div>
          ) : null}
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_auto]">
          <Select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
            <option value="">Все статусы</option>
            {statuses.map((status) => (
              <option key={status.id} value={status.id}>
                {status.title}
              </option>
            ))}
          </Select>
          <Select value={selectedType} onChange={(e) => setSelectedType(e.target.value)}>
            <option value="">Все типы</option>
            {types.map((type) => (
              <option key={type.id} value={type.id}>
                {type.title}
              </option>
            ))}
          </Select>
          <Select value={sortMode} onChange={(e) => setSortMode(e.target.value as CardSortMode)}>
            <option value="oldest">Сначала старые</option>
            <option value="newest">Сначала новые</option>
          </Select>
          <Button
            className="md:col-span-2 xl:col-span-1"
            variant="outline"
            onClick={() => {
              setSelectedStatus("");
              setSelectedType("");
              setSortMode("oldest");
              setProjectScope("all");
            }}
          >
            Сбросить
          </Button>
        </div>
      </div>

      {filteredCards.length ? (
        <div className="grid gap-8">
          {visibleStatuses.map((status) => (
            <StatusSection key={status.id} status={status} cards={filteredCards} sortMode={sortMode} />
          ))}
        </div>
      ) : (
        <EmptyState
          title={projectScope === "mena" ? "Пока нет карточек для Mena" : "Ничего не найдено"}
          description={projectScope === "mena" ? "Добавь карточки проекта Mena в админке." : "Попробуй другой статус или тип карточки."}
        />
      )}
    </div>
  );
}
