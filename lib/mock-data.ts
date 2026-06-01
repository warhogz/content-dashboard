import { CardTypeRow, ContentCard, DEFAULT_STATUS_SEED, DEFAULT_TYPE_SEED, StatusRow } from "@/lib/types";

const statuses: StatusRow[] = DEFAULT_STATUS_SEED.map((status, index) => ({
  ...status,
  id: `status-${index + 1}`
}));

const types: CardTypeRow[] = DEFAULT_TYPE_SEED.map((type, index) => ({
  ...type,
  id: `type-${index + 1}`
}));

const rawCards: ContentCard[] = [
  {
    id: "card-1",
    title: "Reels про запуск новой коллекции",
    project_key: "main",
    type_id: "type-1",
    status_id: "status-1",
    link: "https://example.com",
    thumbnail_url: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1200&q=80",
    aspect_ratio: "9:16",
    height_px: 420,
    crop_mode: "cover",
    sort_order: 1,
    is_hidden: false,
    is_pinned: true,
    subtitle: "Короткий ролик для публикации в IG",
    notes: "Проверить текст на первом экране"
  },
  {
    id: "card-2",
    title: "YouTube teaser",
    project_key: "main",
    type_id: "type-2",
    status_id: "status-2",
    link: "https://example.com",
    thumbnail_url: "https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=1200&q=80",
    aspect_ratio: "16:9",
    height_px: 300,
    crop_mode: "cover",
    sort_order: 2,
    is_hidden: false,
    is_pinned: false,
    subtitle: "На согласовании обложка",
    notes: null
  },
  {
    id: "card-3",
    title: "Carousel о кейсах",
    project_key: "main",
    type_id: "type-3",
    status_id: "status-3",
    link: "https://example.com",
    thumbnail_url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1200&q=80",
    aspect_ratio: "4:5",
    height_px: 360,
    crop_mode: "cover",
    sort_order: 1,
    is_hidden: false,
    is_pinned: false,
    subtitle: "Нужны правки в подписи",
    notes: null
  }
];

const cards: ContentCard[] = rawCards.map((card) => ({
  ...card,
  status: statuses.find((status) => status.id === card.status_id),
  type: types.find((type) => type.id === card.type_id)
}));

export const mockDashboard = {
  statuses,
  types,
  cards
};

export function getMockData() {
  return mockDashboard;
}
