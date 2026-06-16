"use client";

import Link from "next/link";
import { useMemo, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SearchBar } from "@/components/search-bar";
import { ProjectSegmentedToggle } from "@/components/project-segmented-toggle";
import { useToast } from "@/components/ui/toast";
import { mergeCatalogValues } from "@/lib/plan/catalogs";
import { getPlannedMonthOptions, PLAN_WEEK_OPTIONS } from "@/lib/plan/config";
import { dayHeading, plannerDayOrder } from "@/lib/plan/dates";
import { type AdminPlannerData, type PlannerLibraryCard, type PlannerResolvedEntry } from "@/lib/supabase/planner-data";
import { clearPlanWeekAction, setPlanEntryAction, updatePlannerCardMetadataAction } from "@/lib/supabase/planner-actions";
import { CardTypeRow, PlannedDay, PlannedWeek, ProjectKey, StatusRow } from "@/lib/types";
import { resolveCardPreviewUrl } from "@/lib/dropbox-links";

type SlotTarget = {
  day: PlannedDay;
  role: "main" | "alternative";
  position: number;
};

type MetadataFieldState = {
  preset: string;
  custom: string;
};

const metadataOtherValue = "__other";

function navPill(active: boolean) {
  return active
    ? {
        color: "var(--theme-text)",
        background: "var(--theme-surface-strong)",
        boxShadow: "0 0 0 1px var(--theme-border) inset, 0 10px 28px color-mix(in srgb, var(--theme-accent) 16%, transparent)"
      }
    : {
        color: "var(--theme-text-muted)",
        background: "transparent"
      };
}

function compactLabel(label: string, value: string | null | undefined) {
  return value?.trim() ? `${label}: ${value.trim()}` : null;
}

function createMetadataFieldState(value: string | null | undefined, presets: readonly string[]): MetadataFieldState {
  if (!value) return { preset: "", custom: "" };
  if (presets.includes(value)) return { preset: value, custom: "" };
  return { preset: metadataOtherValue, custom: value };
}

function resolveMetadataFieldValue(field: MetadataFieldState) {
  if (!field.preset) return "";
  return field.preset === metadataOtherValue ? field.custom.trim() : field.preset;
}

function MetadataField({
  label,
  value,
  options,
  otherPlaceholder,
  onChange
}: {
  label: string;
  value: MetadataFieldState;
  options: readonly string[];
  otherPlaceholder: string;
  onChange: (value: MetadataFieldState) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="label">{label}</div>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)]">
        <Select value={value.preset} onChange={(event) => onChange({ preset: event.target.value, custom: value.custom })}>
          <option value="">Not set</option>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
          <option value={metadataOtherValue}>Other</option>
        </Select>
        {value.preset === metadataOtherValue ? (
          <Input value={value.custom} onChange={(event) => onChange({ preset: value.preset, custom: event.target.value })} placeholder={otherPlaceholder} />
        ) : (
          <div
            className="hidden rounded-2xl border px-4 py-3 text-sm sm:flex sm:items-center"
            style={{ borderColor: "var(--theme-border-soft)", background: "var(--theme-surface-soft)", color: "var(--theme-text-muted)" }}
          >
            Select Other to enter a custom value
          </div>
        )}
      </div>
    </div>
  );
}

function LibraryPreview({ card }: { card: PlannerLibraryCard }) {
  const previewUrl = resolveCardPreviewUrl(card.thumbnail_url);

  return (
    <div className="aspect-[4/5] overflow-hidden rounded-[22px] border" style={{ borderColor: "var(--theme-border)", background: "var(--theme-image-bg)" }}>
      {previewUrl ? (
        <img src={previewUrl} alt={card.title} className="h-full w-full object-cover" loading="lazy" decoding="async" />
      ) : (
        <div className="flex h-full items-center justify-center px-4 text-center text-sm" style={{ color: "var(--theme-text-muted)" }}>
          No preview
        </div>
      )}
    </div>
  );
}

function ScoreChip({ value, label }: { value: number; label: string }) {
  return (
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
        {value}%
      </div>
      <div className="mt-2 text-sm font-medium" style={{ color: "var(--theme-text)" }}>
        {label}
      </div>
    </div>
  );
}

function SlotCard({
  title,
  active,
  onSelect,
  onClear,
  card,
  pending
}: {
  title: string;
  active: boolean;
  onSelect: () => void;
  onClear: () => void;
  card: PlannerLibraryCard | null;
  pending: boolean;
}) {
  return (
    <div
      className="rounded-[24px] border p-4 transition"
      style={{
        borderColor: active ? "color-mix(in srgb, var(--theme-accent) 56%, var(--theme-border))" : "var(--theme-border)",
        background: active ? "color-mix(in srgb, var(--theme-surface-strong) 88%, transparent)" : "var(--theme-surface-soft)",
        boxShadow: active ? "0 18px 40px var(--theme-accent-shadow)" : "var(--theme-shadow-lift)"
      }}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="label">{title}</div>
          <div className="mt-1 text-sm" style={{ color: "var(--theme-text-muted)" }}>
            {card ? "Assigned" : "Tap to choose from the library"}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onSelect}>
            {active ? "Picking..." : "Select"}
          </Button>
          {card ? (
            <Button variant="ghost" size="sm" disabled={pending} onClick={onClear}>
              Clear
            </Button>
          ) : null}
        </div>
      </div>

      {card ? (
        <div className="space-y-3">
          <LibraryPreview card={card} />
          <div className="space-y-2">
            <div className="text-base font-semibold leading-tight" style={{ color: "var(--theme-text)" }}>
              {card.title}
            </div>
            <div className="flex flex-wrap gap-2">
              {[compactLabel("Project", card.project_name), compactLabel("Room", card.room_zone), compactLabel("Type", card.type?.title)]
                .filter((value): value is string => Boolean(value))
                .map((item) => (
                  <span
                    key={item}
                    className="rounded-full border px-3 py-1.5 text-xs"
                    style={{ borderColor: "var(--theme-border)", background: "var(--theme-surface-strong)", color: "var(--theme-text)" }}
                  >
                    {item}
                  </span>
                ))}
            </div>
          </div>
        </div>
      ) : (
        <div
          className="flex min-h-[160px] items-center justify-center rounded-[22px] border border-dashed px-5 text-center text-sm"
          style={{ borderColor: "var(--theme-border-soft)", color: "var(--theme-text-muted)" }}
        >
          Choose a content card from the library.
        </div>
      )}
    </div>
  );
}

function getSlotEntry(entries: PlannerResolvedEntry[], day: PlannedDay, role: "main" | "alternative", position: number) {
  return entries.find((entry) => entry.day_key === day && entry.role === role && entry.position === position) || null;
}

export function AdminPlanWorkspace({
  initialData
}: {
  initialData: AdminPlannerData;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [projectKey, setProjectKey] = useState<ProjectKey>("main");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedWeek, setSelectedWeek] = useState<PlannedWeek>("week_1");
  const [search, setSearch] = useState("");
  const [readyOnly, setReadyOnly] = useState(false);
  const [projectFilter, setProjectFilter] = useState("");
  const [roomFilter, setRoomFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [activeTarget, setActiveTarget] = useState<SlotTarget>({ day: "monday", role: "main", position: 0 });
  const [editingCard, setEditingCard] = useState<PlannerLibraryCard | null>(null);
  const [projectField, setProjectField] = useState<MetadataFieldState>({ preset: "", custom: "" });
  const [roomField, setRoomField] = useState<MetadataFieldState>({ preset: "", custom: "" });
  const [readyForPlanValue, setReadyForPlanValue] = useState(false);

  const monthOptions = useMemo(() => {
    const set = new Set(getPlannedMonthOptions());
    for (const week of initialData.weeks) {
      if (week.project_key === projectKey) {
        set.add(week.month_label);
      }
    }
    return Array.from(set).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  }, [initialData.weeks, projectKey]);

  const effectiveMonth = selectedMonth || monthOptions[0] || "";

  const projectOptions = useMemo(() => {
    return mergeCatalogValues(initialData.catalogs.projects, initialData.cards.map((card) => card.project_name || "").filter(Boolean) as string[]);
  }, [initialData.cards, initialData.catalogs.projects]);

  const roomOptions = useMemo(() => {
    return mergeCatalogValues(initialData.catalogs.rooms, initialData.cards.map((card) => card.room_zone || "").filter(Boolean) as string[]);
  }, [initialData.cards, initialData.catalogs.rooms]);

  const weekCards = useMemo(() => {
    return initialData.weeks.filter((week) => week.project_key === projectKey && week.month_label === effectiveMonth);
  }, [effectiveMonth, initialData.weeks, projectKey]);

  const activeWeek = useMemo(() => {
    return weekCards.find((week) => week.week_key === selectedWeek) || null;
  }, [selectedWeek, weekCards]);

  const activeEntries = activeWeek?.entries || [];
  const usedCardIds = new Set(activeEntries.map((entry) => entry.card_id));
  const mainCards = plannerDayOrder
    .map((day) => getSlotEntry(activeEntries, day, "main", 0)?.card || null)
    .filter((card): card is PlannerLibraryCard => Boolean(card));
  const score = activeWeek?.score || { total: 0, label: "Repetitive Structure", items: [{ label: "Week is not fully planned", points: -25 }] };

  const filteredCards = useMemo(() => {
    const query = search.trim().toLowerCase();

    return initialData.cards
      .filter((card) => card.project_key === projectKey)
      .filter((card) => {
        const haystack = `${card.title} ${card.subtitle || ""}`.toLowerCase();
        const matchesSearch = query ? haystack.includes(query) : true;
        const matchesReady = readyOnly ? Boolean(card.ready_for_plan) : true;
        const matchesProject = projectFilter ? (card.project_name || "") === projectFilter : true;
        const matchesRoom = roomFilter ? (card.room_zone || "") === roomFilter : true;
        const matchesType = typeFilter ? card.type_id === typeFilter : true;
        const matchesStatus = statusFilter ? card.status_id === statusFilter : true;
        return matchesSearch && matchesReady && matchesProject && matchesRoom && matchesType && matchesStatus;
      })
      .sort((a, b) => {
        const aUsed = usedCardIds.has(a.id);
        const bUsed = usedCardIds.has(b.id);
        if (aUsed !== bUsed) return Number(aUsed) - Number(bUsed);
        return (a.created_at || "") < (b.created_at || "") ? 1 : -1;
      });
  }, [initialData.cards, projectFilter, projectKey, readyOnly, roomFilter, search, statusFilter, typeFilter, usedCardIds]);

  const openMetadataEditor = (card: PlannerLibraryCard) => {
    setEditingCard(card);
    setProjectField(createMetadataFieldState(card.project_name, projectOptions));
    setRoomField(createMetadataFieldState(card.room_zone, roomOptions));
    setReadyForPlanValue(Boolean(card.ready_for_plan));
  };

  const assignCard = (cardId: string) => {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("project_key", projectKey);
      formData.set("month_label", effectiveMonth);
      formData.set("week_key", selectedWeek);
      formData.set("day_key", activeTarget.day);
      formData.set("role", activeTarget.role);
      formData.set("position", String(activeTarget.position));
      formData.set("card_id", cardId);

      const result = await setPlanEntryAction(formData);
      toast.push({ title: result.ok ? "Planner updated" : "Planner error", description: result.message });
      if (result.ok) router.refresh();
    });
  };

  const clearSlot = (target: SlotTarget) => {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("project_key", projectKey);
      formData.set("month_label", effectiveMonth);
      formData.set("week_key", selectedWeek);
      formData.set("day_key", target.day);
      formData.set("role", target.role);
      formData.set("position", String(target.position));
      formData.set("card_id", "");

      const result = await setPlanEntryAction(formData);
      toast.push({ title: result.ok ? "Slot updated" : "Planner error", description: result.message });
      if (result.ok) router.refresh();
    });
  };

  const clearWeek = () => {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("project_key", projectKey);
      formData.set("month_label", effectiveMonth);
      formData.set("week_key", selectedWeek);
      const result = await clearPlanWeekAction(formData);
      toast.push({ title: result.ok ? "Week reset" : "Planner error", description: result.message });
      if (result.ok) router.refresh();
    });
  };

  const saveMetadata = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingCard) return;

    startTransition(async () => {
      const formData = new FormData();
      formData.set("id", editingCard.id);
      formData.set("project_name", resolveMetadataFieldValue(projectField));
      formData.set("room_zone", resolveMetadataFieldValue(roomField));
      if (readyForPlanValue) {
        formData.set("ready_for_plan", "on");
      }

      const result = await updatePlannerCardMetadataAction(formData);
      toast.push({ title: result.ok ? "Metadata saved" : "Planner error", description: result.message });
      if (result.ok) {
        setEditingCard(null);
        router.refresh();
      }
    });
  };

  return (
    <main className="page-shell py-6 sm:py-8">
      <div
        className="mb-6 rounded-[32px] border p-5 backdrop-blur-2xl sm:p-6"
        style={{
          borderColor: "var(--theme-border)",
          background: "var(--theme-panel-bg)",
          boxShadow: "var(--theme-shadow)"
        }}
      >
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0">
            <div className="label">Workspace</div>
            <CardTitle className="mt-2 text-2xl sm:text-3xl">Publishing Planner</CardTitle>
            <CardDescription className="mt-2 max-w-2xl">
              Build each week visually: choose main posts and up to two alternatives per day without digging through the card editor.
            </CardDescription>
            <div
              className="mt-4 inline-flex items-center gap-1 rounded-full border p-1 backdrop-blur-xl"
              style={{ borderColor: "var(--theme-border)", background: "var(--theme-surface-soft)", boxShadow: "var(--theme-shadow-lift)" }}
            >
              <Link href="/admin" className="rounded-full px-4 py-2 text-sm font-medium transition" style={navPill(false)}>
                Content
              </Link>
              <Link href="/admin/bloggers" className="rounded-full px-4 py-2 text-sm font-medium transition" style={navPill(false)}>
                Bloggers
              </Link>
              <span className="rounded-full px-4 py-2 text-sm font-medium" style={navPill(true)}>
                Plan
              </span>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[520px]">
            <ScoreChip value={score.total} label={score.label} />
            <div className="rounded-[24px] border p-4" style={{ borderColor: "var(--theme-border)", background: "var(--theme-surface-strong)" }}>
              <div className="text-[11px] uppercase tracking-[0.18em]" style={{ color: "var(--theme-text-muted)" }}>
                Posts Planned
              </div>
              <div className="mt-3 text-3xl font-semibold" style={{ color: "var(--theme-text)" }}>
                {mainCards.length} / 4
              </div>
              <div className="mt-2 text-sm" style={{ color: "var(--theme-text-muted)" }}>
                Monday to Thursday only
              </div>
            </div>
            <div className="rounded-[24px] border p-4" style={{ borderColor: "var(--theme-border)", background: "var(--theme-surface-strong)" }}>
              <div className="text-[11px] uppercase tracking-[0.18em]" style={{ color: "var(--theme-text-muted)" }}>
                Type Mix
              </div>
              <div className="mt-3 text-sm font-medium leading-6" style={{ color: "var(--theme-text)" }}>
                {activeWeek?.categorySummary || "Not enough data yet"}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        className="mb-6 rounded-[28px] border p-4 backdrop-blur-2xl"
        style={{ borderColor: "var(--theme-border)", background: "var(--theme-surface)", boxShadow: "var(--theme-shadow-lift)" }}
      >
        <div className="grid gap-3 xl:grid-cols-[auto_280px_1fr_auto] xl:items-center">
          <ProjectSegmentedToggle
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

          <Select value={effectiveMonth} onChange={(event) => setSelectedMonth(event.target.value)}>
            {monthOptions.map((month) => (
              <option key={month} value={month}>
                {month}
              </option>
            ))}
          </Select>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {PLAN_WEEK_OPTIONS.map((option) => {
              const summary = weekCards.find((week) => week.week_key === option.value);
              const active = selectedWeek === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSelectedWeek(option.value)}
                  className="rounded-[22px] border px-4 py-3 text-left transition"
                  style={{
                    borderColor: active ? "color-mix(in srgb, var(--theme-accent) 56%, var(--theme-border))" : "var(--theme-border)",
                    background: active ? "color-mix(in srgb, var(--theme-surface-strong) 88%, transparent)" : "var(--theme-surface-soft)",
                    boxShadow: active ? "0 16px 34px var(--theme-accent-shadow)" : "none"
                  }}
                >
                  <div className="text-sm font-semibold" style={{ color: "var(--theme-text)" }}>
                    {option.label}
                  </div>
                  <div className="mt-1 text-xs" style={{ color: "var(--theme-text-muted)" }}>
                    {summary ? `${summary.score.total}% · ${summary.postsCount}/4 planned` : "No plan yet"}
                  </div>
                </button>
              );
            })}
          </div>

          <Button variant="outline" disabled={pending} onClick={clearWeek}>
            Clear Week
          </Button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.15fr)]">
        <section
          className="rounded-[30px] border p-4 backdrop-blur-2xl"
          style={{ borderColor: "var(--theme-border)", background: "var(--theme-surface)", boxShadow: "var(--theme-shadow)" }}
        >
          <div className="mb-4 flex flex-col gap-4">
            <div>
              <CardTitle>Content Library</CardTitle>
              <CardDescription className="mt-1">
                Search and filter the full non-archived content library, then tap a card to place it into the active slot.
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <label
                className="flex items-center gap-2 rounded-full border px-4 py-2 text-sm"
                style={{ borderColor: "var(--theme-border)", background: "var(--theme-surface-soft)", color: "var(--theme-text)" }}
              >
                <Checkbox checked={readyOnly} onChange={(event) => setReadyOnly(event.target.checked)} /> Ready for plan only
              </label>
              <div className="text-sm" style={{ color: "var(--theme-text-muted)" }}>
                {filteredCards.length} cards
              </div>
            </div>

            <SearchBar value={search} onChange={setSearch} placeholder="Search by title or subtitle" />

            <div className="grid gap-3 md:grid-cols-2">
              <Select value={projectFilter} onChange={(event) => setProjectFilter(event.target.value)}>
                <option value="">All projects</option>
                {projectOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>

              <Select value={roomFilter} onChange={(event) => setRoomFilter(event.target.value)}>
                <option value="">All rooms</option>
                {roomOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>

              <Select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
                <option value="">All types</option>
                {initialData.types.map((type: CardTypeRow) => (
                  <option key={type.id} value={type.id}>
                    {type.title}
                  </option>
                ))}
              </Select>

              <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="">All statuses</option>
                {initialData.statuses.map((status: StatusRow) => (
                  <option key={status.id} value={status.id}>
                    {status.title}
                  </option>
                ))}
              </Select>

              <Button
                variant="outline"
                onClick={() => {
                  setSearch("");
                  setReadyOnly(false);
                  setProjectFilter("");
                  setRoomFilter("");
                  setTypeFilter("");
                  setStatusFilter("");
                }}
              >
                Reset Filters
              </Button>
            </div>
          </div>

          <div
            className="mb-4 rounded-[24px] border px-4 py-3 text-sm"
            style={{ borderColor: "var(--theme-border)", background: "var(--theme-surface-soft)", color: "var(--theme-text-muted)" }}
          >
            Active target: <span style={{ color: "var(--theme-text)" }}>{activeTarget.day}</span> /{" "}
            <span style={{ color: "var(--theme-text)" }}>
              {activeTarget.role === "main" ? "Main Post" : `Alternative ${activeTarget.position}`}
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {filteredCards.map((card) => {
              const inWeek = usedCardIds.has(card.id);

              return (
                <div
                  key={card.id}
                  className="rounded-[24px] border p-3 text-left"
                  style={{
                    borderColor: inWeek ? "color-mix(in srgb, var(--theme-accent) 48%, var(--theme-border))" : "var(--theme-border)",
                    background: inWeek ? "color-mix(in srgb, var(--theme-surface-strong) 90%, transparent)" : "var(--theme-surface-soft)",
                    boxShadow: "var(--theme-shadow-lift)"
                  }}
                >
                  <LibraryPreview card={card} />
                  <div className="mt-3 space-y-3">
                    <div className="space-y-2">
                      <div className="text-base font-semibold leading-tight" style={{ color: "var(--theme-text)" }}>
                        {card.title}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {[card.project_name, card.room_zone, card.type?.title, card.status?.title]
                          .filter((value): value is string => Boolean(value))
                          .map((value) => (
                            <span
                              key={`${card.id}-${value}`}
                              className="rounded-full border px-3 py-1.5 text-xs"
                              style={{ borderColor: "var(--theme-border)", background: "var(--theme-surface-strong)", color: "var(--theme-text)" }}
                            >
                              {value}
                            </span>
                          ))}
                        {card.ready_for_plan ? (
                          <span
                            className="rounded-full border px-3 py-1.5 text-xs"
                            style={{
                              borderColor: "color-mix(in srgb, #55d879 42%, var(--theme-border))",
                              background: "color-mix(in srgb, #55d879 12%, var(--theme-surface-strong))",
                              color: "#aef3c1"
                            }}
                          >
                            Ready for plan
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="text-xs" style={{ color: inWeek ? "var(--theme-text)" : "var(--theme-text-muted)" }}>
                      {inWeek ? "Already used in this week" : "Use this card for the active slot or fill metadata here."}
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2">
                      <Button variant="default" disabled={pending} onClick={() => assignCard(card.id)}>
                        Use For Slot
                      </Button>
                      <Button variant="outline" disabled={pending} onClick={() => openMetadataEditor(card)}>
                        Edit Metadata
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {!filteredCards.length ? (
            <div
              className="mt-4 rounded-[24px] border border-dashed px-5 py-10 text-center"
              style={{ borderColor: "var(--theme-border-soft)", background: "var(--theme-surface-soft)", color: "var(--theme-text-muted)" }}
            >
              No cards match the current filters. Try resetting filters or switch off <span style={{ color: "var(--theme-text)" }}>Ready for plan only</span>.
            </div>
          ) : null}
        </section>

        <section className="space-y-6">
          <div
            className="rounded-[30px] border p-5 backdrop-blur-2xl"
            style={{ borderColor: "var(--theme-border)", background: "var(--theme-surface)", boxShadow: "var(--theme-shadow)" }}
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <CardTitle>Week Builder</CardTitle>
                <CardDescription className="mt-1">Build Monday through Thursday with one main post and up to two alternatives per day.</CardDescription>
              </div>
              <div className="space-y-2 text-sm" style={{ color: "var(--theme-text-muted)" }}>
                {score.items.map((item) => (
                  <div key={item.label}>
                    <span style={{ color: item.points >= 0 ? "#55d879" : "#ff8e8e" }}>{item.points >= 0 ? `+${item.points}` : item.points}</span> {item.label}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {plannerDayOrder.map((day) => {
            const mainEntry = getSlotEntry(activeEntries, day, "main", 0);
            const altOne = getSlotEntry(activeEntries, day, "alternative", 1);
            const altTwo = getSlotEntry(activeEntries, day, "alternative", 2);

            return (
              <div
                key={day}
                className="rounded-[30px] border p-5 backdrop-blur-2xl"
                style={{ borderColor: "var(--theme-border)", background: "var(--theme-surface)", boxShadow: "var(--theme-shadow)" }}
              >
                <div className="mb-5">
                  <div className="label">{dayHeading(effectiveMonth, selectedWeek, day)}</div>
                </div>

                <div className="space-y-4">
                  <SlotCard
                    title="Main Post"
                    active={activeTarget.day === day && activeTarget.role === "main" && activeTarget.position === 0}
                    onSelect={() => setActiveTarget({ day, role: "main", position: 0 })}
                    onClear={() => clearSlot({ day, role: "main", position: 0 })}
                    card={mainEntry?.card || null}
                    pending={pending}
                  />

                  <div className="grid gap-4 lg:grid-cols-2">
                    <SlotCard
                      title="Alternative 1"
                      active={activeTarget.day === day && activeTarget.role === "alternative" && activeTarget.position === 1}
                      onSelect={() => setActiveTarget({ day, role: "alternative", position: 1 })}
                      onClear={() => clearSlot({ day, role: "alternative", position: 1 })}
                      card={altOne?.card || null}
                      pending={pending}
                    />

                    <SlotCard
                      title="Alternative 2"
                      active={activeTarget.day === day && activeTarget.role === "alternative" && activeTarget.position === 2}
                      onSelect={() => setActiveTarget({ day, role: "alternative", position: 2 })}
                      onClear={() => clearSlot({ day, role: "alternative", position: 2 })}
                      card={altTwo?.card || null}
                      pending={pending}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </section>
      </div>

      <Dialog
        open={Boolean(editingCard)}
        onOpenChange={(open) => {
          if (!open) setEditingCard(null);
        }}
        title={editingCard ? `Metadata · ${editingCard.title}` : "Edit metadata"}
        description="Set reusable planning metadata directly in the library. Weekly placement stays inside the planner."
        className="sm:max-w-3xl"
      >
        <form className="space-y-5" onSubmit={saveMetadata}>
          <MetadataField
            label="Project Name"
            value={projectField}
            options={projectOptions}
            otherPlaceholder="Custom project name"
            onChange={setProjectField}
          />

          <MetadataField
            label="Room / Zone"
            value={roomField}
            options={roomOptions}
            otherPlaceholder="Custom room or zone"
            onChange={setRoomField}
          />
          <label
            className="flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm"
            style={{ borderColor: "var(--theme-border)", background: "var(--theme-surface-soft)", color: "var(--theme-text)" }}
          >
            <Checkbox checked={readyForPlanValue} onChange={(event) => setReadyForPlanValue(event.target.checked)} /> Ready for plan
          </label>

          <div className="flex items-center justify-end gap-3">
            <Button variant="outline" type="button" onClick={() => setEditingCard(null)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : "Save Metadata"}
            </Button>
          </div>
        </form>
      </Dialog>
    </main>
  );
}
