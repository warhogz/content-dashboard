type ScoreableCard = {
  id: string;
  link?: string | null;
  project_name?: string | null;
  room_zone?: string | null;
  content_category?: string | null;
};

export type PlanScoreItem = {
  label: string;
  points: number;
};

export type PlanScoreResult = {
  total: number;
  label: string;
  items: PlanScoreItem[];
};

function normalizeValue(value: string | null | undefined) {
  return value?.trim().toLowerCase() || "";
}

function distinctCount(values: Array<string | null | undefined>) {
  return new Set(values.map(normalizeValue).filter(Boolean)).size;
}

function countMatches(cards: ScoreableCard[], matcher: (category: string) => boolean) {
  return cards.reduce((count, card) => count + (matcher(normalizeValue(card.content_category)) ? 1 : 0), 0);
}

function consecutiveRepeatCount(values: string[]) {
  let repeats = 0;
  for (let index = 1; index < values.length; index += 1) {
    if (values[index] && values[index] === values[index - 1]) {
      repeats += 1;
    }
  }
  return repeats;
}

function scoreLabel(total: number) {
  if (total >= 95) return "Exceptional Mix";
  if (total >= 80) return "Strong Weekly Mix";
  if (total >= 65) return "Healthy Content Mix";
  if (total >= 45) return "Limited Variety";
  return "Repetitive Structure";
}

export function calculatePlanWeekScore(cards: ScoreableCard[]) {
  const visibleCards = cards.filter((card): card is ScoreableCard => Boolean(card));
  const items: PlanScoreItem[] = [];
  const categories = visibleCards.map((card) => normalizeValue(card.content_category));
  const rooms = visibleCards.map((card) => normalizeValue(card.room_zone));
  const projects = visibleCards.map((card) => normalizeValue(card.project_name));
  const carouselCount = countMatches(visibleCards, (category) => category.includes("carousel"));
  const hasTrendReel = countMatches(visibleCards, (category) => category.includes("trend")) > 0;
  const hasTalkingHead = countMatches(visibleCards, (category) => category.includes("talking")) > 0;
  const projectDiversity = distinctCount(visibleCards.map((card) => card.project_name));
  const roomDiversity = distinctCount(visibleCards.map((card) => card.room_zone));
  const repeatedCategories = consecutiveRepeatCount(categories);
  const repeatedRooms = consecutiveRepeatCount(rooms);
  const maxProjectCount = Math.max(
    0,
    ...Array.from(
      projects.filter(Boolean).reduce((map, project) => map.set(project, (map.get(project) || 0) + 1), new Map<string, number>()).values()
    )
  );
  const missingDropboxCount = visibleCards.filter((card) => !card.link?.trim()).length;

  if (carouselCount >= 1) items.push({ label: "Carousel present", points: 25 });
  if (carouselCount >= 2) items.push({ label: "Second Carousel included", points: 15 });
  if (hasTrendReel) items.push({ label: "Trend Reel included", points: 15 });
  if (hasTalkingHead) items.push({ label: "Talking Head included", points: 10 });
  if (projectDiversity >= 3) items.push({ label: "Project diversity", points: 10 });
  if (roomDiversity >= 3) items.push({ label: "Room diversity", points: 10 });
  if (visibleCards.length > 1 && repeatedCategories === 0) items.push({ label: "Category rhythm stays varied", points: 10 });
  if (visibleCards.length > 1 && repeatedRooms === 0) items.push({ label: "Room rhythm stays varied", points: 10 });
  if (visibleCards.length === 4 && missingDropboxCount === 0) items.push({ label: "All Dropbox links ready", points: 5 });

  if (visibleCards.length < 4) items.push({ label: "Week is not fully planned", points: -25 });
  if (carouselCount === 0) items.push({ label: "Carousel missing", points: -10 });
  if (missingDropboxCount > 0) items.push({ label: `Dropbox missing on ${missingDropboxCount} post${missingDropboxCount > 1 ? "s" : ""}`, points: -20 });
  if (repeatedCategories > 0) items.push({ label: `Same category repeated ${repeatedCategories} time${repeatedCategories > 1 ? "s" : ""}`, points: -20 });
  if (repeatedRooms > 0) items.push({ label: `Same room repeated ${repeatedRooms} time${repeatedRooms > 1 ? "s" : ""}`, points: -15 });
  if (maxProjectCount >= 3) items.push({ label: "One project dominates the week", points: -15 });

  const total = Math.max(0, Math.min(100, items.reduce((sum, item) => sum + item.points, 0)));

  return {
    total,
    label: scoreLabel(total),
    items
  } satisfies PlanScoreResult;
}
