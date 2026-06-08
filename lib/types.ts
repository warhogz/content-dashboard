export type CardCropMode = "cover" | "contain" | "crop";
export type CardAspectRatio = "9:16" | "16:9" | "1:1" | "4:5" | "custom";
export type ProjectKey = "main" | "mena";
export type BloggerMaterialType = "script" | "video" | "none";
export type BloggerStatusColor = "gray" | "blue" | "green" | "yellow" | "orange" | "red" | "purple";

export const ARCHIVE_STATUS_SLUG = "archive";

export interface StatusRow {
  id: string;
  title: string;
  slug: string;
  color: string;
  sort_order: number;
  is_active: boolean;
  show_on_public: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CardTypeRow {
  id: string;
  title: string;
  slug: string;
  default_aspect_ratio: CardAspectRatio;
  default_height_px: number;
  default_crop_mode: CardCropMode;
  is_active: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface ContentCard {
  id: string;
  title: string;
  project_key: ProjectKey;
  type_id: string;
  status_id: string;
  link: string;
  thumbnail_url: string | null;
  aspect_ratio: CardAspectRatio;
  height_px: number;
  crop_mode: CardCropMode;
  sort_order: number;
  is_hidden: boolean;
  is_pinned: boolean;
  is_archived: boolean;
  archived_at: string | null;
  archived_from_status_id: string | null;
  subtitle: string | null;
  notes: string | null;
  created_at?: string;
  updated_at?: string;
  status?: StatusRow;
  type?: CardTypeRow;
}

export interface BloggerRow {
  id: string;
  username: string | null;
  display_name: string;
  avatar_url: string | null;
  followers: number | null;
  price: string | null;
  price_description: string | null;
  status: string | null;
  status_color: BloggerStatusColor;
  notes: string | null;
  instagram_url: string | null;
  material_type: BloggerMaterialType;
  material_url: string | null;
  created_at?: string;
  updated_at?: string;
}

export const STATUS_PRIORITY: Record<string, number> = {
  done: 1,
  "waiting-feedback": 2,
  revisions: 3,
  "in-progress": 4
};

export const DEFAULT_STATUS_SEED: Omit<StatusRow, "id" | "created_at" | "updated_at">[] = [
  { title: "Готово", slug: "done", color: "#16a34a", sort_order: 1, is_active: true, show_on_public: true },
  { title: "Ждет обратной связи", slug: "waiting-feedback", color: "#d97706", sort_order: 2, is_active: true, show_on_public: true },
  { title: "На правках", slug: "revisions", color: "#dc2626", sort_order: 3, is_active: true, show_on_public: true },
  { title: "В работе", slug: "in-progress", color: "#2563eb", sort_order: 4, is_active: true, show_on_public: true }
];

export const DEFAULT_TYPE_SEED: Omit<CardTypeRow, "id" | "created_at" | "updated_at">[] = [
  { title: "Reels", slug: "reels", default_aspect_ratio: "9:16", default_height_px: 420, default_crop_mode: "cover", is_active: true, sort_order: 1 },
  { title: "YouTube", slug: "youtube", default_aspect_ratio: "16:9", default_height_px: 300, default_crop_mode: "cover", is_active: true, sort_order: 2 },
  { title: "Carousel", slug: "carousel", default_aspect_ratio: "4:5", default_height_px: 360, default_crop_mode: "cover", is_active: true, sort_order: 3 },
  { title: "Post", slug: "post", default_aspect_ratio: "1:1", default_height_px: 340, default_crop_mode: "contain", is_active: true, sort_order: 4 },
  { title: "Story", slug: "story", default_aspect_ratio: "9:16", default_height_px: 380, default_crop_mode: "cover", is_active: true, sort_order: 5 },
  { title: "Custom", slug: "custom", default_aspect_ratio: "custom", default_height_px: 320, default_crop_mode: "crop", is_active: true, sort_order: 6 }
];
