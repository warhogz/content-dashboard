import { CardTypeRow, ContentCard, StatusRow } from "@/lib/types";

export type CardSortMode = "oldest" | "newest";
export type ProjectScope = "all" | "mena";
export type ContentMode = "live" | "archive";

export type PublicDashboardFilters = {
  selectedStatus: string;
  selectedType: string;
  searchQuery: string;
  sortMode: CardSortMode;
  projectScope: ProjectScope;
  contentMode: ContentMode;
};

function cardDateValue(card: ContentCard) {
  return card.created_at ? new Date(card.created_at).getTime() : 0;
}

function archiveDateValue(card: ContentCard) {
  return card.archived_at ? new Date(card.archived_at).getTime() : 0;
}

export function sortLiveCards(cards: ContentCard[], sortMode: CardSortMode) {
  return [...cards].sort((a, b) => {
    const pinnedDiff = Number(b.is_pinned) - Number(a.is_pinned);
    if (pinnedDiff !== 0) return pinnedDiff;

    const dateDiff = sortMode === "newest" ? cardDateValue(b) - cardDateValue(a) : cardDateValue(a) - cardDateValue(b);
    if (dateDiff !== 0) return dateDiff;

    return sortMode === "newest" ? b.sort_order - a.sort_order : a.sort_order - b.sort_order;
  });
}

export function sortArchiveCards(cards: ContentCard[]) {
  return [...cards].sort((a, b) => {
    const archiveDiff = archiveDateValue(b) - archiveDateValue(a);
    if (archiveDiff !== 0) return archiveDiff;

    return cardDateValue(b) - cardDateValue(a) || b.sort_order - a.sort_order;
  });
}

export function getProjectCards(cards: ContentCard[], projectScope: ProjectScope) {
  const projectKey = projectScope === "mena" ? "mena" : "main";

  return {
    activeProjectCards: cards.filter((card) => !card.is_hidden && !card.is_archived && (card.project_key || "main") === projectKey),
    archiveProjectCards: sortArchiveCards(cards.filter((card) => !card.is_hidden && card.is_archived && (card.project_key || "main") === projectKey))
  };
}

function matchesSearch(card: ContentCard, typesById: Map<string, CardTypeRow>, statusesById: Map<string, StatusRow>, query: string) {
  if (!query) return true;

  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;

  const haystack = [
    card.title,
    card.subtitle,
    card.notes,
    card.type?.title,
    card.status?.title,
    typesById.get(card.type_id)?.title,
    statusesById.get(card.status_id)?.title
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(normalized);
}

export function getFilteredLiveCards({
  cards,
  statuses,
  types,
  filters
}: {
  cards: ContentCard[];
  statuses: StatusRow[];
  types: CardTypeRow[];
  filters: PublicDashboardFilters;
}) {
  const { activeProjectCards } = getProjectCards(cards, filters.projectScope);
  const typesById = new Map(types.map((type) => [type.id, type]));
  const statusesById = new Map(statuses.map((status) => [status.id, status]));

  const scopedCards = activeProjectCards.filter((card) => {
    if (filters.selectedStatus && card.status_id !== filters.selectedStatus) return false;
    if (filters.selectedType && card.type_id !== filters.selectedType) return false;
    if (!matchesSearch(card, typesById, statusesById, filters.searchQuery)) return false;
    return true;
  });

  return sortLiveCards(scopedCards, filters.sortMode);
}

export function getVisibleStatuses(statuses: StatusRow[], filteredCards: ContentCard[], selectedStatus: string) {
  if (selectedStatus) {
    return statuses.filter((status) => status.id === selectedStatus);
  }

  const ids = new Set(filteredCards.map((card) => card.status_id));
  return statuses.filter((status) => ids.has(status.id));
}

export function getCanvasSections({
  statuses,
  types,
  cards,
  filters
}: {
  statuses: StatusRow[];
  types: CardTypeRow[];
  cards: ContentCard[];
  filters: PublicDashboardFilters;
}) {
  const { archiveProjectCards } = getProjectCards(cards, filters.projectScope);
  const filteredCards = getFilteredLiveCards({ cards, statuses, types, filters });
  const visibleStatuses = getVisibleStatuses(statuses, filteredCards, filters.selectedStatus);

  if (filters.contentMode === "archive") {
    return [
      {
        id: "archive",
        title: "Архив",
        color: "#c12657",
        subtitle: "Последние архивированные карточки сверху",
        cards: archiveProjectCards
      }
    ];
  }

  return visibleStatuses.map((status) => ({
    id: status.id,
    title: status.title,
    color: status.color,
    subtitle: `${filteredCards.filter((card) => card.status_id === status.id).length} карточек`,
    cards: sortLiveCards(
      filteredCards.filter((card) => card.status_id === status.id),
      filters.sortMode
    )
  }));
}

export function getPublicCardsViewModel({
  statuses,
  types,
  cards,
  filters
}: {
  statuses: StatusRow[];
  types: CardTypeRow[];
  cards: ContentCard[];
  filters: PublicDashboardFilters;
}) {
  const { activeProjectCards, archiveProjectCards } = getProjectCards(cards, filters.projectScope);
  const filteredCards = getFilteredLiveCards({ cards, statuses, types, filters });
  const visibleStatuses = getVisibleStatuses(statuses, filteredCards, filters.selectedStatus);
  const canvasSections = getCanvasSections({ statuses, types, cards, filters });

  return {
    activeProjectCards,
    archiveProjectCards,
    filteredCards,
    visibleStatuses,
    canvasSections
  };
}
