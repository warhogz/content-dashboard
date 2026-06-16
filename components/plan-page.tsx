"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { ImagePreload } from "@/components/image-preload";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { resolveCardPreviewUrl } from "@/lib/dropbox-links";
import { buildPlanMonths, planDayOrder, planWeekOrder } from "@/lib/plan/model";
import { PlanCard } from "@/lib/supabase/plan-data";
import { PlannedDay, PlannedWeek } from "@/lib/types";

type DisplayEntry = {
  day: PlannedDay;
  primary: PlanCard | null;
  alternatives: PlanCard[];
};

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

function modeLinkClass(active: boolean) {
  return "rounded-full px-4 py-2 text-sm font-medium transition duration-200";
}

function parseMonthLabel(label: string) {
  const date = new Date(label);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function dayHeading(monthLabel: string, week: PlannedWeek, day: PlannedDay) {
  const date = parseMonthLabel(monthLabel);
  const month = date ? monthNames[date.getMonth()] : "Plan";
  const weekBase = {
    week_1: 1,
    week_2: 8,
    week_3: 15,
    week_4: 22,
    week_5: 29
  }[week];
  const dayOffset = planDayOrder.indexOf(day);
  const numericDay = weekBase + Math.max(dayOffset, 0);

  return `${day.toUpperCase()} · ${month} ${numericDay}`;
}

function countLabel(value: number) {
  return `${value} ${value === 1 ? "post" : "posts"} planned`;
}

function metadataValue(value: string | null | undefined, fallback: string) {
  return value?.trim() || fallback;
}

function renderActionLink(label: string, href: string | null | undefined, stretch = false) {
  if (!href) {
    return (
      <span
        className={`inline-flex h-11 items-center justify-center rounded-2xl border px-4 text-sm font-medium ${stretch ? "w-full" : ""}`}
        style={{ borderColor: "var(--theme-border)", background: "var(--theme-surface-soft)", color: "var(--theme-text-muted)" }}
      >
        Dropbox Missing
      </span>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={`inline-flex h-11 items-center justify-center rounded-2xl px-4 text-sm font-medium transition hover:brightness-110 ${stretch ? "w-full" : ""}`}
      style={{
        background: "linear-gradient(90deg,var(--theme-accent-strong),color-mix(in srgb, var(--theme-accent) 86%, #d946ef 14%),var(--theme-accent))",
        boxShadow: "0 18px 50px var(--theme-accent-shadow)",
        color: "#fff"
      }}
    >
      {label}
    </a>
  );
}

function PostPreview({ card }: { card: PlanCard | null }) {
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

export function PlanPage({ cards }: { cards: PlanCard[] }) {
  const months = useMemo(() => buildPlanMonths(cards), [cards]);
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [selectedWeek, setSelectedWeek] = useState<PlannedWeek>("week_1");
  const [openAlternativesKey, setOpenAlternativesKey] = useState<string | null>(null);
  const [replacements, setReplacements] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!months.length) return;

    setSelectedMonth((current) => {
      if (current && months.some((month) => month.label === current)) return current;
      return months[0].label;
    });
  }, [months]);

  useEffect(() => {
    const month = months.find((item) => item.label === selectedMonth);
    if (!month) return;

    setSelectedWeek((current) => {
      const hasCurrent = month.weeks.some((week) => week.week === current);
      if (hasCurrent && month.weeks.find((week) => week.week === current)?.selectedCount) return current;
      const firstWithPosts = month.weeks.find((week) => week.selectedCount > 0);
      return firstWithPosts?.week || "week_1";
    });
  }, [months, selectedMonth]);

  const activeMonth = useMemo(() => months.find((month) => month.label === selectedMonth) || null, [months, selectedMonth]);
  const activeWeek = useMemo(() => activeMonth?.weeks.find((week) => week.week === selectedWeek) || null, [activeMonth, selectedWeek]);

  const displayEntries = useMemo<DisplayEntry[]>(() => {
    if (!activeMonth || !activeWeek) return [];

    return activeWeek.entries.map((entry) => {
      const key = `${activeMonth.label}:${activeWeek.week}:${entry.day}`;
      const visibleCards = [entry.primary, ...entry.alternatives].filter((card): card is PlanCard => Boolean(card));
      const selectedId = replacements[key];
      const primary = visibleCards.find((card) => card.id === selectedId) || entry.primary || visibleCards[0] || null;
      const alternatives = visibleCards.filter((card) => card.id !== primary?.id);

      return {
        day: entry.day,
        primary,
        alternatives
      };
    });
  }, [activeMonth, activeWeek, replacements]);

  const preloadUrls = useMemo(() => {
    return displayEntries
      .flatMap((entry) => [entry.primary, ...entry.alternatives])
      .filter((card): card is PlanCard => Boolean(card))
      .map((card) => resolveCardPreviewUrl(card.thumbnail_url))
      .filter((url): url is string => Boolean(url));
  }, [displayEntries]);

  if (!months.length) {
    return <EmptyState title="Plan is empty" description="Add optional planning metadata to cards in the admin editor to build the founder view." />;
  }

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
              <div className="label">Founder view</div>
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

          <div className="grid gap-4 lg:grid-cols-[minmax(0,320px)_1fr]">
            <div className="space-y-2">
              <div className="label">Month</div>
              <Select value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)}>
                {months.map((month) => (
                  <option key={month.label} value={month.label}>
                    {month.label}
                  </option>
                ))}
              </Select>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              {activeMonth?.weeks.map((week) => {
                const active = selectedWeek === week.week;

                return (
                  <button
                    key={week.week}
                    type="button"
                    onClick={() => setSelectedWeek(week.week)}
                    className="rounded-[26px] border p-4 text-left transition"
                    style={{
                      borderColor: active ? "color-mix(in srgb, var(--theme-accent) 46%, var(--theme-border))" : "var(--theme-border)",
                      background: active ? "color-mix(in srgb, var(--theme-surface-strong) 90%, transparent)" : "var(--theme-surface-soft)",
                      boxShadow: active ? "0 0 0 1px var(--theme-border) inset, 0 18px 44px var(--theme-accent-shadow)" : "var(--theme-shadow-lift)"
                    }}
                  >
                    <div className="text-[11px] uppercase tracking-[0.18em]" style={{ color: "var(--theme-text-muted)" }}>
                      {week.label}
                    </div>
                    <div className="mt-2 text-sm font-medium" style={{ color: "var(--theme-text)" }}>
                      {week.rangeLabel}
                    </div>
                    <div className="mt-3 text-lg font-semibold" style={{ color: "var(--theme-text)" }}>
                      {week.selectedCount ? countLabel(week.selectedCount) : "No plan yet"}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {activeWeek ? (
        <section className="space-y-5">
          <Card>
            <CardContent className="space-y-3 p-5 sm:p-6">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div className="space-y-2">
                  <CardTitle className="text-2xl sm:text-3xl">{activeWeek.label}</CardTitle>
                  <CardDescription>{countLabel(activeWeek.selectedCount)}</CardDescription>
                </div>

                <div className="space-y-2 text-sm" style={{ color: "var(--theme-text-muted)" }}>
                  {activeWeek.projectSummary ? <div>Projects: {activeWeek.projectSummary}</div> : null}
                  {activeWeek.roomSummary ? <div>Rooms: {activeWeek.roomSummary}</div> : null}
                  {activeWeek.categorySummary ? <div>Categories: {activeWeek.categorySummary}</div> : null}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            {displayEntries.map((entry) => {
              const card = entry.primary;
              const rowKey = `${activeMonth?.label}:${activeWeek.week}:${entry.day}`;
              const alternativesOpen = openAlternativesKey === rowKey;

              return (
                <Card key={entry.day}>
                  <CardContent className="space-y-5 p-5 sm:p-6">
                    <div className="grid gap-5 md:grid-cols-[240px_minmax(0,1fr)] md:items-start xl:grid-cols-[260px_minmax(0,1fr)]">
                      <PostPreview card={card} />

                      <div className="space-y-4">
                        <div className="space-y-2">
                          <div className="label">{dayHeading(activeMonth?.label || selectedMonth, activeWeek.week, entry.day)}</div>
                          <h2 className="text-2xl font-semibold leading-tight" style={{ color: "var(--theme-text)" }}>
                            {card?.title || "No post selected yet"}
                          </h2>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {[
                            metadataValue(card?.project_name, "Project not set"),
                            metadataValue(card?.room_zone, "Room not set"),
                            metadataValue(card?.content_category, "Category not set")
                          ].map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full border px-3 py-2 text-sm"
                              style={{ borderColor: "var(--theme-border)", background: "var(--theme-surface-soft)", color: "var(--theme-text)" }}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                          {renderActionLink("Open Dropbox", card?.link, false)}

                          {entry.alternatives.length ? (
                            <Button
                              variant="outline"
                              className="sm:min-w-[168px]"
                              onClick={() => setOpenAlternativesKey((current) => (current === rowKey ? null : rowKey))}
                            >
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
                            <PostPreview card={alternative} />

                            <div className="space-y-3">
                              <div>
                                <div className="text-lg font-semibold" style={{ color: "var(--theme-text)" }}>
                                  {alternative.title}
                                </div>
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {[
                                    metadataValue(alternative.project_name, "Project not set"),
                                    metadataValue(alternative.room_zone, "Room not set"),
                                    metadataValue(alternative.content_category, "Category not set")
                                  ].map((tag) => (
                                    <span
                                      key={`${alternative.id}-${tag}`}
                                      className="rounded-full border px-3 py-2 text-xs"
                                      style={{ borderColor: "var(--theme-border)", background: "var(--theme-surface-strong)", color: "var(--theme-text)" }}
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              </div>

                              <div className="flex flex-col gap-3 sm:flex-row">
                                {renderActionLink("Open Dropbox", alternative.link, false)}
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
        </section>
      ) : (
        <EmptyState title="Week is empty" description="Choose another week or add planning metadata to a few cards first." />
      )}
    </div>
  );
}
