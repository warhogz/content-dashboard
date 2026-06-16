"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { ProjectSegmentedToggle } from "@/components/project-segmented-toggle";
import { ImagePreload } from "@/components/image-preload";
import { dayHeading, plannerDayOrder } from "@/lib/plan/dates";
import { type PlannerWeekSummary, type PlannerLibraryCard, type PlannerResolvedEntry } from "@/lib/supabase/planner-data";
import { PlannedDay, PlannedWeek, ProjectKey } from "@/lib/types";
import { resolveCardPreviewUrl } from "@/lib/dropbox-links";

type DisplayEntry = {
  day: PlannedDay;
  primary: PlannerLibraryCard | null;
  alternatives: PlannerLibraryCard[];
};

function modeLinkClass(active: boolean) {
  return "rounded-full px-4 py-2 text-sm font-medium transition duration-200";
}

function renderMetricList(cards: PlannerLibraryCard[], key: "project_name" | "room_zone") {
  const counts = new Map<string, number>();
  for (const card of cards) {
    const value = card[key]?.trim();
    if (!value) continue;
    counts.set(value, (counts.get(value) || 0) + 1);
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "en"))
    .map(([label, count]) => `${label} ${count}`)
    .join(" · ");
}

function renderTypeMetricList(cards: PlannerLibraryCard[]) {
  const counts = new Map<string, number>();
  for (const card of cards) {
    const value = card.type?.title?.trim();
    if (!value) continue;
    counts.set(value, (counts.get(value) || 0) + 1);
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "en"))
    .map(([label, count]) => `${label} ${count}`)
    .join(" · ");
}

function getSlot(entries: PlannerResolvedEntry[], day: PlannedDay, role: "main" | "alternative", position: number) {
  return entries.find((entry) => entry.day_key === day && entry.role === role && entry.position === position) || null;
}

function PublicPreview({ card }: { card: PlannerLibraryCard | null }) {
  const previewUrl = resolveCardPreviewUrl(card?.thumbnail_url || null);

  return (
    <div
      className="aspect-[4/5] w-full overflow-hidden rounded-[28px] border"
      style={{ borderColor: "var(--theme-border)", background: "var(--theme-image-bg)", boxShadow: "var(--theme-shadow-lift)" }}
    >
      {previewUrl ? (
        <img src={previewUrl} alt={card?.title || "Plan preview"} className="h-full w-full object-cover" loading="eager" decoding="async" />
      ) : (
        <div className="flex h-full items-center justify-center px-6 text-center text-sm" style={{ color: "var(--theme-text-muted)" }}>
          No preview available
        </div>
      )}
    </div>
  );
}

export function PublicPlanWorkspace({ weeks }: { weeks: PlannerWeekSummary[] }) {
  const [projectKey, setProjectKey] = useState<ProjectKey>("main");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedWeek, setSelectedWeek] = useState<PlannedWeek>("week_1");
  const [openAlternativesKey, setOpenAlternativesKey] = useState<string | null>(null);
  const [replacements, setReplacements] = useState<Record<string, string>>({});

  const groupedMonths = useMemo(() => {
    const monthMap = new Map<string, { label: string; projectKey: ProjectKey; weeks: PlannerWeekSummary[] }>();

    for (const week of weeks) {
      if (week.project_key !== projectKey) continue;
      const existing = monthMap.get(week.month_label);
      if (existing) {
        existing.weeks.push(week);
      } else {
        monthMap.set(week.month_label, { label: week.month_label, projectKey, weeks: [week] });
      }
    }

    return Array.from(monthMap.values()).sort((a, b) => new Date(a.label).getTime() - new Date(b.label).getTime());
  }, [projectKey, weeks]);

  useEffect(() => {
    if (!groupedMonths.length) return;
    setSelectedMonth((current) => (current && groupedMonths.some((month) => month.label === current) ? current : groupedMonths[0].label));
  }, [groupedMonths]);

  const activeMonth = useMemo(() => groupedMonths.find((month) => month.label === selectedMonth) || null, [groupedMonths, selectedMonth]);

  useEffect(() => {
    if (!activeMonth) return;
    setSelectedWeek((current) => (activeMonth.weeks.some((week) => week.week_key === current) ? current : activeMonth.weeks[0]?.week_key || "week_1"));
  }, [activeMonth]);

  const activeWeek = useMemo(() => activeMonth?.weeks.find((week) => week.week_key === selectedWeek) || null, [activeMonth, selectedWeek]);

  const displayEntries = useMemo<DisplayEntry[]>(() => {
    if (!activeWeek) return [];

    return plannerDayOrder.map((day) => {
      const visibleCards = [
        getSlot(activeWeek.entries, day, "main", 0)?.card || null,
        getSlot(activeWeek.entries, day, "alternative", 1)?.card || null,
        getSlot(activeWeek.entries, day, "alternative", 2)?.card || null
      ].filter((card): card is PlannerLibraryCard => Boolean(card));

      const replacementKey = `${activeWeek.id}:${day}`;
      const selectedId = replacements[replacementKey];
      const primary = visibleCards.find((card) => card.id === selectedId) || visibleCards[0] || null;
      const alternatives = visibleCards.filter((card) => card.id !== primary?.id);

      return {
        day,
        primary,
        alternatives
      };
    });
  }, [activeWeek, replacements]);

  const preloadUrls = useMemo(() => {
    return displayEntries
      .flatMap((entry) => [entry.primary, ...entry.alternatives])
      .filter((card): card is PlannerLibraryCard => Boolean(card))
      .map((card) => resolveCardPreviewUrl(card.thumbnail_url))
      .filter((url): url is string => Boolean(url));
  }, [displayEntries]);

  if (!weeks.length) return null;

  return (
    <div className="space-y-8">
      <ImagePreload urls={preloadUrls} concurrency={6} priorityCount={10} />

      <section
        className="overflow-hidden rounded-[32px] border p-5 backdrop-blur-2xl sm:p-6 lg:p-8"
        style={{
          borderColor: "var(--theme-border)",
          background: "var(--theme-hero-bg)",
          boxShadow: "var(--theme-shadow)"
        }}
      >
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="space-y-3">
              <div className="label">Publishing Plan</div>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl" style={{ color: "var(--theme-text)" }}>
                Plan
              </h1>
            </div>

            <div
              className="inline-flex items-center gap-1 self-start rounded-full border p-1 backdrop-blur-xl"
              style={{
                borderColor: "var(--theme-border)",
                background: "var(--theme-surface-soft)",
                boxShadow: "var(--theme-shadow-lift)"
              }}
            >
              <Link href="/" className={modeLinkClass(false)} style={{ color: "var(--theme-text-muted)", background: "transparent" }}>
                Grid
              </Link>
              <Link href="/bloggers" className={modeLinkClass(false)} style={{ color: "var(--theme-text-muted)", background: "transparent" }}>
                Bloggers
              </Link>
              <span
                className={modeLinkClass(true)}
                style={{
                  color: "var(--theme-text)",
                  background: "var(--theme-surface-strong)",
                  boxShadow: "0 0 0 1px var(--theme-border) inset, 0 10px 28px color-mix(in srgb, var(--theme-accent) 16%, transparent)"
                }}
              >
                Plan
              </span>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[auto_minmax(240px,320px)_minmax(0,1fr)] lg:items-start">
            <ProjectSegmentedToggle
              className="self-start justify-self-start"
              value={projectKey}
              onChange={(value) => {
                setProjectKey(value);
                setSelectedMonth("");
              }}
              options={[
                { value: "main", label: "LA" },
                { value: "mena", label: "Mena" }
              ]}
            />

            <Select className="self-start" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)}>
              {groupedMonths.map((month) => (
                <option key={month.label} value={month.label}>
                  {month.label}
                </option>
              ))}
            </Select>

            <div className="grid gap-3 self-start md:grid-cols-2 xl:grid-cols-5">
              {activeMonth?.weeks.map((week) => {
                const active = week.week_key === selectedWeek;
                return (
                  <button
                    key={week.id}
                    type="button"
                    onClick={() => setSelectedWeek(week.week_key)}
                    className="rounded-[24px] border p-4 text-left transition"
                    style={{
                      borderColor: active ? "color-mix(in srgb, var(--theme-accent) 56%, var(--theme-border))" : "var(--theme-border)",
                      background: active ? "color-mix(in srgb, var(--theme-surface-strong) 88%, transparent)" : "var(--theme-surface-soft)",
                      boxShadow: active ? "0 16px 34px var(--theme-accent-shadow)" : "var(--theme-shadow-lift)"
                    }}
                  >
                    <div className="text-sm font-semibold" style={{ color: "var(--theme-text)" }}>
                      {week.week_key.replace("week_", "Week ")}
                    </div>
                    <div className="mt-2 text-3xl font-semibold leading-none" style={{ color: "var(--theme-text)" }}>
                      {week.score.total}%
                    </div>
                    <div className="mt-2 text-sm" style={{ color: "var(--theme-text)" }}>
                      {week.score.label}
                    </div>
                    <div className="mt-2 text-xs" style={{ color: "var(--theme-text-muted)" }}>
                      {week.postsCount} of 4 planned
                    </div>
                    {week.categorySummary ? (
                      <div className="mt-2 text-xs" style={{ color: "var(--theme-text-muted)" }}>
                        {week.categorySummary}
                      </div>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {activeWeek ? (
        <>
          <Card>
            <CardContent className="space-y-4 p-5 sm:p-6">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div>
                  <CardTitle className="text-2xl sm:text-3xl">{activeWeek.week_key.replace("week_", "Week ")}</CardTitle>
                  <CardDescription className="mt-2">{activeWeek.rangeLabel}</CardDescription>
                </div>

                <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
                  <div
                    className="rounded-[24px] border px-4 py-4"
                    style={{
                      borderColor: "color-mix(in srgb, var(--theme-accent) 42%, var(--theme-border))",
                      background: "color-mix(in srgb, var(--theme-surface-strong) 90%, transparent)",
                      boxShadow: "0 18px 44px var(--theme-accent-shadow)"
                    }}
                  >
                    <div className="text-[11px] uppercase tracking-[0.18em]" style={{ color: "var(--theme-text-muted)" }}>
                      Week Score
                    </div>
                    <div className="mt-3 text-4xl font-semibold leading-none" style={{ color: "var(--theme-text)" }}>
                      {activeWeek.score.total}%
                    </div>
                    <div className="mt-2 text-sm font-medium" style={{ color: "var(--theme-text)" }}>
                      {activeWeek.score.label}
                    </div>
                  </div>

                  <div className="space-y-2 text-sm" style={{ color: "var(--theme-text-muted)" }}>
                    <div>Projects: {renderMetricList(activeWeek.mainCards, "project_name") || "Not enough data"}</div>
                    <div>Rooms: {renderMetricList(activeWeek.mainCards, "room_zone") || "Not enough data"}</div>
                    <div>Types: {renderTypeMetricList(activeWeek.mainCards) || "Not enough data"}</div>
                    <div className="pt-1">
                      {activeWeek.score.items.map((item) => (
                        <div key={item.label}>
                          <span style={{ color: item.points >= 0 ? "#55d879" : "#ff8e8e" }}>{item.points >= 0 ? `+${item.points}` : item.points}</span> {item.label}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            {displayEntries.map((entry) => {
              const rowKey = `${activeWeek.id}:${entry.day}`;
              const alternativesOpen = openAlternativesKey === rowKey;

              return (
                <Card key={entry.day}>
                  <CardContent className="space-y-5 p-5 sm:p-6">
                    <div className="grid gap-5 md:grid-cols-[240px_minmax(0,1fr)] md:items-start xl:grid-cols-[260px_minmax(0,1fr)]">
                      <PublicPreview card={entry.primary} />

                      <div className="space-y-4">
                        <div className="space-y-2">
                          <div className="label">{dayHeading(activeWeek.month_label, activeWeek.week_key, entry.day)}</div>
                          <h2 className="text-2xl font-semibold leading-tight" style={{ color: "var(--theme-text)" }}>
                            {entry.primary?.title || "No post selected"}
                          </h2>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {[entry.primary?.project_name, entry.primary?.room_zone, entry.primary?.type?.title]
                            .filter((value): value is string => Boolean(value))
                            .map((value) => (
                              <span
                                key={`${rowKey}-${value}`}
                                className="rounded-full border px-3 py-2 text-sm"
                                style={{ borderColor: "var(--theme-border)", background: "var(--theme-surface-soft)", color: "var(--theme-text)" }}
                              >
                                {value}
                              </span>
                            ))}
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                          {entry.primary?.link ? (
                            <a
                              href={entry.primary.link}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex h-11 items-center justify-center rounded-2xl px-4 text-sm font-medium transition hover:brightness-110"
                              style={{
                                background: "linear-gradient(90deg,var(--theme-accent-strong),color-mix(in srgb, var(--theme-accent) 86%, #d946ef 14%),var(--theme-accent))",
                                boxShadow: "0 18px 50px var(--theme-accent-shadow)",
                                color: "#fff"
                              }}
                            >
                              Open Dropbox
                            </a>
                          ) : (
                            <span
                              className="inline-flex h-11 items-center justify-center rounded-2xl border px-4 text-sm font-medium"
                              style={{ borderColor: "var(--theme-border)", background: "var(--theme-surface-soft)", color: "var(--theme-text-muted)" }}
                            >
                              Dropbox Missing
                            </span>
                          )}

                          {entry.alternatives.length ? (
                            <Button variant="outline" className="sm:min-w-[168px]" onClick={() => setOpenAlternativesKey((current) => (current === rowKey ? null : rowKey))}>
                              {alternativesOpen ? "Hide Alternatives" : `Alternatives (${entry.alternatives.length})`}
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    {alternativesOpen && entry.alternatives.length ? (
                      <div className="space-y-3 border-t pt-5" style={{ borderColor: "var(--theme-border-soft)" }}>
                        {entry.alternatives.map((alternative) => (
                          <div
                            key={alternative.id}
                            className="grid gap-4 rounded-[24px] border p-4 md:grid-cols-[150px_minmax(0,1fr)]"
                            style={{ borderColor: "var(--theme-border)", background: "var(--theme-surface-soft)" }}
                          >
                            <PublicPreview card={alternative} />

                            <div className="space-y-3">
                              <div className="text-lg font-semibold" style={{ color: "var(--theme-text)" }}>
                                {alternative.title}
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {[alternative.project_name, alternative.room_zone, alternative.type?.title]
                                  .filter((value): value is string => Boolean(value))
                                  .map((value) => (
                                    <span
                                      key={`${alternative.id}-${value}`}
                                      className="rounded-full border px-3 py-1.5 text-xs"
                                      style={{ borderColor: "var(--theme-border)", background: "var(--theme-surface-strong)", color: "var(--theme-text)" }}
                                    >
                                      {value}
                                    </span>
                                  ))}
                              </div>
                              <div className="flex flex-col gap-3 sm:flex-row">
                                {alternative.link ? (
                                  <a
                                    href={alternative.link}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex h-11 items-center justify-center rounded-2xl px-4 text-sm font-medium transition hover:brightness-110"
                                    style={{
                                      background: "linear-gradient(90deg,var(--theme-accent-strong),color-mix(in srgb, var(--theme-accent) 86%, #d946ef 14%),var(--theme-accent))",
                                      boxShadow: "0 18px 50px var(--theme-accent-shadow)",
                                      color: "#fff"
                                    }}
                                  >
                                    Open Dropbox
                                  </a>
                                ) : (
                                  <span
                                    className="inline-flex h-11 items-center justify-center rounded-2xl border px-4 text-sm font-medium"
                                    style={{ borderColor: "var(--theme-border)", background: "var(--theme-surface-soft)", color: "var(--theme-text-muted)" }}
                                  >
                                    Dropbox Missing
                                  </span>
                                )}

                                <Button
                                  variant="outline"
                                  onClick={() =>
                                    setReplacements((current) => ({
                                      ...current,
                                      [rowKey]: alternative.id
                                    }))
                                  }
                                >
                                  Use Instead
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      ) : null}
    </div>
  );
}
