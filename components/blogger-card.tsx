"use client";

import { Instagram, FileText, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BloggerRow } from "@/lib/types";
import { resolveCardPreviewUrl } from "@/lib/dropbox-links";

const statusPalette = [
  "#22c55e",
  "#f59e0b",
  "#3b82f6",
  "#ec4899",
  "#a855f7",
  "#14b8a6",
  "#ef4444"
];

function formatFollowers(value: number | null) {
  if (!value) return "No followers";
  if (value >= 1_000_000) {
    const formatted = value >= 10_000_000 ? (value / 1_000_000).toFixed(0) : (value / 1_000_000).toFixed(1);
    return `${formatted.replace(".0", "")}M followers`;
  }

  if (value >= 1_000) {
    const formatted = value >= 100_000 ? (value / 1_000).toFixed(0) : (value / 1_000).toFixed(1);
    return `${formatted.replace(".0", "")}K followers`;
  }

  return `${value} followers`;
}

function getStatusColor(status: string | null) {
  if (!status) return "#64748b";

  let hash = 0;
  for (let index = 0; index < status.length; index += 1) {
    hash = (hash << 5) - hash + status.charCodeAt(index);
    hash |= 0;
  }

  return statusPalette[Math.abs(hash) % statusPalette.length];
}

function BloggerActionButton({
  href,
  label,
  icon: Icon
}: {
  href: string | null;
  label: string;
  icon: typeof Instagram;
}) {
  if (!href) {
    return (
      <Button variant="outline" className="h-12 w-full justify-center opacity-55" disabled>
        <Icon className="h-4 w-4" />
        {label}
      </Button>
    );
  }

  return (
    <a href={href} target="_blank" rel="noreferrer" className="w-full">
      <Button variant="outline" className="h-12 w-full justify-center">
        <Icon className="h-4 w-4" />
        {label}
      </Button>
    </a>
  );
}

export function BloggerCard({ blogger }: { blogger: BloggerRow }) {
  const avatarUrl = resolveCardPreviewUrl(blogger.avatar_url);
  const coverUrl = resolveCardPreviewUrl(blogger.profile_screenshot_url);
  const statusColor = getStatusColor(blogger.status);

  return (
    <article
      className="flex h-full flex-col overflow-hidden rounded-[30px] border backdrop-blur-2xl"
      style={{
        borderColor: "var(--theme-border)",
        background: "linear-gradient(180deg, color-mix(in srgb, var(--theme-surface) 94%, transparent), color-mix(in srgb, var(--theme-surface-soft) 92%, transparent))",
        boxShadow: "var(--theme-shadow)"
      }}
    >
      <div
        className="relative aspect-[16/10] overflow-hidden border-b"
        style={{ borderColor: "color-mix(in srgb, var(--theme-border) 82%, transparent)", background: "var(--theme-image-bg)" }}
      >
        {coverUrl ? (
          <img src={coverUrl} alt={blogger.display_name} className="h-full w-full object-cover" loading="lazy" decoding="async" />
        ) : (
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(circle at 20% 20%, rgba(255, 164, 201, 0.16), transparent 30%), radial-gradient(circle at 80% 12%, rgba(214, 88, 140, 0.18), transparent 26%), linear-gradient(180deg, rgba(50, 14, 29, 0.72), rgba(18, 8, 15, 0.96))"
            }}
          />
        )}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-24"
          style={{ background: "linear-gradient(180deg, transparent, rgba(11, 5, 10, 0.94))" }}
        />
      </div>

      <div className="flex flex-1 flex-col gap-5 p-5">
        <div className="flex items-start gap-4">
          <div
            className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border"
            style={{
              borderColor: "color-mix(in srgb, var(--theme-border) 78%, transparent)",
              background: "var(--theme-surface-strong)",
              boxShadow: "0 12px 34px rgba(0, 0, 0, 0.22)"
            }}
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt={blogger.display_name} className="h-full w-full object-cover" loading="lazy" decoding="async" />
            ) : (
              <span className="text-xl font-semibold" style={{ color: "var(--theme-text)" }}>
                {blogger.display_name.slice(0, 1).toUpperCase()}
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="truncate text-lg font-semibold" style={{ color: "var(--theme-text)" }}>
              {blogger.display_name}
            </div>
            <div className="mt-1 truncate text-sm" style={{ color: "var(--theme-text-muted)" }}>
              {blogger.username ? `@${blogger.username.replace(/^@/, "")}` : "No username"}
            </div>
            <div className="mt-3 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium" style={{ borderColor: "var(--theme-border)", color: "var(--theme-text-muted)", background: "var(--theme-surface-soft)" }}>
              <Users className="h-3.5 w-3.5" />
              {formatFollowers(blogger.followers)}
            </div>
          </div>
        </div>

        {blogger.status ? (
          <div
            className="inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium"
            style={{
              borderColor: `${statusColor}55`,
              color: "var(--theme-text)",
              background: `linear-gradient(135deg, ${statusColor}22, color-mix(in srgb, var(--theme-surface-soft) 88%, transparent))`,
              boxShadow: `0 0 0 1px ${statusColor}16 inset, 0 0 26px ${statusColor}22`
            }}
          >
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: statusColor, boxShadow: `0 0 14px ${statusColor}` }} />
            {blogger.status}
          </div>
        ) : null}

        <div className="space-y-1">
          <div className="text-3xl font-semibold tracking-tight sm:text-[2rem]" style={{ color: "var(--theme-text)" }}>
            {blogger.price || "По запросу"}
          </div>
          {blogger.price_description ? (
            <div className="text-sm" style={{ color: "var(--theme-text-muted)" }}>
              {blogger.price_description}
            </div>
          ) : null}
        </div>

        {blogger.notes ? (
          <p
            className="text-sm leading-6"
            style={{
              color: "var(--theme-text-muted)",
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden"
            }}
          >
            {blogger.notes}
          </p>
        ) : (
          <div className="text-sm" style={{ color: "var(--theme-text-faint)" }}>
            No notes yet
          </div>
        )}

        <div className="mt-auto grid grid-cols-2 gap-3">
          <BloggerActionButton href={blogger.instagram_url} label="Instagram" icon={Instagram} />
          <BloggerActionButton href={blogger.script_url} label="Script" icon={FileText} />
        </div>
      </div>
    </article>
  );
}
