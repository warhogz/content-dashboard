"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CardItem } from "@/components/card-item";
import { EmptyState } from "@/components/empty-state";
import { ImagePreload } from "@/components/image-preload";
import { ProjectSegmentedToggle } from "@/components/project-segmented-toggle";
import { SearchBar } from "@/components/search-bar";
import { StatusSection } from "@/components/status-section";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { resolveCardPreviewUrl } from "@/lib/dropbox-links";
import { getPublicCardsViewModel, type CardSortMode, type ContentMode, type ProjectScope, type PublicDashboardFilters } from "@/lib/public-cards";
import { CardTypeRow, ContentCard, StatusRow } from "@/lib/types";

const heroStatusSlugs = ["done", "waiting-feedback", "revisions"] as const;
const PUBLIC_DASHBOARD_STATE_KEY = "public-dashboard-state";

const defaultFilters: PublicDashboardFilters = {
  selectedStatus: "",
  selectedType: "",
  searchQuery: "",
  sortMode: "oldest",
  projectScope: "all",
  contentMode: "live"
};

function modeLinkClass(active: boolean) {
  return "rounded-full px-4 py-2 text-sm font-medium transition duration-200";
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
  const [filters, setFilters] = useState<PublicDashboardFilters>(defaultFilters);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const raw = window.sessionStorage.getItem(PUBLIC_DASHBOARD_STATE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw) as Partial<PublicDashboardFilters>;
      setFilters((current) => ({
        ...current,
        selectedStatus: parsed.selectedStatus ?? current.selectedStatus,
        selectedType: parsed.selectedType ?? current.selectedType,
        searchQuery: parsed.searchQuery ?? current.searchQuery,
        sortMode: parsed.sortMode === "newest" ? "newest" : "oldest",
        projectScope: parsed.projectScope === "mena" ? "mena" : "all",
        contentMode: parsed.contentMode === "archive" ? "archive" : "live"
      }));
    } catch {
      // Ignore invalid persisted state and keep defaults.
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      window.sessionStorage.setItem(PUBLIC_DASHBOARD_STATE_KEY, JSON.stringify(filters));
    } catch {
      // Ignore storage quota and privacy mode failures.
    }
  }, [filters]);

  const model = useMemo(
    () =>
      getPublicCardsViewModel({
        statuses,
        types,
        cards,
        filters
      }),
    [cards, filters, statuses, types]
  );

  const heroStats = useMemo(() => {
    return heroStatusSlugs.map((slug) => {
      const status = statuses.find((item) => item.slug === slug);
      return {
        slug,
        title: status?.title ?? slug,
        color: status?.color ?? "#64748b",
        count: status ? model.activeProjectCards.filter((card) => card.status_id === status.id).length : 0
      };
    });
  }, [model.activeProjectCards, statuses]);

  const preloadUrls = useMemo(() => {
    const sourceCards = filters.contentMode === "archive" ? model.archiveProjectCards : model.filteredCards;

    return sourceCards
      .map((card) => resolveCardPreviewUrl(card.thumbnail_url))
      .filter((url): url is string => Boolean(url));
  }, [filters.contentMode, model.archiveProjectCards, model.filteredCards]);

  const isArchiveMode = filters.contentMode === "archive";
  const hasCards = isArchiveMode ? model.archiveProjectCards.length > 0 : model.filteredCards.length > 0;
  const hasLiveFilters =
    filters.selectedStatus || filters.selectedType || filters.searchQuery || filters.sortMode !== "oldest" || filters.projectScope !== "all";

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
            <div className="label">{isArchiveMode ? "Архив" : filters.projectScope === "mena" ? "Mena" : "Лента контента"}</div>
          </div>

          {isArchiveMode ? (
            <div className="grid w-full gap-3 sm:grid-cols-3">
              {[
                { label: "В архиве", value: model.archiveProjectCards.length, color: "#c12657" },
                { label: "Режим", value: "Grid", color: "#f59e0b" },
                { label: "Проект", value: filters.projectScope === "mena" ? "Mena" : "LA", color: "#8b5cf6" }
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
            <ProjectSegmentedToggle<ProjectScope>
              value={filters.projectScope}
              onChange={(value) => setFilters((current) => ({ ...current, projectScope: value }))}
              options={[
                { value: "all", label: "LA" },
                { value: "mena", label: "Mena" }
              ]}
            />
            <ProjectSegmentedToggle<ContentMode>
              value={filters.contentMode}
              onChange={(value) => setFilters((current) => ({ ...current, contentMode: value }))}
              options={[
                { value: "live", label: "Лента" },
                { value: "archive", label: "Архив" }
              ]}
            />

            <div
              className="inline-flex items-center gap-1 rounded-full border p-1 backdrop-blur-xl"
              style={{
                borderColor: "var(--theme-border)",
                background: "var(--theme-surface-soft)",
                boxShadow: "var(--theme-shadow-lift)"
              }}
            >
              <span
                className={modeLinkClass(true)}
                style={{
                  color: "var(--theme-text)",
                  background: "var(--theme-surface-strong)",
                  boxShadow: "0 0 0 1px var(--theme-border) inset, 0 10px 28px color-mix(in srgb, var(--theme-accent) 16%, transparent)"
                }}
              >
                Grid
              </span>
              <Link
                href="/bloggers"
                className={modeLinkClass(false)}
                style={{
                  color: "var(--theme-text-muted)",
                  background: "transparent"
                }}
              >
                Bloggers
              </Link>
            </div>
          </div>

          {!isArchiveMode && hasLiveFilters ? (
            <div className="text-xs" style={{ color: "var(--theme-text-muted)" }}>
              Подборка обновлена
            </div>
          ) : null}
        </div>

        {!isArchiveMode ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.1fr_1fr_1fr_1fr_auto]">
            <SearchBar value={filters.searchQuery} onChange={(value) => setFilters((current) => ({ ...current, searchQuery: value }))} />

            <Select value={filters.selectedStatus} onChange={(event) => setFilters((current) => ({ ...current, selectedStatus: event.target.value }))}>
              <option value="">Все статусы</option>
              {statuses.map((status) => (
                <option key={status.id} value={status.id}>
                  {status.title}
                </option>
              ))}
            </Select>

            <Select value={filters.selectedType} onChange={(event) => setFilters((current) => ({ ...current, selectedType: event.target.value }))}>
              <option value="">Все типы</option>
              {types.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.title}
                </option>
              ))}
            </Select>

            <Select value={filters.sortMode} onChange={(event) => setFilters((current) => ({ ...current, sortMode: event.target.value as CardSortMode }))}>
              <option value="oldest">Сначала старые</option>
              <option value="newest">Сначала новые</option>
            </Select>

            <Button variant="outline" onClick={() => setFilters(defaultFilters)}>
              Сбросить
            </Button>
          </div>
        ) : (
          <div className="text-sm" style={{ color: "var(--theme-text-muted)" }}>
            Архив — отдельный режим. Здесь не применяются обычные статусные фильтры и сортировка.
          </div>
        )}
      </div>

      {hasCards ? (
        isArchiveMode ? (
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
              {model.archiveProjectCards.map((item, index) => (
                <CardItem key={item.id} item={item} compact imagePriority={index < 3 ? "high" : "auto"} />
              ))}
            </div>
          </section>
        ) : (
          <div className="grid gap-8">
            {model.visibleStatuses.map((status) => (
              <StatusSection key={status.id} status={status} cards={model.filteredCards} sortMode={filters.sortMode} />
            ))}
          </div>
        )
      ) : (
        <EmptyState
          title={
            isArchiveMode
              ? filters.projectScope === "mena"
                ? "В архиве Mena пока пусто"
                : "Архив пока пуст"
              : filters.projectScope === "mena"
                ? "Пока нет карточек для Mena"
                : "Ничего не найдено"
          }
          description={
            isArchiveMode
              ? "Архивированные карточки появятся здесь автоматически."
              : filters.projectScope === "mena"
                ? "Добавь карточки проекта Mena в админке."
                : "Попробуй другой статус, тип или поисковый запрос."
          }
        />
      )}
    </div>
  );
}
