"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { MediaOutletCard } from "@/components/media-outlet-card";
import { SearchBar } from "@/components/search-bar";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { formatAudience, getOfferDeadline, isOfferActive } from "@/lib/media";
import { MediaOutletRow } from "@/lib/types";

export type MediaSort = "recent" | "audience" | "deadline";

function modeLinkClass(active: boolean) {
  return "rounded-full px-3 py-2 text-sm font-medium transition duration-200 sm:px-4";
}

export function useMediaFilters(outlets: MediaOutletRow[]) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sort, setSort] = useState<MediaSort>("recent");

  const statusOptions = useMemo(() => {
    return Array.from(new Set(outlets.map((item) => item.status?.trim()).filter((value): value is string => Boolean(value)))).sort((a, b) =>
      a.localeCompare(b, "ru")
    );
  }, [outlets]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    const result = outlets.filter((outlet) => {
      const matchesStatus = statusFilter ? (outlet.status || "") === statusFilter : true;
      if (!query) return matchesStatus;

      const haystack = [outlet.name, outlet.region, outlet.languages, outlet.instagram_url, outlet.website_url, outlet.formats]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return matchesStatus && haystack.includes(query);
    });

    if (sort === "audience") {
      return [...result].sort((a, b) => (b.audience || 0) - (a.audience || 0));
    }

    if (sort === "deadline") {
      const days = (outlet: MediaOutletRow) => {
        const deadline = getOfferDeadline(outlet.offer_until);
        if (!deadline) return Number.MAX_SAFE_INTEGER - 1;
        return deadline.daysLeft < 0 ? Number.MAX_SAFE_INTEGER : deadline.daysLeft;
      };
      return [...result].sort((a, b) => days(a) - days(b));
    }

    return [...result].sort((a, b) => {
      const timeA = a.updated_at || a.created_at || "";
      const timeB = b.updated_at || b.created_at || "";
      return timeA < timeB ? 1 : -1;
    });
  }, [outlets, search, statusFilter, sort]);

  const reset = () => {
    setSearch("");
    setStatusFilter("");
    setSort("recent");
  };

  return { search, setSearch, statusFilter, setStatusFilter, sort, setSort, statusOptions, filtered, reset };
}

export function MediaFilterControls({ filters }: { filters: ReturnType<typeof useMediaFilters> }) {
  return (
    <>
      <SearchBar value={filters.search} onChange={filters.setSearch} placeholder="Поиск по названию, региону, формату" />

      <Select value={filters.statusFilter} onChange={(event) => filters.setStatusFilter(event.target.value)}>
        <option value="">Все статусы</option>
        {filters.statusOptions.map((status) => (
          <option key={status} value={status}>
            {status}
          </option>
        ))}
      </Select>

      <Select value={filters.sort} onChange={(event) => filters.setSort(event.target.value as MediaSort)}>
        <option value="recent">Сначала новые</option>
        <option value="audience">По аудитории</option>
        <option value="deadline">По дедлайну</option>
      </Select>
    </>
  );
}

export function mediaSummary(outlets: MediaOutletRow[]) {
  const totalAudience = outlets.reduce((sum, item) => sum + (item.audience || 0), 0);
  return {
    total: outlets.length,
    audience: formatAudience(totalAudience) || "0",
    active: outlets.filter((item) => item.offer_until && isOfferActive(item)).length
  };
}

export function MediaDashboard({ outlets }: { outlets: MediaOutletRow[] }) {
  const filters = useMediaFilters(outlets);
  const summary = mediaSummary(outlets);

  return (
    <div className="space-y-8">
      <section
        className="overflow-hidden rounded-[32px] border p-5 backdrop-blur-2xl sm:p-6 lg:p-8"
        style={{
          borderColor: "var(--theme-border)",
          background: "var(--theme-hero-bg)",
          boxShadow: "var(--theme-shadow)"
        }}
      >
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="label">Media</div>

          <div className="grid w-full gap-3 sm:grid-cols-3">
            {[
              { label: "Изданий", value: summary.total, color: "#3b82f6" },
              { label: "Суммарная аудитория", value: summary.audience, color: "#d946ef" },
              { label: "Активных предложений", value: summary.active, color: "#22c55e" }
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-[26px] border px-4 py-4 text-left backdrop-blur-xl sm:px-5"
                style={{
                  borderColor: `${item.color}55`,
                  background: "var(--theme-surface-soft)",
                  boxShadow: `0 0 0 1px ${item.color}18 inset, 0 0 38px ${item.color}24`
                }}
              >
                <div className="text-[11px] uppercase tracking-[0.2em]" style={{ color: "var(--theme-text-muted)" }}>
                  {item.label}
                </div>
                <div className="mt-3 flex items-end justify-between gap-4">
                  <div className="text-3xl font-semibold sm:text-4xl" style={{ color: "var(--theme-text)" }}>
                    {item.value}
                  </div>
                  <span className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: item.color, boxShadow: `0 0 18px ${item.color}` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div
        className="rounded-[30px] border p-4 backdrop-blur-2xl"
        style={{
          borderColor: "var(--theme-border)",
          background: "var(--theme-surface)",
          boxShadow: "var(--theme-shadow)"
        }}
      >
        <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <div className="label">Навигация</div>
            <div
              className="inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-full border p-1 backdrop-blur-xl"
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
                Media
              </span>
              <Link href="/plan" className={modeLinkClass(false)} style={{ color: "var(--theme-text-muted)", background: "transparent" }}>
                Plan
              </Link>
            </div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-[1.2fr_0.8fr_0.8fr_auto]">
          <MediaFilterControls filters={filters} />
          <Button variant="outline" onClick={filters.reset}>
            Сбросить
          </Button>
        </div>
      </div>

      {filters.filtered.length ? (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filters.filtered.map((outlet) => (
            <MediaOutletCard key={outlet.id} outlet={outlet} />
          ))}
        </section>
      ) : (
        <EmptyState
          title={outlets.length ? "Издания не найдены" : "Пока нет изданий"}
          description={outlets.length ? "Попробуй другой статус или поисковый запрос." : "Добавь первое издание в админке — раздел Media."}
        />
      )}
    </div>
  );
}
