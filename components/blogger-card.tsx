"use client";

import { FileText, Instagram, PlayCircle, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BloggerRow } from "@/lib/types";
import { resolveCardPreviewUrl } from "@/lib/dropbox-links";

const statusPalette = ["#22c55e", "#f59e0b", "#3b82f6", "#ec4899", "#a855f7", "#14b8a6", "#ef4444"];

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
  href: string;
  label: string;
  icon: typeof Instagram;
}) {
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
  const statusColor = getStatusColor(blogger.status);
  const materialLabel = blogger.material_type === "script" ? "Script" : blogger.material_type === "video" ? "Video" : null;
  const materialIcon = blogger.material_type === "video" ? PlayCircle : FileText;
  const actions = [
    blogger.instagram_url ? { key: "instagram", href: blogger.instagram_url, label: "Instagram", icon: Instagram } : null,
    materialLabel && blogger.material_url ? { key: "material", href: blogger.material_url, label: materialLabel, icon: materialIcon } : null
  ].filter((action): action is { key: string; href: string; label: string; icon: typeof Instagram } => Boolean(action));

  return (
    <article
      className="flex h-full flex-col rounded-[30px] border backdrop-blur-2xl"
      style={{
        borderColor: "var(--theme-border)",
        background: "linear-gradient(180deg, color-mix(in srgb, var(--theme-surface) 96%, transparent), color-mix(in srgb, var(--theme-surface-soft) 90%, transparent))",
        boxShadow: "var(--theme-shadow)"
      }}
    >
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
            <div
              className="mt-3 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium"
              style={{ borderColor: "var(--theme-border)", color: "var(--theme-text-muted)", background: "var(--theme-surface-soft)" }}
            >
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

        <div className={`mt-auto grid gap-3 ${actions.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
          {actions.length ? (
            actions.map((action) => <BloggerActionButton key={action.key} href={action.href} label={action.label} icon={action.icon} />)
          ) : (
            <Button variant="outline" className="h-12 w-full justify-center opacity-55" disabled>
              Нет ссылок
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}
