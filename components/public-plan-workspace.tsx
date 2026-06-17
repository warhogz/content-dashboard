"use client";

import Link from "next/link";
import { Fragment, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { ProjectSegmentedToggle } from "@/components/project-segmented-toggle";
import { ImagePreload } from "@/components/image-preload";
import { parseMonthLabelToDate, plannerDayOrder } from "@/lib/plan/dates";
import { type PlannerWeekSummary, type PlannerLibraryCard, type PlannerResolvedEntry } from "@/lib/supabase/planner-data";
import { PlannedDay, PlannedWeek, ProjectKey } from "@/lib/types";
import { resolveCardPreviewUrl } from "@/lib/dropbox-links";

type ViewMode = "month" | PlannedWeek;

type WeekViewModel = {
  id: string;
  weekKey: PlannedWeek;
  rangeLabel: string;
  postsCount: number;
  score: number | null;
  scoreLabel: string;
  categorySummary: string;
  entries: PlannerResolvedEntry[];
  mainCards: PlannerLibraryCard[];
  issues: string[];
  isEmpty: boolean;
};

type DrawerState = {
  weekLabel: string;
  dayLabel: string;
  card: PlannerLibraryCard;
  alternatives: PlannerLibraryCard[];
};

const WEEK_OPTIONS: Array<{ value: PlannedWeek; label: string; startDay: number }> = [
  { value: "week_1", label: "Week 1", startDay: 1 },
  { value: "week_2", label: "Week 2", startDay: 8 },
  { value: "week_3", label: "Week 3", startDay: 15 },
  { value: "week_4", label: "Week 4", startDay: 22 },
  { value: "week_5", label: "Week 5", startDay: 29 }
];

const DAY_LABELS: Record<PlannedDay, { short: string; long: string }> = {
  monday: { short: "Пн", long: "Понедельник" },
  tuesday: { short: "Вт", long: "Вторник" },
  wednesday: { short: "Ср", long: "Среда" },
  thursday: { short: "Чт", long: "Четверг" }
};

function modeLinkClass(active: boolean) {
  return `rounded-full px-4 py-2 text-sm font-medium transition duration-200 ${active ? "" : "hover:text-[var(--theme-text)]"}`;
}

function normalizeValue(value: string | null | undefined) {
  return value?.trim() || "";
}

function normalizeValueLower(value: string | null | undefined) {
  return normalizeValue(value).toLowerCase();
}

function monthLabelRu(monthLabel: string) {
  const date = parseMonthLabelToDate(monthLabel);
  if (!date) return monthLabel;
  return date.toLocaleDateString("ru-RU", { month: "long", year: "numeric" }).replace(/^./, (letter) => letter.toUpperCase());
}

function monthShortRu(monthLabel: string) {
  const date = parseMonthLabelToDate(monthLabel);
  if (!date) return monthLabel;
  return date.toLocaleDateString("ru-RU", { month: "short" }).replace(".", "");
}

function weekLabelRu(weekKey: PlannedWeek) {
  return `Неделя ${weekKey.replace("week_", "")}`;
}

function getWeekStartDay(weekKey: PlannedWeek) {
  return WEEK_OPTIONS.find((option) => option.value === weekKey)?.startDay || 1;
}

function weekRangeRu(monthLabel: string, weekKey: PlannedWeek) {
  const date = parseMonthLabelToDate(monthLabel);
  if (!date) return "Пн–Чт";

  const startDay = getWeekStartDay(weekKey);
  const endDay = Math.min(startDay + 3, new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate());
  const monthShort = monthShortRu(monthLabel);

  if (weekKey === "week_5") {
    const endDate = new Date(date.getFullYear(), date.getMonth(), endDay);
    const endMonthShort = endDate.toLocaleDateString("ru-RU", { month: "short" }).replace(".", "");
    return `${startDay} ${monthShort} – ${endDay} ${endMonthShort}`;
  }

  return `${startDay}–${endDay} ${monthShort}`;
}

function dayLabelRu(monthLabel: string, weekKey: PlannedWeek, dayKey: PlannedDay) {
  const startDay = getWeekStartDay(weekKey);
  const numericDay = startDay + plannerDayOrder.indexOf(dayKey);
  return `${DAY_LABELS[dayKey].long} · ${numericDay} ${monthShortRu(monthLabel)}`;
}

function typeLabel(card: PlannerLibraryCard | null | undefined) {
  return normalizeValue(card?.type?.title) || "Без типа";
}

function typeTone(typeTitle: string) {
  const normalized = typeTitle.toLowerCase();

  if (normalized.includes("carousel")) {
    return {
      accent: "#ff9f43",
      glow: "rgba(255,159,67,.26)",
      soft: "rgba(255,159,67,.12)"
    };
  }

  if (normalized.includes("overview")) {
    return {
      accent: "#4aa3ff",
      glow: "rgba(74,163,255,.24)",
      soft: "rgba(74,163,255,.11)"
    };
  }

  if (normalized.includes("talking")) {
    return {
      accent: "#a371ff",
      glow: "rgba(163,113,255,.24)",
      soft: "rgba(163,113,255,.12)"
    };
  }

  if (normalized.includes("trend")) {
    return {
      accent: "#55d879",
      glow: "rgba(85,216,121,.24)",
      soft: "rgba(85,216,121,.11)"
    };
  }

  return {
    accent: "var(--theme-accent-strong)",
    glow: "var(--theme-accent-shadow)",
    soft: "color-mix(in srgb, var(--theme-accent) 12%, transparent)"
  };
}

function cardAspectClass(card: PlannerLibraryCard | null | undefined, compact = false) {
  const lower = normalizeValueLower(card?.type?.title);
  if (lower.includes("carousel")) return compact ? "aspect-[4/5]" : "aspect-[4/5]";
  return compact ? "aspect-[9/16]" : "aspect-[9/16]";
}

function renderMetricList(cards: PlannerLibraryCard[], key: "project_name" | "room_zone") {
  const counts = new Map<string, number>();
  for (const card of cards) {
    const value = normalizeValue(card[key]);
    if (!value) continue;
    counts.set(value, (counts.get(value) || 0) + 1);
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ru"))
    .map(([label, count]) => `${label} ×${count}`)
    .join(", ");
}

function renderTypeMetricList(cards: PlannerLibraryCard[]) {
  const counts = new Map<string, number>();
  for (const card of cards) {
    const value = typeLabel(card);
    if (!value) continue;
    counts.set(value, (counts.get(value) || 0) + 1);
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ru"))
    .map(([label, count]) => `${label} ×${count}`)
    .join(", ");
}

function getSlot(entries: PlannerResolvedEntry[], day: PlannedDay, role: "main" | "alternative", position: number) {
  return entries.find((entry) => entry.day_key === day && entry.role === role && entry.position === position) || null;
}

function getWeekIssues(cards: PlannerLibraryCard[]) {
  const visibleCards = cards.filter(Boolean);
  const issues: string[] = [];

  if (visibleCards.length < 4) {
    issues.push(`Заполнено только ${visibleCards.length} из 4 слотов, неделя выглядит недособранной.`);
  }

  if (!visibleCards.some((card) => normalizeValueLower(card.type?.title).includes("carousel"))) {
    issues.push("В неделе нет Carousel, поэтому визуальный ритм становится слабее.");
  }

  for (let index = 1; index < visibleCards.length; index += 1) {
    const previous = visibleCards[index - 1];
    const current = visibleCards[index];
    const previousType = typeLabel(previous);
    const currentType = typeLabel(current);
    const previousRoom = normalizeValue(previous.room_zone);
    const currentRoom = normalizeValue(current.room_zone);
    const previousProject = normalizeValue(previous.project_name) || previous.title;
    const currentProject = normalizeValue(current.project_name) || current.title;

    if (previousType && previousType === currentType) {
      issues.push(`${previousType} повторяется подряд: ${previousProject} и ${currentProject} идут один за другим.`);
    }

    if (previousRoom && previousRoom === currentRoom) {
      issues.push(`${previousRoom} повторяется подряд: ${previousProject} и ${currentProject} остаются в одной зоне.`);
    }
  }

  const projectCounts = new Map<string, number>();
  for (const card of visibleCards) {
    const project = normalizeValue(card.project_name);
    if (!project) continue;
    projectCounts.set(project, (projectCounts.get(project) || 0) + 1);
  }

  for (const [project, count] of projectCounts.entries()) {
    if (count >= 3) {
      issues.push(`Проект ${project} встречается ${count} раза за неделю и начинает доминировать.`);
    }
  }

  const missingDropboxCount = visibleCards.filter((card) => !normalizeValue(card.link)).length;
  if (missingDropboxCount > 0) {
    issues.push(`У ${missingDropboxCount} ${missingDropboxCount === 1 ? "поста" : "постов"} нет Dropbox-ссылки.`);
  }

  return Array.from(new Set(issues));
}

function monthBalance(weeks: WeekViewModel[]) {
  const weightedWeeks = weeks.filter((week) => week.score != null);
  if (!weightedWeeks.length) {
    return {
      score: null as number | null,
      label: "Пусто",
      note: "В этом месяце ещё нет собранных недель.",
      issues: [] as string[]
    };
  }

  const totalPosts = weightedWeeks.reduce((sum, week) => sum + week.postsCount, 0);
  const weightedScoreBase = weightedWeeks.reduce((sum, week) => sum + (week.score || 0) * Math.max(week.postsCount, 1), 0);
  const weightedScore = totalPosts ? weightedScoreBase / totalPosts : 0;
  const incompleteWeeks = weightedWeeks.filter((week) => week.postsCount > 0 && week.postsCount < 4).length;
  const emptyWeeks = weeks.filter((week) => week.postsCount === 0).length;
  const score = Math.max(0, Math.min(100, Math.round(weightedScore - incompleteWeeks * 6 - emptyWeeks * 8)));
  const issues: string[] = [];

  if (totalPosts < weeks.length * 4) {
    issues.push(`В месяце заполнено ${totalPosts} из ${weeks.length * 4} слотов, поэтому баланс пока проседает.`);
  }

  if (emptyWeeks > 0) {
    issues.push(`${emptyWeeks} ${emptyWeeks === 1 ? "неделя ещё пустая" : emptyWeeks < 5 ? "недели ещё пустые" : "недель ещё пустые"}, разнообразие месяца не раскрыто полностью.`);
  }

  for (const week of weightedWeeks.sort((a, b) => (a.score || 0) - (b.score || 0)).slice(0, 2)) {
    if (week.issues[0]) {
      issues.push(`${weekLabelRu(week.weekKey)}: ${week.issues[0]}`);
    }
  }

  return {
    score,
    label: score >= 80 ? "Сильный баланс" : score >= 60 ? "Живой, но неровный микс" : score >= 40 ? "Баланс проседает" : "Структура повторяется",
    note: "Этот процент показывает разнообразие контента, а не качество роликов.",
    issues: Array.from(new Set(issues)).slice(0, 4)
  };
}

function weekStatusTone(week: WeekViewModel) {
  if (week.postsCount === 4 && (week.score || 0) >= 75) return { color: "#55d879", background: "rgba(85,216,121,.10)", border: "rgba(85,216,121,.24)" };
  if (week.postsCount > 0) return { color: "#e9b241", background: "rgba(233,178,65,.10)", border: "rgba(233,178,65,.24)" };
  return { color: "var(--theme-text-muted)", background: "rgba(255,255,255,.045)", border: "var(--theme-border)" };
}

function formatWeekStatus(week: WeekViewModel) {
  if (week.postsCount === 0) return "План не создан";
  return `${week.postsCount} из 4 запланировано`;
}

function buildAlternativeEffect(primary: PlannerLibraryCard, alternative: PlannerLibraryCard) {
  const primaryType = typeLabel(primary);
  const alternativeType = typeLabel(alternative);
  const primaryProject = normalizeValue(primary.project_name);
  const alternativeProject = normalizeValue(alternative.project_name);
  const primaryRoom = normalizeValue(primary.room_zone);
  const alternativeRoom = normalizeValue(alternative.room_zone);
  const statements: string[] = [];

  if (primaryType === alternativeType) {
    statements.push(`Сохраняет ${alternativeType}`);
  } else {
    statements.push(`Меняет ${primaryType} на ${alternativeType}`);
  }

  if (primaryProject && alternativeProject && primaryProject !== alternativeProject) {
    statements.push(`добавляет проект ${alternativeProject}`);
  }

  if (primaryRoom && alternativeRoom && primaryRoom !== alternativeRoom) {
    statements.push(`переносит акцент в ${alternativeRoom}`);
  } else if (alternativeRoom) {
    statements.push(`оставляет фокус на зоне ${alternativeRoom}`);
  }

  return `${statements.join(", ")}.`;
}

function MiniCover({
  card,
  className = "",
  compact = false
}: {
  card: PlannerLibraryCard;
  className?: string;
  compact?: boolean;
}) {
  const previewUrl = resolveCardPreviewUrl(card.thumbnail_url);

  return (
    <div
      className={`${cardAspectClass(card, compact)} overflow-hidden rounded-[16px] border ${className}`}
      style={{
        borderColor: "rgba(255,255,255,.12)",
        background: "var(--theme-image-bg)",
        boxShadow: "0 12px 34px rgba(0,0,0,.28)"
      }}
    >
      {previewUrl ? (
        <img src={previewUrl} alt={card.title} className="h-full w-full object-cover" loading="eager" decoding="async" />
      ) : (
        <div className="flex h-full items-center justify-center px-3 text-center text-xs" style={{ color: "var(--theme-text-muted)" }}>
          Нет превью
        </div>
      )}
    </div>
  );
}

function RoleBadge({ card, compact = false }: { card: PlannerLibraryCard; compact?: boolean }) {
  const title = typeLabel(card);
  const tone = typeTone(title);

  return (
    <span
      className={`inline-flex w-fit items-center justify-center rounded-full border font-semibold ${compact ? "px-2.5 py-1 text-[10px]" : "px-3 py-1.5 text-xs"}`}
      style={{
        borderColor: tone.accent,
        background: tone.soft,
        color: "#fff",
        boxShadow: `0 0 18px ${tone.glow}`
      }}
    >
      {title}
    </span>
  );
}

export function PublicPlanWorkspace({ weeks }: { weeks: PlannerWeekSummary[] }) {
  const [projectKey, setProjectKey] = useState<ProjectKey>("main");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [drawer, setDrawer] = useState<DrawerState | null>(null);

  const groupedMonths = useMemo(() => {
    const monthMap = new Map<string, PlannerWeekSummary[]>();

    for (const week of weeks) {
      if (week.project_key !== projectKey) continue;
      const current = monthMap.get(week.month_label);
      if (current) {
        current.push(week);
      } else {
        monthMap.set(week.month_label, [week]);
      }
    }

    return Array.from(monthMap.entries())
      .map(([label, monthWeeks]) => ({
        label,
        weeks: monthWeeks.sort((a, b) => getWeekStartDay(a.week_key) - getWeekStartDay(b.week_key))
      }))
      .sort((a, b) => {
        const aDate = parseMonthLabelToDate(a.label)?.getTime() || 0;
        const bDate = parseMonthLabelToDate(b.label)?.getTime() || 0;
        return aDate - bDate;
      });
  }, [projectKey, weeks]);

  useEffect(() => {
    if (!groupedMonths.length) return;
    setSelectedMonth((current) => (current && groupedMonths.some((month) => month.label === current) ? current : groupedMonths[0].label));
  }, [groupedMonths]);

  const activeMonth = useMemo(() => groupedMonths.find((month) => month.label === selectedMonth) || null, [groupedMonths, selectedMonth]);

  const weekViews = useMemo<WeekViewModel[]>(() => {
    if (!activeMonth) return [];

    return WEEK_OPTIONS.map((option) => {
      const week = activeMonth.weeks.find((item) => item.week_key === option.value) || null;

      if (!week) {
        return {
          id: `${activeMonth.label}-${option.value}`,
          weekKey: option.value,
          rangeLabel: weekRangeRu(activeMonth.label, option.value),
          postsCount: 0,
          score: null,
          scoreLabel: "Пусто",
          categorySummary: "",
          entries: [],
          mainCards: [],
          issues: [],
          isEmpty: true
        };
      }

      return {
        id: week.id,
        weekKey: week.week_key,
        rangeLabel: weekRangeRu(week.month_label, week.week_key),
        postsCount: week.postsCount,
        score: week.score.total,
        scoreLabel: week.score.label,
        categorySummary: week.categorySummary,
        entries: week.entries,
        mainCards: week.mainCards,
        issues: getWeekIssues(week.mainCards),
        isEmpty: week.postsCount === 0
      };
    });
  }, [activeMonth]);

  useEffect(() => {
    if (!activeMonth) return;
    if (viewMode === "month") return;
    if (!weekViews.some((week) => week.weekKey === viewMode)) {
      setViewMode("month");
    }
  }, [activeMonth, viewMode, weekViews]);

  const selectedWeekView = useMemo(() => {
    if (viewMode === "month") return weekViews[0] || null;
    return weekViews.find((week) => week.weekKey === viewMode) || null;
  }, [viewMode, weekViews]);

  const monthCards = useMemo(() => weekViews.flatMap((week) => week.mainCards), [weekViews]);
  const monthTypes = useMemo(() => {
    const groups = new Map<string, PlannerLibraryCard[]>();

    for (const card of monthCards) {
      const title = typeLabel(card);
      const current = groups.get(title);
      if (current) current.push(card);
      else groups.set(title, [card]);
    }

    return Array.from(groups.entries())
      .map(([title, cards]) => ({
        title,
        cards,
        projects: renderMetricList(cards, "project_name"),
        rooms: renderMetricList(cards, "room_zone")
      }))
      .sort((a, b) => b.cards.length - a.cards.length || a.title.localeCompare(b.title, "ru"));
  }, [monthCards]);

  const monthSummary = useMemo(() => monthBalance(weekViews), [weekViews]);

  const preloadUrls = useMemo(() => {
    const allCards = [
      ...monthCards,
      ...(drawer ? [drawer.card, ...drawer.alternatives] : [])
    ];

    return Array.from(new Set(allCards.map((card) => resolveCardPreviewUrl(card.thumbnail_url)).filter((url): url is string => Boolean(url))));
  }, [drawer, monthCards]);

  const openEntryDrawer = (week: WeekViewModel, day: PlannedDay) => {
    const primary = getSlot(week.entries, day, "main", 0)?.card || null;
    if (!primary) return;

    const alternatives = [
      getSlot(week.entries, day, "alternative", 1)?.card || null,
      getSlot(week.entries, day, "alternative", 2)?.card || null
    ].filter((card): card is PlannerLibraryCard => Boolean(card));

    setDrawer({
      weekLabel: weekLabelRu(week.weekKey),
      dayLabel: dayLabelRu(activeMonth?.label || "", week.weekKey, day),
      card: primary,
      alternatives
    });
  };

  if (!weeks.length || !activeMonth) return null;

  return (
    <div className="space-y-5">
      <ImagePreload urls={preloadUrls} concurrency={8} priorityCount={18} />

      <section
        className="overflow-hidden rounded-[34px] border backdrop-blur-2xl"
        style={{
          borderColor: "var(--theme-border)",
          background:
            "radial-gradient(circle at 94% 0%, rgba(255,49,49,.18), transparent 32%), radial-gradient(circle at 8% 10%, rgba(255,255,255,.05), transparent 27%), radial-gradient(circle at 50% 116%, rgba(141,16,20,.28), transparent 42%), linear-gradient(180deg, rgba(11,13,18,.98), rgba(5,6,9,.985))",
          boxShadow: "0 24px 90px rgba(0,0,0,.5)"
        }}
      >
        <div className="space-y-7 p-5 sm:p-7 lg:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="label tracking-[0.24em]" style={{ color: "rgba(246,241,233,.42)" }}>
                План публикаций
              </div>
              <h1 className="mt-5 text-[42px] font-semibold leading-[0.96] tracking-[-0.065em] sm:text-[56px]" style={{ color: "var(--theme-text)" }}>
                Plan
              </h1>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <span
                  className="inline-flex rounded-[17px] border px-4 py-2 text-[15px] font-semibold"
                  style={{
                    borderColor: "rgba(255,255,255,.14)",
                    background: "rgba(255,255,255,.04)",
                    color: "var(--theme-text)"
                  }}
                >
                  {monthLabelRu(activeMonth.label)}
                </span>
                <span
                  className="inline-flex rounded-full border px-3 py-2 text-[12px] font-semibold"
                  style={{
                    borderColor: "rgba(255,255,255,.12)",
                    background: "rgba(255,255,255,.03)",
                    color: "rgba(246,241,233,.72)"
                  }}
                >
                  Баланс разнообразия, а не качества роликов
                </span>
              </div>
              <p className="mt-4 max-w-3xl text-[15px] leading-7 sm:text-[17px]" style={{ color: "rgba(246,241,233,.66)" }}>
                Founder-view для месяца: показывает, насколько неделя и месяц собраны по разнообразию контента, и сразу подсвечивает места, где структура начинает повторяться.
              </p>
            </div>

            <div
              className="inline-flex items-center gap-1 self-start rounded-full border p-1 backdrop-blur-xl"
              style={{
                borderColor: "var(--theme-border)",
                background: "rgba(255,255,255,.035)",
                boxShadow: "var(--theme-shadow-lift)"
              }}
            >
              <Link href="/" className={modeLinkClass(false)} style={{ color: "var(--theme-text-muted)", background: "transparent" }}>
                Лента
              </Link>
              <Link href="/bloggers" className={modeLinkClass(false)} style={{ color: "var(--theme-text-muted)", background: "transparent" }}>
                Блогеры
              </Link>
              <span
                className={modeLinkClass(true)}
                style={{
                  color: "var(--theme-text)",
                  background: "rgba(255,49,49,.13)",
                  boxShadow: "inset 0 0 0 1px rgba(255,49,49,.28)"
                }}
              >
                Plan
              </span>
            </div>
          </div>

          <div className="grid gap-4 rounded-[26px] border p-4 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-center" style={{ borderColor: "var(--theme-border)", background: "rgba(255,255,255,.03)" }}>
            <div className="inline-flex w-fit rounded-[18px] border p-[5px]" style={{ borderColor: "var(--theme-border)", background: "rgba(255,255,255,.035)" }}>
              <ProjectSegmentedToggle
                value={projectKey}
                onChange={(value) => {
                  setProjectKey(value);
                  setSelectedMonth("");
                  setViewMode("month");
                }}
                className="border-0 bg-transparent p-0 shadow-none"
                options={[
                  { value: "main", label: "LA" },
                  { value: "mena", label: "Mena" }
                ]}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-[minmax(220px,280px)_1fr] sm:items-center lg:min-w-[720px]">
              <Select value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)}>
                {groupedMonths.map((month) => (
                  <option key={month.label} value={month.label}>
                    {monthLabelRu(month.label)}
                  </option>
                ))}
              </Select>

              <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <button
                  type="button"
                  onClick={() => setViewMode("month")}
                  className="whitespace-nowrap rounded-[14px] px-4 py-2.5 text-sm font-semibold transition"
                  style={{
                    color: viewMode === "month" ? "var(--theme-text)" : "var(--theme-text-muted)",
                    background: viewMode === "month" ? "rgba(255,49,49,.13)" : "rgba(255,255,255,.02)",
                    boxShadow: viewMode === "month" ? "inset 0 0 0 1px rgba(255,49,49,.28)" : "inset 0 0 0 1px var(--theme-border)"
                  }}
                >
                  Месяц
                </button>
                {WEEK_OPTIONS.map((week) => (
                  <button
                    key={week.value}
                    type="button"
                    onClick={() => setViewMode(week.value)}
                    className="whitespace-nowrap rounded-[14px] px-4 py-2.5 text-sm font-semibold transition"
                    style={{
                      color: viewMode === week.value ? "var(--theme-text)" : "var(--theme-text-muted)",
                      background: viewMode === week.value ? "rgba(255,49,49,.13)" : "rgba(255,255,255,.02)",
                      boxShadow: viewMode === week.value ? "inset 0 0 0 1px rgba(255,49,49,.28)" : "inset 0 0 0 1px var(--theme-border)"
                    }}
                  >
                    {weekLabelRu(week.value)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {viewMode === "month" ? (
            <div className="space-y-4">
              <section
                className="grid gap-4 rounded-[28px] border p-4 lg:grid-cols-[188px_minmax(0,1fr)]"
                style={{
                  borderColor: "var(--theme-border)",
                  background: "radial-gradient(circle at 96% 6%, rgba(255,49,49,.13), transparent 31%), rgba(255,255,255,.038)"
                }}
              >
                <div
                  className="grid min-h-[160px] place-items-center rounded-[22px] border text-center"
                  style={{ borderColor: "var(--theme-border)", background: "rgba(0,0,0,.18)" }}
                >
                  <div>
                    <div className="text-[56px] font-semibold leading-[0.95] tracking-[-0.08em]" style={{ color: "var(--theme-text)" }}>
                      {monthSummary.score == null ? "—" : `${monthSummary.score}%`}
                    </div>
                    <div className="mt-3 text-[13px] font-semibold" style={{ color: "rgba(246,241,233,.66)" }}>
                      {monthSummary.label}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h2 className="text-[30px] font-semibold leading-none tracking-[-0.05em]" style={{ color: "var(--theme-text)" }}>
                      {monthLabelRu(activeMonth.label)}
                    </h2>
                    <div
                      className="mt-4 inline-flex rounded-full border px-3 py-2 text-xs font-semibold"
                      style={{ borderColor: "rgba(255,255,255,.12)", background: "rgba(255,255,255,.04)", color: "rgba(246,241,233,.74)" }}
                    >
                      {monthSummary.note}
                    </div>
                  </div>

                  <p className="max-w-3xl text-[15px] leading-7" style={{ color: "rgba(246,241,233,.66)" }}>
                    Этот экран месяца нужен для одного: быстро показать, насколько сейчас сбалансирован план, где падает разнообразие и в каких неделях начинают повторяться один и тот же проект, комната или формат.
                  </p>

                  {monthSummary.issues.length ? (
                    <div className="grid gap-2">
                      {monthSummary.issues.map((issue) => (
                        <div
                          key={issue}
                          className="rounded-[16px] border px-4 py-3 text-sm leading-6"
                          style={{ borderColor: "rgba(255,255,255,.12)", background: "rgba(255,255,255,.035)", color: "rgba(246,241,233,.82)" }}
                        >
                          {issue}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </section>

              <section className="rounded-[28px] border p-4" style={{ borderColor: "var(--theme-border)", background: "rgba(255,255,255,.035)" }}>
                <div className="mb-3 text-[11px] uppercase tracking-[0.12em]" style={{ color: "rgba(246,241,233,.66)" }}>
                  Состав месяца
                </div>
                <p className="mb-4 max-w-3xl text-sm leading-6" style={{ color: "rgba(246,241,233,.66)" }}>
                  Здесь видно, какие форматы доминируют в месяце и как они распределяются по проектам и комнатам.
                </p>

                <div className="grid gap-3">
                  {monthTypes.length ? (
                    monthTypes.map((group) => {
                      const tone = typeTone(group.title);
                      return (
                        <div
                          key={group.title}
                          className="grid gap-3 rounded-[18px] border p-4 md:grid-cols-[140px_minmax(0,1fr)_minmax(0,1fr)] md:items-center"
                          style={{ borderColor: "var(--theme-border)", background: "rgba(255,255,255,.03)" }}
                        >
                          <span
                            className="inline-flex w-fit rounded-full border px-3 py-2 text-sm font-semibold"
                            style={{ borderColor: tone.accent, background: tone.soft, color: "#fff", boxShadow: `0 0 18px ${tone.glow}` }}
                          >
                            {group.title} ×{group.cards.length}
                          </span>
                          <div className="text-sm leading-6" style={{ color: "rgba(246,241,233,.9)" }}>
                            <span className="block text-[10px] uppercase tracking-[0.12em]" style={{ color: "rgba(246,241,233,.42)" }}>
                              Проекты
                            </span>
                            {group.projects || "Нет привязки"}
                          </div>
                          <div className="text-sm leading-6" style={{ color: "rgba(246,241,233,.9)" }}>
                            <span className="block text-[10px] uppercase tracking-[0.12em]" style={{ color: "rgba(246,241,233,.42)" }}>
                              Комнаты / зоны
                            </span>
                            {group.rooms || "Нет привязки"}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="rounded-[18px] border border-dashed px-4 py-10 text-center text-sm" style={{ borderColor: "var(--theme-border)", color: "var(--theme-text-muted)" }}>
                      В этом месяце ещё нет контента для сводки.
                    </div>
                  )}
                </div>
              </section>

              <section className="overflow-hidden rounded-[28px] border" style={{ borderColor: "var(--theme-border)", background: "rgba(255,255,255,.035)" }}>
                <div className="flex items-center justify-between gap-4 border-b px-4 py-4" style={{ borderColor: "var(--theme-border)" }}>
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.12em]" style={{ color: "rgba(246,241,233,.66)" }}>
                      Календарь месяца
                    </div>
                    <div className="mt-1 text-sm" style={{ color: "rgba(246,241,233,.42)" }}>
                      Понедельник - четверг, только основные публикации
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  <div className="grid min-w-[920px] grid-cols-[92px_repeat(4,minmax(0,1fr))]">
                    <div className="border-r border-b" style={{ borderColor: "var(--theme-border)", background: "rgba(0,0,0,.13)" }} />
                    {plannerDayOrder.map((day) => (
                      <div
                        key={day}
                        className="flex min-h-[42px] items-center justify-center border-r border-b text-xs font-semibold uppercase tracking-[0.1em]"
                        style={{ borderColor: "var(--theme-border)", background: "rgba(0,0,0,.13)", color: "rgba(246,241,233,.66)" }}
                      >
                        {DAY_LABELS[day].short}
                      </div>
                    ))}

                    {weekViews.map((week) => (
                      <Fragment key={week.id}>
                        <div
                          key={`${week.id}-label`}
                          className="flex min-h-[148px] flex-col justify-center border-r border-b px-3 py-4"
                          style={{ borderColor: "var(--theme-border)", background: "rgba(0,0,0,.08)" }}
                        >
                          <strong className="text-sm font-semibold" style={{ color: "var(--theme-text)" }}>
                            {weekLabelRu(week.weekKey)}
                          </strong>
                          <span className="mt-2 text-xs leading-5" style={{ color: "rgba(246,241,233,.42)" }}>
                            {week.rangeLabel}
                            <br />
                            {week.postsCount ? `${week.postsCount} из 4 запланировано` : "план не создан"}
                          </span>
                        </div>

                        {plannerDayOrder.map((day) => {
                          const card = getSlot(week.entries, day, "main", 0)?.card || null;
                          const tone = typeTone(typeLabel(card));

                          return card ? (
                            <button
                              key={`${week.id}-${day}`}
                              type="button"
                              onClick={() => openEntryDrawer(week, day)}
                              className="grid min-h-[148px] grid-cols-[50px_minmax(0,1fr)] grid-rows-[auto_auto_auto] content-start gap-x-3 gap-y-2 border-r border-b p-3 text-left transition hover:bg-[rgba(255,255,255,.045)]"
                              style={{ borderColor: "var(--theme-border)", background: "rgba(255,255,255,.025)" }}
                            >
                              <MiniCover card={card} compact className="row-span-3" />
                              <div className="flex items-center justify-between gap-2 text-xs" style={{ color: "rgba(246,241,233,.42)" }}>
                                <strong className="text-[13px] uppercase tracking-[0.08em]" style={{ color: "var(--theme-text)" }}>
                                  {DAY_LABELS[day].short}
                                </strong>
                                <span>{dayLabelRu(activeMonth.label, week.weekKey, day).split("· ")[1]}</span>
                              </div>
                              <span
                                className="inline-flex w-fit rounded-full border px-2.5 py-1 text-[11px] font-semibold"
                                style={{ borderColor: tone.accent, background: tone.soft, color: "#fff", boxShadow: `0 0 12px ${tone.glow}` }}
                              >
                                {typeLabel(card)}
                              </span>
                              <div className="space-y-1">
                                <div className="text-[10px] uppercase tracking-[0.1em]" style={{ color: "rgba(246,241,233,.42)" }}>
                                  Проект
                                </div>
                                <div className="text-sm font-medium" style={{ color: "rgba(246,241,233,.92)" }}>
                                  {normalizeValue(card.project_name) || "Не указан"}
                                </div>
                                <div className="text-[10px] uppercase tracking-[0.1em]" style={{ color: "rgba(246,241,233,.42)" }}>
                                  Комната
                                </div>
                                <div className="text-sm font-medium" style={{ color: "rgba(246,241,233,.92)" }}>
                                  {normalizeValue(card.room_zone) || "Не указана"}
                                </div>
                              </div>
                            </button>
                          ) : (
                            <div
                              key={`${week.id}-${day}`}
                              className="grid min-h-[148px] place-items-center border-r border-b px-4 text-center text-xs leading-5"
                              style={{ borderColor: "var(--theme-border)", background: "rgba(255,255,255,.02)", color: "rgba(246,241,233,.34)" }}
                            >
                              Пустой слот
                            </div>
                          );
                        })}
                      </Fragment>
                    ))}
                  </div>
                </div>
              </section>
            </div>
          ) : selectedWeekView ? (
            <div className="space-y-4">
              <div className="flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {weekViews.map((week) => {
                  const active = week.weekKey === viewMode;
                  const statusTone = weekStatusTone(week);

                  return (
                    <button
                      key={week.id}
                      type="button"
                      onClick={() => setViewMode(week.weekKey)}
                      className="min-w-[226px] rounded-[22px] border p-4 text-left"
                      style={{
                        borderColor: active ? "rgba(255,49,49,.9)" : "var(--theme-border)",
                        background: active
                          ? "radial-gradient(circle at 88% 12%, rgba(255,49,49,.18), transparent 32%), rgba(255,49,49,.06)"
                          : "radial-gradient(circle at 88% 12%, rgba(255,49,49,.08), transparent 31%), rgba(255,255,255,.035)",
                        boxShadow: active ? "0 0 0 1px rgba(255,49,49,.18) inset" : "none"
                      }}
                    >
                      <h3 className="text-[19px] font-semibold tracking-[-0.02em]" style={{ color: "var(--theme-text)" }}>
                        {weekLabelRu(week.weekKey)}
                      </h3>
                      <div className="mt-2 text-sm" style={{ color: "rgba(246,241,233,.66)" }}>
                        {week.rangeLabel}
                      </div>
                      <div
                        className="mt-4 inline-flex rounded-full border px-3 py-2 text-xs font-semibold"
                        style={{ color: statusTone.color, background: statusTone.background, borderColor: statusTone.border }}
                      >
                        {formatWeekStatus(week)}
                      </div>
                      {week.score != null ? (
                        <div className="mt-4 flex items-end justify-between gap-3 text-sm" style={{ color: "rgba(246,241,233,.66)" }}>
                          <span>Баланс</span>
                          <strong className="text-[24px] font-semibold leading-none tracking-[-0.06em]" style={{ color: "var(--theme-text)" }}>
                            {week.score}%
                          </strong>
                        </div>
                      ) : null}
                    </button>
                  );
                })}
              </div>

              <section className="rounded-[28px] border" style={{ borderColor: "var(--theme-border)", background: "rgba(255,255,255,.038)" }}>
                <div className="grid gap-4 border-b p-4 lg:grid-cols-[170px_minmax(0,1fr)]" style={{ borderColor: "var(--theme-border)" }}>
                  <div
                    className="grid min-h-[160px] place-items-center rounded-[22px] border text-center"
                    style={{ borderColor: "var(--theme-border)", background: "rgba(0,0,0,.18)" }}
                  >
                    <div>
                      <div className="text-[56px] font-semibold leading-[0.95] tracking-[-0.08em]" style={{ color: "var(--theme-text)" }}>
                        {selectedWeekView.score == null ? "—" : `${selectedWeekView.score}%`}
                      </div>
                      <div className="mt-3 text-[13px] font-semibold" style={{ color: "rgba(246,241,233,.66)" }}>
                        {selectedWeekView.scoreLabel}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h2 className="text-[32px] font-semibold leading-none tracking-[-0.05em]" style={{ color: "var(--theme-text)" }}>
                        {weekLabelRu(selectedWeekView.weekKey)} · {selectedWeekView.rangeLabel}
                      </h2>
                      <div
                        className="mt-4 inline-flex rounded-full border px-3 py-2 text-xs font-semibold"
                        style={{ borderColor: "rgba(255,255,255,.12)", background: "rgba(255,255,255,.04)", color: "rgba(246,241,233,.74)" }}
                      >
                        Этот процент отражает разнообразие недели, а не качество роликов.
                      </div>
                    </div>

                    <p className="max-w-3xl text-[15px] leading-7" style={{ color: "rgba(246,241,233,.66)" }}>
                      {selectedWeekView.postsCount
                        ? `Сейчас в неделе собрано ${selectedWeekView.postsCount} из 4 слотов. Ниже видно, что именно тянет баланс вниз и какие материалы стоят в основном составе недели.`
                        : "Для этой недели еще нет собранного плана. Как только появятся публикации, здесь сразу сложится живая недельная сводка."}
                    </p>

                    {selectedWeekView.issues.length ? (
                      <div className="grid gap-2">
                        {selectedWeekView.issues.map((issue) => (
                          <div
                            key={issue}
                            className="rounded-[16px] border px-4 py-3 text-sm leading-6"
                            style={{ borderColor: "rgba(255,255,255,.12)", background: "rgba(255,255,255,.035)", color: "rgba(246,241,233,.82)" }}
                          >
                            {issue}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="p-4">
                  {selectedWeekView.postsCount ? (
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      {plannerDayOrder.map((day) => {
                        const card = getSlot(selectedWeekView.entries, day, "main", 0)?.card || null;

                        if (!card) return null;

                        const tone = typeTone(typeLabel(card));

                        return (
                          <button
                            key={`${selectedWeekView.id}-${day}`}
                            type="button"
                            onClick={() => openEntryDrawer(selectedWeekView, day)}
                            className="relative grid min-w-0 grid-cols-[62px_minmax(0,1fr)] gap-3 overflow-hidden rounded-[20px] border p-4 text-left"
                            style={{
                              borderColor: "var(--theme-border)",
                              background: "rgba(255,255,255,.04)"
                            }}
                          >
                            <span className="absolute inset-y-0 left-0 w-[3px]" style={{ background: tone.accent, boxShadow: `0 0 18px ${tone.glow}` }} />
                            <MiniCover card={card} className="rounded-[12px]" compact />
                            <div className="grid min-w-0 gap-2">
                              <RoleBadge card={card} compact />
                              <div className="text-[11px] uppercase tracking-[0.08em]" style={{ color: "rgba(246,241,233,.42)" }}>
                                {DAY_LABELS[day].short} · {dayLabelRu(activeMonth.label, selectedWeekView.weekKey, day).split("· ")[1]}
                              </div>
                              <div className="text-sm font-semibold leading-6" style={{ color: "var(--theme-text)" }}>
                                {normalizeValue(card.project_name) || card.title}
                              </div>
                              <div className="text-sm" style={{ color: "rgba(246,241,233,.66)" }}>
                                {normalizeValue(card.room_zone) || "Без комнаты"}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-[22px] border border-dashed px-6 py-12 text-center text-sm" style={{ borderColor: "var(--theme-border)", color: "var(--theme-text-muted)" }}>
                      У этой недели пока нет публикаций.
                    </div>
                  )}
                </div>
              </section>
            </div>
          ) : null}
        </div>
      </section>

      {drawer ? (
        <div className="fixed inset-0 z-[120]">
          <button
            aria-label="Закрыть публикацию"
            className="absolute inset-0"
            style={{ background: "rgba(0,0,0,.46)", backdropFilter: "blur(10px)" }}
            onClick={() => setDrawer(null)}
          />

          <div className="absolute inset-0 flex items-start justify-center px-4 pb-4 pt-24 sm:items-center sm:p-6">
            <aside
              className="max-h-[calc(100vh-7.5rem)] w-full max-w-[920px] overflow-y-auto rounded-[30px] border sm:max-h-[min(88vh,960px)]"
              style={{
                borderColor: "rgba(255,255,255,.16)",
                background: "radial-gradient(circle at 95% 0%, rgba(255,49,49,.16), transparent 34%), rgba(11,13,18,.97)",
                boxShadow: "0 32px 100px rgba(0,0,0,.68)"
              }}
            >
              <div
                className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b px-4 py-4 backdrop-blur-xl sm:px-5"
                style={{ borderColor: "var(--theme-border)", background: "rgba(11,13,18,.9)" }}
              >
                <div className="min-w-0">
                  <div className="text-[11px] uppercase tracking-[0.14em]" style={{ color: "rgba(246,241,233,.42)" }}>
                    День недели
                  </div>
                  <div className="mt-1 text-sm font-semibold" style={{ color: "var(--theme-text)" }}>
                    {drawer.weekLabel} · {drawer.dayLabel}
                  </div>
                </div>
                <Button variant="outline" onClick={() => setDrawer(null)}>
                  Закрыть
                </Button>
              </div>

              <div className="grid gap-5 p-4 sm:p-5 lg:grid-cols-[minmax(280px,360px)_minmax(0,1fr)] lg:gap-6">
                <div className="space-y-4">
                  <div
                    className="overflow-hidden rounded-[24px] border"
                    style={{ borderColor: "rgba(255,255,255,.12)", boxShadow: "0 20px 54px rgba(0,0,0,.32)" }}
                  >
                    {resolveCardPreviewUrl(drawer.card.thumbnail_url) ? (
                      <img
                        src={resolveCardPreviewUrl(drawer.card.thumbnail_url)!}
                        alt={drawer.card.title}
                        className={`${cardAspectClass(drawer.card)} h-full w-full object-cover`}
                        loading="eager"
                        decoding="async"
                      />
                    ) : (
                      <div
                        className={`${cardAspectClass(drawer.card)} flex items-center justify-center px-4 text-center text-sm`}
                        style={{ background: "var(--theme-image-bg)", color: "var(--theme-text-muted)" }}
                      >
                        Нет превью
                      </div>
                    )}
                  </div>

                  <div className="flex justify-start">
                    <RoleBadge card={drawer.card} />
                  </div>

                  {normalizeValue(drawer.card.link) ? (
                    <a
                      href={drawer.card.link}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-[52px] w-full items-center justify-center rounded-[16px] border px-4 text-[15px] font-semibold text-white transition hover:brightness-110"
                      style={{
                        borderColor: "rgba(255,255,255,.16)",
                        background: "linear-gradient(90deg,var(--theme-accent-strong),color-mix(in srgb, var(--theme-accent) 86%, #d946ef 14%),var(--theme-accent))",
                        boxShadow: "0 18px 50px var(--theme-accent-shadow)"
                      }}
                    >
                      Открыть Dropbox
                    </a>
                  ) : (
                    <div
                      className="inline-flex min-h-[52px] w-full items-center justify-center rounded-[16px] border px-4 text-sm font-medium"
                      style={{ borderColor: "var(--theme-border)", background: "rgba(255,255,255,.04)", color: "var(--theme-text-muted)" }}
                    >
                      Dropbox не указан
                    </div>
                  )}
                </div>

                <div className="space-y-5">
                  <div>
                    <h3 className="text-[30px] font-semibold leading-[1.04] tracking-[-0.05em]" style={{ color: "var(--theme-text)" }}>
                      {drawer.card.title}
                    </h3>
                    <p className="mt-3 max-w-2xl text-sm leading-6" style={{ color: "rgba(246,241,233,.66)" }}>
                      Основной материал этого дня. Ниже сразу видно проект, комнату, формат и запасные варианты на случай замены.
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {[
                      { label: "Дата", value: drawer.dayLabel },
                      { label: "Проект", value: normalizeValue(drawer.card.project_name) || "Не указан" },
                      { label: "Публикация", value: `${typeLabel(drawer.card)} · ${normalizeValue(drawer.card.title)}` },
                      { label: "Формат", value: normalizeValue(drawer.card.aspect_ratio) || "Не указан" },
                      { label: "Комната / зона", value: normalizeValue(drawer.card.room_zone) || "Не указана" }
                    ].map((field) => (
                      <div
                        key={field.label}
                        className="rounded-[16px] border px-4 py-3"
                        style={{ borderColor: "var(--theme-border)", background: "rgba(255,255,255,.035)" }}
                      >
                        <div className="mb-1 text-[10px] uppercase tracking-[0.1em]" style={{ color: "rgba(246,241,233,.42)" }}>
                          {field.label}
                        </div>
                        <div className="text-sm font-medium leading-6" style={{ color: "rgba(246,241,233,.92)" }}>
                          {field.value}
                        </div>
                      </div>
                    ))}
                  </div>

                  {drawer.alternatives.length ? (
                    <section className="overflow-hidden rounded-[22px] border" style={{ borderColor: "var(--theme-border)", background: "rgba(255,255,255,.035)" }}>
                      <div className="border-b px-4 py-4" style={{ borderColor: "var(--theme-border)" }}>
                        <h4 className="text-[11px] uppercase tracking-[0.12em]" style={{ color: "rgba(246,241,233,.66)" }}>
                          Если не подходит - альтернативы
                        </h4>
                        <p className="mt-2 text-sm leading-6" style={{ color: "rgba(246,241,233,.42)" }}>
                          Запасные варианты для этой публикации. Под каждым видно, как именно замена повлияет на состав недели.
                        </p>
                      </div>

                      <div className="grid gap-3 p-3">
                        {drawer.alternatives.map((alternative) => (
                          <div
                            key={alternative.id}
                            className="grid gap-3 rounded-[18px] border p-3 sm:grid-cols-[120px_minmax(0,1fr)]"
                            style={{ borderColor: "var(--theme-border)", background: "rgba(255,255,255,.04)" }}
                          >
                            <MiniCover card={alternative} className="w-[120px]" compact />

                            <div className="min-w-0 space-y-3">
                              <div>
                                <h5 className="text-base font-semibold leading-6 tracking-[-0.02em]" style={{ color: "var(--theme-text)" }}>
                                  {alternative.title}
                                </h5>
                              </div>

                              <div
                                className="rounded-[14px] border px-3 py-3 text-sm leading-6"
                                style={{ borderColor: "var(--theme-border)", background: "rgba(255,255,255,.035)", color: "rgba(246,241,233,.82)" }}
                              >
                                <span className="mb-1 block text-[10px] uppercase tracking-[0.1em]" style={{ color: "rgba(246,241,233,.42)" }}>
                                  Связка
                                </span>
                                {`${typeLabel(alternative)} · ${normalizeValue(alternative.project_name) || "Без проекта"} · ${normalizeValue(alternative.room_zone) || "Без комнаты"} · ${normalizeValue(alternative.aspect_ratio) || "custom"}`}
                              </div>

                              <div
                                className="rounded-[14px] border px-3 py-3 text-sm leading-6"
                                style={{ borderColor: "rgba(85,216,121,.22)", background: "rgba(85,216,121,.08)", color: "rgba(246,241,233,.84)" }}
                              >
                                {buildAlternativeEffect(drawer.card, alternative)}
                              </div>

                              {normalizeValue(alternative.link) ? (
                                <a
                                  href={alternative.link}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex min-h-[44px] w-full items-center justify-center rounded-[14px] border px-4 text-sm font-semibold text-white transition hover:brightness-110"
                                  style={{
                                    borderColor: "rgba(255,255,255,.16)",
                                    background: "rgba(255,255,255,.045)"
                                  }}
                                >
                                  Открыть Dropbox
                                </a>
                              ) : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  ) : null}
                </div>
              </div>
            </aside>
          </div>
        </div>
      ) : null}
    </div>
  );
}
