import { PLAN_CATEGORY_PRESETS, PLAN_PROJECT_PRESETS, PLAN_ROOM_PRESETS } from "@/lib/plan/config";
import { PlanMetadataCatalogKind, PlanMetadataCatalogs } from "@/lib/types";

export const DEFAULT_PLAN_METADATA_CATALOGS: PlanMetadataCatalogs = {
  projects: [...PLAN_PROJECT_PRESETS],
  rooms: [...PLAN_ROOM_PRESETS],
  categories: [...PLAN_CATEGORY_PRESETS]
};

function normalizeStringArray(values: unknown) {
  if (!Array.isArray(values)) return [];

  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const normalized = typeof value === "string" ? value.trim() : "";
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(normalized);
  }

  return result;
}

export function normalizePlanMetadataCatalogs(value: unknown, fallback = DEFAULT_PLAN_METADATA_CATALOGS): PlanMetadataCatalogs {
  if (!value || typeof value !== "object") {
    return {
      projects: [...fallback.projects],
      rooms: [...fallback.rooms],
      categories: [...fallback.categories]
    };
  }

  const record = value as Record<string, unknown>;

  return {
    projects: normalizeStringArray(record.projects ?? fallback.projects),
    rooms: normalizeStringArray(record.rooms ?? fallback.rooms),
    categories: normalizeStringArray(record.categories ?? fallback.categories)
  };
}

export function mergeCatalogValues(...sources: Array<readonly string[] | string[] | null | undefined>) {
  return normalizeStringArray(sources.flatMap((source) => (source ? [...source] : [])));
}

export function catalogKindLabel(kind: PlanMetadataCatalogKind) {
  switch (kind) {
    case "projects":
      return "Project";
    case "rooms":
      return "Room / Zone";
    case "categories":
      return "Content Category";
  }
}
