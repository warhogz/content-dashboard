"use client";

import { useEffect } from "react";
import { ArrowUpRight, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ImagePreview } from "@/components/image-preview";
import { StatusBadge } from "@/components/status-badge";
import { TypeBadge } from "@/components/type-badge";
import { ContentCard } from "@/lib/types";

export function FullscreenCardViewer({
  card,
  open,
  onClose
}: {
  card: ContentCard | null;
  open: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open || !card) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch justify-center p-3 sm:p-5"
      style={{
        background: "linear-gradient(180deg, rgba(4, 1, 4, .68), rgba(4, 1, 6, .88))",
        backdropFilter: "blur(28px)"
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="relative flex h-full w-full max-w-[1600px] flex-col overflow-hidden rounded-[34px] border lg:grid lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,420px)]"
        style={{
          borderColor: "var(--theme-border)",
          background: "linear-gradient(180deg, color-mix(in srgb, var(--theme-card-bg) 96%, transparent), color-mix(in srgb, var(--theme-surface-soft) 92%, transparent))",
          boxShadow: "var(--theme-shadow-hover)"
        }}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full border transition hover:scale-[1.03]"
          style={{
            borderColor: "var(--theme-border)",
            background: "color-mix(in srgb, var(--theme-surface) 92%, transparent)",
            color: "var(--theme-text)"
          }}
        >
          <X className="h-5 w-5" />
        </button>

        <div className="min-h-[48vh] overflow-auto p-4 sm:p-6 lg:p-8">
          <div className="mx-auto flex min-h-full max-w-[980px] items-center">
            <ImagePreview
              src={card.thumbnail_url}
              alt={card.title}
              aspectRatio={card.aspect_ratio}
              heightPx={Math.max(card.height_px, 560)}
              cropMode={card.crop_mode}
              fetchPriority="high"
            />
          </div>
        </div>

        <aside
          className="border-t p-5 sm:p-6 lg:border-l lg:border-t-0 lg:p-8"
          style={{
            borderColor: "var(--theme-border-soft)",
            background: "linear-gradient(180deg, color-mix(in srgb, var(--theme-surface-soft) 92%, transparent), color-mix(in srgb, var(--theme-surface) 94%, transparent))"
          }}
        >
          <div className="flex h-full flex-col">
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <TypeBadge type={card.type} />
                <StatusBadge status={card.status} />
                {card.project_key === "mena" ? (
                  <Badge style={{ background: "color-mix(in srgb, var(--theme-accent) 16%, transparent)", color: "var(--theme-text)" }}>
                    Mena
                  </Badge>
                ) : null}
                {card.is_archived ? (
                  <Badge style={{ background: "color-mix(in srgb, var(--theme-accent) 12%, transparent)", color: "var(--theme-text)" }}>
                    Archive
                  </Badge>
                ) : null}
              </div>

              <div>
                <h2 className="text-2xl font-semibold leading-tight sm:text-3xl" style={{ color: "var(--theme-text)" }}>
                  {card.title}
                </h2>
                {card.subtitle ? (
                  <p className="mt-3 text-sm leading-7 sm:text-base" style={{ color: "var(--theme-text-muted)" }}>
                    {card.subtitle}
                  </p>
                ) : null}
              </div>
            </div>

            {card.notes ? (
              <div
                className="mt-6 rounded-[24px] border p-4 text-sm leading-7"
                style={{
                  borderColor: "var(--theme-border)",
                  background: "color-mix(in srgb, var(--theme-surface-soft) 90%, transparent)",
                  color: "var(--theme-text-muted)"
                }}
              >
                {card.notes}
              </div>
            ) : null}

            <div className="mt-6 grid gap-3 text-sm" style={{ color: "var(--theme-text-muted)" }}>
              {card.is_archived && card.archived_at ? <div>Archived: {new Date(card.archived_at).toLocaleString("ru-RU")}</div> : null}
              {card.created_at ? <div>Created: {new Date(card.created_at).toLocaleString("ru-RU")}</div> : null}
            </div>

            <div className="mt-auto pt-6">
              <a
                href={card.link}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border px-5 text-sm font-medium transition"
                style={{
                  borderColor: "var(--theme-border)",
                  background: "var(--theme-surface)",
                  color: "var(--theme-text)"
                }}
              >
                Открыть источник <ArrowUpRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
