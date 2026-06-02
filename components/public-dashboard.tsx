"use client";

import { useMemo, useState } from "react";
import { BoardView } from "@/components/board-view";
import { CardItem } from "@/components/card-item";
import { EmptyState } from "@/components/empty-state";
import { FullscreenCardViewer } from "@/components/fullscreen-card-viewer";
import { ImagePreload } from "@/components/image-preload";
import { ProjectSegmentedToggle } from "@/components/project-segmented-toggle";
import { StatusSection } from "@/components/status-section";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { resolveCardPreviewUrl } from "@/lib/dropbox-links";
import { CardTypeRow, ContentCard, StatusRow } from "@/lib/types";

export type CardSortMode = "oldest" | "newest";
type ProjectScope = "all" | "mena";
type ContentMode = "live" | "archive";
type ViewMode = "grid" | "board";

const heroStatusSlugs = ["done", "waiting-feedback", "revisions"] as const;

function cardDateValue(card: ContentCard) {
  return card.created_at ? new Date(card.created_at).getTime() : 0;
}

function archiveDateValue(card: ContentCard) {
  return card.archived_at ? new Date(card.archived_at).getTime() : 0;
}

function sortLiveCards(cards: ContentCard[], sortMode: CardSortMode) {
  return [...cards].sort((a, b) => {
    const pinnedDiff = Number(b.is_pinned) - Number(a.is_pinned);
    if (pinnedDiff !== 0) return pinnedDiff;

    const dateDiff = sortMode === "newest" ? cardDateValue(b) - cardDateValue(a) : cardDateValue(a) - cardDateValue(b);
    if (dateDiff !== 0) return dateDiff;

    return sortMode === "newest" ? b.sort_order - a.sort_order : a.sort_order - b.sort_order;
  });
}

function sortArchiveCards(cards: ContentCard[]) {
  return [...cards].sort((a, b) => {
    const archiveDiff = archiveDateValue(b) - archiveDateValue(a);
    if (archiveDiff !== 0) return archiveDiff;

    return cardDateValue(b) - cardDateValue(a) || b.sort_order - a.sort_order;
  });
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
  const [contentMode, setContentMode] = useState<ContentMode>("live");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [selectedCard, setSelectedCard] = useState<ContentCard | null>(null);

  const projectKey = projectScope === "mena" ? "mena" : "main";

  const activeProjectCards = useMemo(() => {
    return cards.filter((card) => !card.is_hidden && !card.is_archived && (card.project_key || "main") === projectKey);
  }, [cards, projectKey]);

  const archiveProjectCards = useMemo(() => {
    return sortArchiveCards(cards.filter((card) => !card.is_hidden && card.is_archived && (card.project_key || "main") === projectKey));
  }, [cards, projectKey]);

  const filteredCards = useMemo(() => {
    const scopedCards = activeProjectCards.filter((card) => {
      if (selectedStatus && card.status_id !== selectedStatus) return false;
      if (selectedType && card.type_id !== selectedType) return false;
      return true;
    });

    return sortLiveCards(scopedCards, sortMode);
  }, [activeProjectCards, selectedStatus, selectedType, sortMode]);

  const heroStats = useMemo(() => {
    return heroStatusSlugs.map((slug) => {
      const status = statuses.find((item) => item.slug === slug);
      return {
        slug,
        title: status?.title ?? slug,
        color: status?.color ?? "#64748b",
        count: status ? activeProjectCards.filter((card) => card.status_id === status.id).length : 0
      };
    });
  }, [activeProjectCards, statuses]);

  const visibleStatuses = useMemo(() => {
    if (selectedStatus) {
      return statuses.filter((status) => status.id === selectedStatus);
    }

    const ids = new Set(filteredCards.map((card) => card.status_id));
    return statuses.filter((status) => ids.has(status.id));
  }, [filteredCards, selectedStatus, statuses]);

  const boardSections = useMemo(() => {
    if (contentMode === "archive") {
      return [
        {
          id: "archive",
          title: "Архив",
          color: "#c12657",
          subtitle: "Последние архивированные сверху",
          cards: archiveProjectCards
        }
      ];
    }

    return visibleStatuses.map((status) => ({
      id: status.id,
      title: status.title,
      color: status.color,
      cards: sortLiveCards(
        filteredCards.filter((card) => card.status_id === status.id),
        sortMode
      )
    }));
  }, [archiveProjectCards, contentMode, filteredCards, sortMode, visibleStatuses]);

  const preloadUrls = useMemo(() => {
    const orderedCards =
      contentMode === "archive"
        ? archiveProjectCards
        : visibleStatuses.flatMap((status) =>
            sortLiveCards(
              filteredCards.filter((card) => card.status_id === status.id),
              sortMode
            )
          );

    return orderedCards
      .map((card) => resolveCardPreviewUrl(card.thumbnail_url))
      .filter((url): url is string => Boolean(url));
  }, [archiveProjectCards, contentMode, filteredCards, sortMode, visibleStatuses]);

  const hasLiveFilters = selectedStatus || selectedType || sortMode !== "oldest" || projectScope !== "all";
  const isArchiveMode = contentMode === "archive";
  const hasCards = isArchiveMode ? archiveProjectCards.length > 0 : filteredCards.length > 0;

  return (
    <div className="space-y-8">
      <ImagePreload urls={preloadUrls} concurrency={8} priorityCount={12} />

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
            <div className="label">{isArchiveMode ? "Архив" : projectScope === "mena" ? "Mena" : "Лента контента"}</div>
          </div>

          {isArchiveMode ? (
            <div className="grid w-full gap-3 sm:grid-cols-3">
              {[
                { label: "В архиве", value: archiveProjectCards.length, color: "#c12657" },
                { label: "Порядок", value: "Новые сверху", color: "#f59e0b" },
                { label: "Проект", value: projectScope === "mena" ? "Mena" : "LA", color: "#8b5cf6" }
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-[26px] border px-4 py-4 text-left backdrop-blur-xl sm:px-5"
                  style={{
                    borderColor: `${item.color}55`,
                    background: "var(--theme-surface-soft)",
                    boxShadow: `0 0 0 1px ${item.color}18 inset, 0 0 38px ${item.color}24`
                  }}
                >
                  <div className="text-[11px] uppercase tracking-[0.2em]" style={{ color: "var(--theme-text-muted)" }}>
                    {item.label}
                  </div>
                  <div className="mt-3 flex items-end justify-between gap-4">
                    <div className="text-2xl font-semibold sm:text-3xl" style={{ color: "var(--theme-text)" }}>
                      {item.value}
                    </div>
                    <span className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: item.color, boxShadow: `0 0 18px ${item.color}` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
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
          )}
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
        <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <div className="label">Навигация</div>
            <ProjectSegmentedToggle
              value={projectScope}
              onChange={setProjectScope}
              options={[
                { value: "all", label: "LA" },
                { value: "mena", label: "Mena" }
              ]}
            />
            <ProjectSegmentedToggle
              value={contentMode}
              onChange={setContentMode}
              options={[
                { value: "live", label: "Лента" },
                { value: "archive", label: "Архив" }
              ]}
            />
            <ProjectSegmentedToggle
              value={viewMode}
              onChange={setViewMode}
              options={[
                { value: "grid", label: "Grid" },
                { value: "board", label: "Board" }
              ]}
            />
          </div>

          {!isArchiveMode && hasLiveFilters ? (
            <div className="text-xs" style={{ color: "var(--theme-text-muted)" }}>
              Подборка обновлена
            </div>
          ) : null}
        </div>

        {!isArchiveMode ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_auto]">
            <Select value={selectedStatus} onChange={(event) => setSelectedStatus(event.target.value)}>
              <option value="">Все статусы</option>
              {statuses.map((status) => (
                <option key={status.id} value={status.id}>
                  {status.title}
                </option>
              ))}
            </Select>
            <Select value={selectedType} onChange={(event) => setSelectedType(event.target.value)}>
              <option value="">Все типы</option>
              {types.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.title}
                </option>
              ))}
            </Select>
            <Select value={sortMode} onChange={(event) => setSortMode(event.target.value as CardSortMode)}>
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
        ) : (
          <div className="text-sm" style={{ color: "var(--theme-text-muted)" }}>
            Архив — отдельный режим. Здесь не применяются фильтры статусов, типов и обычная сортировка.
          </div>
        )}
      </div>

      {hasCards ? (
        viewMode === "board" ? (
          <BoardView sections={boardSections} onOpenCard={setSelectedCard} />
        ) : isArchiveMode ? (
          <section
            className="space-y-5 rounded-[32px] border p-5 backdrop-blur-2xl sm:p-6"
            style={{
              borderColor: "color-mix(in srgb, var(--theme-accent) 28%, var(--theme-border))",
              background: "var(--theme-status-bg)",
              boxShadow: "var(--theme-shadow)"
            }}
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight" style={{ color: "var(--theme-text)" }}>
                  Архив
                </h2>
                <p className="mt-2 text-sm" style={{ color: "var(--theme-text-muted)" }}>
                  Последние архивированные карточки всегда наверху
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {archiveProjectCards.map((item, index) => (
                <CardItem key={item.id} item={item} compact imagePriority={index < 3 ? "high" : "auto"} />
              ))}
            </div>
          </section>
        ) : (
          <div className="grid gap-8">
            {visibleStatuses.map((status) => (
              <StatusSection key={status.id} status={status} cards={filteredCards} sortMode={sortMode} />
            ))}
          </div>
        )
      ) : (
        <EmptyState
          title={
            isArchiveMode
              ? projectScope === "mena"
                ? "В архиве Mena пока пусто"
                : "Архив пока пуст"
              : projectScope === "mena"
                ? "Пока нет карточек для Mena"
                : "Ничего не найдено"
          }
          description={
            isArchiveMode
              ? "Архивированные карточки появятся здесь автоматически."
              : projectScope === "mena"
                ? "Добавь карточки проекта Mena в админке."
                : "Попробуй другой статус или тип карточки."
          }
        />
      )}

      <FullscreenCardViewer card={selectedCard} open={Boolean(selectedCard)} onClose={() => setSelectedCard(null)} />
    </div>
  );
}
