"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { FullscreenCardViewer } from "@/components/fullscreen-card-viewer";
import { SearchBar } from "@/components/search-bar";
import { ProjectSegmentedToggle } from "@/components/project-segmented-toggle";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { CanvasV2Engine } from "@/components/canvas-v2-engine";
import { getPublicCardsViewModel, type CardSortMode, type ContentMode, type ProjectScope, type PublicDashboardFilters } from "@/lib/public-cards";
import { CardTypeRow, ContentCard, StatusRow } from "@/lib/types";

const PUBLIC_DASHBOARD_STATE_KEY = "public-dashboard-state";

function modeLinkClass(active: boolean) {
  return `rounded-full px-4 py-2 text-sm font-medium transition duration-200 ${
    active ? "" : ""
  }`;
}

const defaultFilters: PublicDashboardFilters = {
  selectedStatus: "",
  selectedType: "",
  searchQuery: "",
  sortMode: "oldest",
  projectScope: "all",
  contentMode: "live"
};

export function CanvasSpacePage({
  statuses,
  types,
  cards
}: {
  statuses: StatusRow[];
  types: CardTypeRow[];
  cards: ContentCard[];
}) {
  const [filters, setFilters] = useState<PublicDashboardFilters>(defaultFilters);
  const [selectedCard, setSelectedCard] = useState<ContentCard | null>(null);
  const [ready, setReady] = useState(false);
  const [progress, setProgress] = useState(0);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

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

  const isArchiveMode = filters.contentMode === "archive";
  const hasCards = isArchiveMode ? model.archiveProjectCards.length > 0 : model.filteredCards.length > 0;

  return (
    <div className="relative min-h-[calc(100vh-5.5rem)] overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 20% 16%, rgba(255, 35, 104, 0.12), transparent 28%), radial-gradient(circle at 82% 18%, rgba(193, 38, 87, 0.12), transparent 26%), linear-gradient(180deg, rgba(11, 4, 8, 0.98), rgba(7, 3, 7, 1))"
        }}
      />

      {hasCards ? (
        <CanvasV2Engine sections={model.canvasSections} onSelectCard={setSelectedCard} onReadyChange={setReady} onProgressChange={setProgress} />
      ) : null}

      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-center px-4 pt-4 sm:px-6 sm:pt-5">
        <div
          className="pointer-events-auto w-full max-w-[1240px] rounded-[30px] border p-4 backdrop-blur-2xl sm:p-5"
          style={{
            borderColor: "var(--theme-border)",
            background: "color-mix(in srgb, var(--theme-surface) 88%, transparent)",
            boxShadow: "var(--theme-shadow)"
          }}
        >
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <div className="label hidden md:inline-flex">Space</div>

                <div
                  className="inline-flex items-center gap-1 rounded-full border p-1 backdrop-blur-xl"
                  style={{
                    borderColor: "var(--theme-border)",
                    background: "var(--theme-surface-soft)",
                    boxShadow: "var(--theme-shadow-lift)"
                  }}
                >
                  <Link
                    href="/"
                    className={modeLinkClass(false)}
                    style={{
                      color: "var(--theme-text-muted)",
                      background: "transparent"
                    }}
                  >
                    Grid
                  </Link>
                  <span
                    className={modeLinkClass(true)}
                    style={{
                      color: "var(--theme-text)",
                      background: "var(--theme-surface-strong)",
                      boxShadow: "0 0 0 1px var(--theme-border) inset, 0 10px 28px color-mix(in srgb, var(--theme-accent) 16%, transparent)"
                    }}
                  >
                    Canvas
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

                <Button
                  variant="outline"
                  size="sm"
                  className="md:hidden"
                  onClick={() => setMobileFiltersOpen((current) => !current)}
                  aria-expanded={mobileFiltersOpen}
                  aria-controls="canvas-mobile-filters"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  {mobileFiltersOpen ? "Скрыть" : "Фильтры"}
                </Button>
              </div>

              <div className="hidden text-xs md:block" style={{ color: "var(--theme-text-muted)" }}>
                {ready ? "Canvas готов" : `Загрузка пространства ${Math.round(progress * 100)}%`}
              </div>
            </div>

            <div
              id="canvas-mobile-filters"
              className={`${mobileFiltersOpen ? "grid" : "hidden"} gap-3 md:grid md:grid-cols-2 xl:grid-cols-[1.1fr_1fr_1fr_1fr_auto]`}
            >
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

              <Select
                value={filters.sortMode}
                onChange={(event) => setFilters((current) => ({ ...current, sortMode: event.target.value as CardSortMode }))}
              >
                <option value="oldest">Сначала старые</option>
                <option value="newest">Сначала новые</option>
              </Select>

              <Button
                variant="outline"
                onClick={() => {
                  setFilters(defaultFilters);
                }}
              >
                Сбросить
              </Button>
            </div>

            <div
              className={`${mobileFiltersOpen ? "flex" : "hidden"} flex-wrap items-center gap-3 text-xs md:flex`}
              style={{ color: "var(--theme-text-muted)" }}
            >
              <span>{isArchiveMode ? `Архивных карточек: ${model.archiveProjectCards.length}` : `Карточек в пространстве: ${model.filteredCards.length}`}</span>
              <span>•</span>
              <span>{filters.projectScope === "mena" ? "Проект: Mena" : "Проект: LA"}</span>
              <span>•</span>
              <span>{isArchiveMode ? "Archive space" : "Media space"}</span>
            </div>
          </div>
        </div>
      </div>

      {!hasCards ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center px-4">
          <div
            className="w-full max-w-xl rounded-[34px] border p-8 text-center backdrop-blur-2xl"
            style={{
              borderColor: "var(--theme-border)",
              background: "color-mix(in srgb, var(--theme-surface) 88%, transparent)",
              boxShadow: "var(--theme-shadow)"
            }}
          >
            <div className="label">Canvas</div>
            <h1 className="mt-4 text-3xl font-semibold" style={{ color: "var(--theme-text)" }}>
              Здесь пока пусто
            </h1>
            <p className="mt-3 text-sm leading-7" style={{ color: "var(--theme-text-muted)" }}>
              Попробуй другой статус, тип, проект или архивный режим. Пространство откроется сразу, как только в выборке появятся карточки.
            </p>
            <div className="mt-6">
              <Link
                href="/"
                className="inline-flex h-11 items-center justify-center rounded-2xl border px-5 text-sm font-medium transition"
                style={{
                  borderColor: "var(--theme-border)",
                  background: "var(--theme-surface)",
                  color: "var(--theme-text)"
                }}
              >
                Вернуться в grid
              </Link>
            </div>
          </div>
        </div>
      ) : !ready ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center px-4">
          <div
            className="w-full max-w-md rounded-[34px] border p-8 text-center backdrop-blur-2xl"
            style={{
              borderColor: "var(--theme-border)",
              background: "color-mix(in srgb, var(--theme-surface) 88%, transparent)",
              boxShadow: "var(--theme-shadow)"
            }}
          >
            <div className="label">Canvas V2</div>
            <h1 className="mt-4 text-3xl font-semibold" style={{ color: "var(--theme-text)" }}>
              Готовим пространство
            </h1>
            <p className="mt-3 text-sm leading-7" style={{ color: "var(--theme-text-muted)" }}>
              Загружаем карточки и превью, чтобы открыть пространство сразу без пустого экрана.
            </p>
            <div className="mt-6 overflow-hidden rounded-full border" style={{ borderColor: "var(--theme-border)" }}>
              <div
                className="h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${Math.max(8, Math.round(progress * 100))}%`,
                  background: "linear-gradient(90deg,var(--theme-accent-strong),var(--theme-accent))"
                }}
              />
            </div>
          </div>
        </div>
      ) : null}

      <FullscreenCardViewer card={selectedCard} open={Boolean(selectedCard)} onClose={() => setSelectedCard(null)} />
    </div>
  );
}
