import { Archive, ArrowUpRight, Copy, EyeOff, Pin, Undo2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ImagePreview } from "@/components/image-preview";
import { StatusBadge } from "@/components/status-badge";
import { TypeBadge } from "@/components/type-badge";
import { ContentCard } from "@/lib/types";

export function CardItem({
  item,
  onCopy,
  onToggleHidden,
  onTogglePinned,
  onToggleArchived,
  compact = false,
  imagePriority = "auto"
}: {
  item: ContentCard;
  onCopy?: (id: string) => void;
  onToggleHidden?: (id: string) => void;
  onTogglePinned?: (id: string) => void;
  onToggleArchived?: (id: string) => void;
  compact?: boolean;
  imagePriority?: "high" | "auto" | "low";
}) {
  const previewHeight = compact ? Math.min(item.height_px, 210) : Math.min(item.height_px, 340);

  return (
    <Card
      className="panel-hover h-full overflow-hidden backdrop-blur-2xl"
      style={{
        border: "1px solid var(--theme-border-soft)",
        background: "var(--theme-card-bg)",
        boxShadow: "var(--theme-shadow-lift)"
      }}
    >
      <CardContent className="p-0">
        <div className="flex h-full flex-col">
          <div className={compact ? "p-3" : "p-4"}>
            <ImagePreview
              src={item.thumbnail_url}
              alt={item.title}
              aspectRatio={item.aspect_ratio}
              heightPx={previewHeight}
              cropMode={item.crop_mode}
              fetchPriority={imagePriority}
            />
          </div>

          <div
            className={compact ? "flex flex-1 flex-col justify-between gap-3 border-t p-4 pt-4" : "flex flex-1 flex-col justify-between gap-4 border-t p-5 pt-4"}
            style={{ borderColor: "var(--theme-border-soft)" }}
          >
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <TypeBadge type={item.type} />
                <StatusBadge status={item.status} />
                {item.project_key === "mena" ? (
                  <Badge style={{ background: "color-mix(in srgb, var(--theme-accent) 14%, transparent)", color: "var(--theme-text)" }}>
                    Mena
                  </Badge>
                ) : null}
                {item.is_pinned ? <Badge className="border-amber-400/25 bg-amber-500/10 text-amber-200">Pinned</Badge> : null}
                {item.is_hidden ? (
                  <Badge style={{ background: "var(--theme-surface-soft)", color: "var(--theme-text-muted)" }}>
                    Hidden
                  </Badge>
                ) : null}
                {item.is_archived ? (
                  <Badge style={{ background: "color-mix(in srgb, var(--theme-accent) 12%, transparent)", color: "var(--theme-text)" }}>
                    Archive
                  </Badge>
                ) : null}
              </div>

              <div>
                <h3
                  className={compact ? "text-base font-semibold leading-snug tracking-tight" : "text-lg font-semibold leading-snug tracking-tight"}
                  style={{ color: "var(--theme-text)" }}
                >
                  {item.title}
                </h3>
                {item.subtitle ? (
                  <p className={compact ? "mt-2 text-[13px] leading-5" : "mt-2 text-sm leading-6"} style={{ color: "var(--theme-text-muted)" }}>
                    {item.subtitle}
                  </p>
                ) : null}
              </div>

              {item.notes ? (
                <div
                  className={compact ? "rounded-2xl border p-3 text-[13px]" : "rounded-2xl border p-3 text-sm"}
                  style={{
                    borderColor: "var(--theme-border)",
                    background: "color-mix(in srgb, var(--theme-surface-soft) 88%, transparent)",
                    color: "var(--theme-text-muted)"
                  }}
                >
                  {item.notes}
                </div>
              ) : null}

              {item.is_archived && item.archived_at ? (
                <div className={compact ? "text-[12px]" : "text-xs"} style={{ color: "var(--theme-text-muted)" }}>
                  Archived {new Date(item.archived_at).toLocaleDateString("ru-RU")}
                </div>
              ) : null}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              <a
                href={item.link}
                target="_blank"
                rel="noreferrer"
                className={compact ? "inline-flex h-10 w-full items-center justify-center gap-2 rounded-2xl border px-3 text-sm font-medium transition sm:w-auto" : "inline-flex h-10 w-full items-center justify-center gap-2 rounded-2xl border px-4 text-sm font-medium transition sm:w-auto"}
                style={{ borderColor: "var(--theme-border)", background: "var(--theme-surface)", color: "var(--theme-text)" }}
              >
                Открыть <ArrowUpRight className="h-4 w-4" />
              </a>

              {onCopy ? (
                <Button className="w-full sm:w-auto" size={compact ? "sm" : "md"} variant="secondary" onClick={() => onCopy(item.id)}>
                  Дублировать <Copy className="h-4 w-4" />
                </Button>
              ) : null}

              {onTogglePinned ? (
                <Button className="w-full sm:w-auto hover:bg-[var(--theme-button-ghost-hover)]" size={compact ? "sm" : "md"} variant="ghost" onClick={() => onTogglePinned(item.id)}>
                  {item.is_pinned ? "Открепить" : "Закрепить"} <Pin className="h-4 w-4" />
                </Button>
              ) : null}

              {onToggleHidden ? (
                <Button className="w-full sm:w-auto hover:bg-[var(--theme-button-ghost-hover)]" size={compact ? "sm" : "md"} variant="ghost" onClick={() => onToggleHidden(item.id)}>
                  {item.is_hidden ? "Показать" : "Скрыть"} <EyeOff className="h-4 w-4" />
                </Button>
              ) : null}

              {onToggleArchived ? (
                <Button className="w-full sm:w-auto hover:bg-[var(--theme-button-ghost-hover)]" size={compact ? "sm" : "md"} variant="ghost" onClick={() => onToggleArchived(item.id)}>
                  {item.is_archived ? "Разархивировать" : "Архивировать"} {item.is_archived ? <Undo2 className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
