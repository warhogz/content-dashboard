import { BloggerStatusColor, MediaOutletRow } from "@/lib/types";

export const mediaStatusColorMap: Record<BloggerStatusColor, string> = {
  gray: "#94a3b8",
  blue: "#3b82f6",
  green: "#22c55e",
  yellow: "#eab308",
  orange: "#f97316",
  red: "#ef4444",
  purple: "#a855f7"
};

export const mediaStatusPresets: Array<{ label: string; color: BloggerStatusColor }> = [
  { label: "Новое предложение", color: "blue" },
  { label: "На согласовании", color: "yellow" },
  { label: "Уточняем детали", color: "orange" },
  { label: "Согласовано", color: "green" },
  { label: "Опубликовано", color: "purple" },
  { label: "Отказ", color: "red" }
];

const MONTHS_SHORT = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];

export function formatAudience(value: number | null) {
  if (!value) return null;
  if (value >= 1_000_000) {
    const formatted = value >= 10_000_000 ? (value / 1_000_000).toFixed(0) : (value / 1_000_000).toFixed(1);
    return `${formatted.replace(".0", "")}M`;
  }
  if (value >= 1_000) {
    const formatted = value >= 100_000 ? (value / 1_000).toFixed(0) : (value / 1_000).toFixed(1);
    return `${formatted.replace(".0", "")}K`;
  }
  return String(value);
}

export function splitLines(value: string | null) {
  if (!value) return [];
  return value
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*[—–\-•*·]\s*/, "").trim())
    .filter(Boolean);
}

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function getOfferDeadline(offerUntil: string | null) {
  if (!offerUntil) return null;
  const [year, month, day] = offerUntil.split("-").map(Number);
  if (!year || !month || !day) return null;

  const date = new Date(year, month - 1, day);
  const daysLeft = Math.round((date.getTime() - startOfToday().getTime()) / 86_400_000);
  const dateLabel = `${day} ${MONTHS_SHORT[month - 1]}${year !== new Date().getFullYear() ? ` ${year}` : ""}`;

  if (daysLeft < 0) return { daysLeft, dateLabel, label: `истекло ${dateLabel}`, tone: "expired" as const };
  if (daysLeft === 0) return { daysLeft, dateLabel, label: `до ${dateLabel} · сегодня`, tone: "urgent" as const };
  return { daysLeft, dateLabel, label: `до ${dateLabel} · ${daysLeft} дн.`, tone: daysLeft <= 7 ? ("urgent" as const) : ("normal" as const) };
}

export const deadlineToneColor = {
  expired: "#ef4444",
  urgent: "#f97316",
  normal: "#22c55e"
} as const;

export function isOfferActive(outlet: MediaOutletRow) {
  const deadline = getOfferDeadline(outlet.offer_until);
  return deadline ? deadline.daysLeft >= 0 : true;
}

export function hostLabel(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/* ---------- Quick fill from a pasted offer message ---------- */

const MONTHS_GENITIVE: Record<string, number> = {
  январ: 1,
  феврал: 2,
  март: 3,
  апрел: 4,
  ма: 5,
  июн: 6,
  июл: 7,
  август: 8,
  сентябр: 9,
  октябр: 10,
  ноябр: 11,
  декабр: 12
};

const LANGUAGE_CODES: Array<[RegExp, string]> = [
  [/английск|english/i, "EN"],
  [/арабск|arabic/i, "AR"],
  [/русск|russian/i, "RU"],
  [/французск|french/i, "FR"],
  [/немецк|german/i, "DE"],
  [/испанск|spanish/i, "ES"],
  [/итальянск|italian/i, "IT"],
  [/китайск|chinese/i, "ZH"]
];

export type MediaDraft = Partial<
  Pick<
    MediaOutletRow,
    | "name"
    | "founded_year"
    | "audience"
    | "audience_note"
    | "instagram_url"
    | "website_url"
    | "languages"
    | "formats"
    | "price"
    | "price_note"
    | "price_alt"
    | "price_alt_note"
    | "payment_terms"
    | "offer_until"
    | "open_questions"
  >
>;

function parseAudienceNumber(raw: string, unit: string) {
  const value = Number(raw.replace(/\s/g, "").replace(",", "."));
  if (!Number.isFinite(value)) return null;
  const u = unit.toLowerCase();
  if (u.startsWith("млн") || u === "m") return Math.round(value * 1_000_000);
  if (u.startsWith("тыс") || u === "k" || u === "к") return Math.round(value * 1_000);
  return Math.round(value);
}

function parseRuDate(text: string) {
  const numeric = text.match(/до\s+(\d{1,2})[./](\d{1,2})[./](\d{4})/i);
  if (numeric) return `${numeric[3]}-${numeric[2].padStart(2, "0")}-${numeric[1].padStart(2, "0")}`;

  const verbal = text.match(/до\s+(\d{1,2})\s+([а-яё]+)\s+(\d{4})/i);
  if (!verbal) return null;
  const monthWord = verbal[2].toLowerCase();
  const key = Object.keys(MONTHS_GENITIVE)
    .sort((a, b) => b.length - a.length)
    .find((prefix) => monthWord.startsWith(prefix));
  if (!key) return null;
  return `${verbal[3]}-${String(MONTHS_GENITIVE[key]).padStart(2, "0")}-${verbal[1].padStart(2, "0")}`;
}

function sectionLines(lines: string[], heading: RegExp) {
  const start = lines.findIndex((line) => heading.test(line));
  if (start === -1) return [];
  const result: string[] = [];
  for (const line of lines.slice(start + 1)) {
    if (!/^\s*[—–\-•*·]/.test(line)) {
      if (result.length) break;
      if (!line.trim()) continue;
      break;
    }
    result.push(line.replace(/^\s*[—–\-•*·]\s*/, "").trim());
  }
  return result;
}

function parsePriceLine(line: string) {
  const amount = line.match(/^([\d\s.,]+\s*(?:AED|USD|EUR|RUB|GBP|SAR|\$|€|₽|руб\.?|дирхам\w*))|^([$€₽]\s?[\d\s.,]+)/i);
  if (!amount) return null;
  const price = (amount[1] || amount[2]).replace(/\s+/g, " ").trim();
  const approx = line.match(/\((?:примерно|около|≈|~)\s*([^)]+)\)/i)?.[1]?.trim();
  const rest = line
    .slice(amount[0].length)
    .replace(/\([^)]*\)/, "")
    .replace(/^[\s—–-]+/, "")
    .replace(/\.$/, "")
    .trim();
  const note = [approx ? `≈ ${approx}` : null, rest || null].filter(Boolean).join(" · ");
  return { price, note: note || null };
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function parseMediaOffer(text: string): MediaDraft {
  const draft: MediaDraft = {};
  const lines = text.split(/\r?\n/).map((line) => line.trim());
  const flat = text.replace(/\s+/g, " ");

  const name =
    flat.match(/ответ от\s+(.+?)\s+[—–-]\s/i)?.[1] ||
    flat.match(/(?:^|\s)от\s+([A-ZА-ЯЁ][^—–\n]{2,60}?)\s+[—–]\s/)?.[1];
  if (name) draft.name = name.trim();

  const founded = flat.match(/(?:с|since)\s+((?:19|20)\d{2})\s*(?:года|г\.)?/i);
  if (founded) draft.founded_year = Number(founded[1]);

  const urls = Array.from(text.matchAll(/https?:\/\/[^\s)>\]]+/gi)).map((match) => match[0].replace(/[.,;]$/, ""));
  const instagram = urls.find((url) => /instagram\.com/i.test(url));
  if (instagram) draft.instagram_url = instagram;
  const website = urls.find((url) => !/instagram\.com|t\.me|youtube\.com|tiktok\.com/i.test(url));
  if (website) draft.website_url = website;

  const audienceLine = lines.find((line) => /аудитори|подписчик|followers/i.test(line));
  if (audienceLine) {
    const audience = audienceLine.match(/([\d]+(?:[.,]\d+)?(?:\s\d{3})*)\s*(млн|тыс|[mkк])(?![a-zа-яё])/i);
    if (audience) draft.audience = parseAudienceNumber(audience[1], audience[2]) ?? undefined;
    const sentences = audienceLine.replace(/^Аудитория:\s*/i, "").split(/(?<=\.)\s+/);
    if (sentences.length > 1) draft.audience_note = sentences.slice(1).join(" ").replace(/\.$/, "");
  }

  const formats = sectionLines(lines, /формат/i);
  if (formats.length) draft.formats = formats.map((line) => line.replace(/\.$/, "")).join("\n");

  const languages = LANGUAGE_CODES.filter(([pattern]) => pattern.test(formats.join(" ") || flat)).map(([, code]) => code);
  if (languages.length) draft.languages = languages.join(" / ");

  const prices = sectionLines(lines, /стоимост|цена|price/i)
    .map(parsePriceLine)
    .filter((item): item is NonNullable<ReturnType<typeof parsePriceLine>> => Boolean(item));
  if (prices[0]) {
    draft.price = prices[0].price;
    draft.price_note = prices[0].note;
  }
  if (prices[1]) {
    draft.price_alt = prices[1].price;
    draft.price_alt_note = prices[1].note;
  }

  const termsLine = lines.find((line) => /^условия/i.test(line));
  if (termsLine) {
    const terms = termsLine
      .replace(/^условия:\s*/i, "")
      .split(/(?<=\.)\s+/)
      .filter((sentence) => !/действует|бронирован/i.test(sentence))
      .join(" ")
      .replace(/\.$/, "");
    if (terms) draft.payment_terms = capitalize(terms);
  }

  const until = parseRuDate(flat);
  if (until) draft.offer_until = until;

  const questionLine = lines.find((line) => /^(важный момент|важно|вопрос|уточнить)/i.test(line));
  if (questionLine) draft.open_questions = capitalize(questionLine.replace(/^[^:]+:\s*/, "").replace(/\s{2,}/g, " "));

  return draft;
}
