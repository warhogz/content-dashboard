"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BloggerCard } from "@/components/blogger-card";
import { EmptyState } from "@/components/empty-state";
import { SearchBar } from "@/components/search-bar";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { BloggerRow } from "@/lib/types";

function modeLinkClass(active: boolean) {
  return "rounded-full px-4 py-2 text-sm font-medium transition duration-200";
}

export function BloggersDashboard({ bloggers }: { bloggers: BloggerRow[] }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const statusOptions = useMemo(() => {
    return Array.from(new Set(bloggers.map((item) => item.status?.trim()).filter((value): value is string => Boolean(value)))).sort((a, b) =>
      a.localeCompare(b, "ru")
    );
  }, [bloggers]);

  const filteredBloggers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return bloggers.filter((blogger) => {
      const matchesStatus = statusFilter ? (blogger.status || "") === statusFilter : true;
      if (!query) return matchesStatus;

      const haystack = `${blogger.display_name} ${blogger.username || ""}`.toLowerCase();
      return matchesStatus && haystack.includes(query);
    });
  }, [bloggers, search, statusFilter]);

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
          <div className="label">Bloggers</div>

          <div className="grid w-full gap-3 sm:grid-cols-3">
            {[
              { label: "Всего блогеров", value: bloggers.length, color: "#d946ef" },
              { label: "Со статусом", value: bloggers.filter((item) => item.status).length, color: "#f59e0b" },
              { label: "С материалом", value: bloggers.filter((item) => item.material_type !== "none" && item.material_url).length, color: "#22c55e" }
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
              className="inline-flex items-center gap-1 rounded-full border p-1 backdrop-blur-xl"
              style={{
                borderColor: "var(--theme-border)",
                background: "var(--theme-surface-soft)",
                boxShadow: "var(--theme-shadow-lift)"
              }}
            >
              <Link href="/" className={modeLinkClass(false)} style={{ color: "var(--theme-text-muted)", background: "transparent" }}>
                Grid
              </Link>
              <span
                className={modeLinkClass(true)}
                style={{
                  color: "var(--theme-text)",
                  background: "var(--theme-surface-strong)",
                  boxShadow: "0 0 0 1px var(--theme-border) inset, 0 10px 28px color-mix(in srgb, var(--theme-accent) 16%, transparent)"
                }}
              >
                Bloggers
              </span>
            </div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-[1.2fr_0.9fr_auto]">
          <SearchBar value={search} onChange={setSearch} placeholder="Поиск по имени или username" />

          <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="">Все статусы</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </Select>

          <Button
            variant="outline"
            onClick={() => {
              setSearch("");
              setStatusFilter("");
            }}
          >
            Сбросить
          </Button>
        </div>
      </div>

      {filteredBloggers.length ? (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {filteredBloggers.map((blogger) => (
            <BloggerCard key={blogger.id} blogger={blogger} />
          ))}
        </section>
      ) : (
        <EmptyState title="Блогеры не найдены" description="Попробуй другой статус или поисковый запрос." />
      )}
    </div>
  );
}
