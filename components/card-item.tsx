import { ArrowUpRight, Copy, EyeOff, Pin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ImagePreview } from "@/components/image-preview";
import { StatusBadge } from "@/components/status-badge";
import { TypeBadge } from "@/components/type-badge";
import { ContentCard } from "@/lib/types";

export function CardItem({ item, onCopy, onToggleHidden, onTogglePinned, compact = false }: { item: ContentCard; onCopy?: (id: string) => void; onToggleHidden?: (id: string) => void; onTogglePinned?: (id: string) => void; compact?: boolean; }) {
  const previewHeight = compact ? Math.min(item.height_px, 220) : item.height_px;

  return (
    <Card className="panel-hover h-full overflow-hidden border-white/10">
      <CardContent className="p-0">
        <div className="flex h-full flex-col">
          <div className={compact ? "p-3" : "p-4"}>
            <ImagePreview src={item.thumbnail_url} alt={item.title} aspectRatio={item.aspect_ratio} heightPx={previewHeight} cropMode={item.crop_mode} />
          </div>
          <div className={compact ? "flex flex-1 flex-col justify-between gap-3 p-4 pt-0" : "flex flex-1 flex-col justify-between gap-4 p-5 pt-0"}>
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <TypeBadge type={item.type} />
                <StatusBadge status={item.status} />
                {item.is_pinned ? <Badge className="border-amber-400/25 bg-amber-500/10 text-amber-200">Pinned</Badge> : null}
                {item.is_hidden ? <Badge className="bg-white/7 text-white/60">Hidden</Badge> : null}
              </div>
              <div>
                <h3 className={compact ? "text-base font-semibold leading-snug tracking-tight text-white" : "text-lg font-semibold leading-snug tracking-tight text-white"}>{item.title}</h3>
                {item.subtitle ? <p className={compact ? "mt-2 text-[13px] text-white/58" : "mt-2 text-sm text-white/58"}>{item.subtitle}</p> : null}
              </div>
              {item.notes ? <div className={compact ? "rounded-2xl border border-white/10 bg-white/5 p-3 text-[13px] text-white/70" : "rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-white/70"}>{item.notes}</div> : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <a href={item.link} target="_blank" rel="noreferrer" className={compact ? "inline-flex h-9 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 text-sm font-medium text-white transition hover:bg-white/9" : "inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm font-medium text-white transition hover:bg-white/9"}>Open <ArrowUpRight className="h-4 w-4" /></a>
              {onCopy ? <Button size={compact ? "sm" : "md"} variant="secondary" onClick={() => onCopy(item.id)}>Duplicate <Copy className="h-4 w-4" /></Button> : null}
              {onTogglePinned ? <Button size={compact ? "sm" : "md"} variant="ghost" onClick={() => onTogglePinned(item.id)}>{item.is_pinned ? "Unpin" : "Pin"} <Pin className="h-4 w-4" /></Button> : null}
              {onToggleHidden ? <Button size={compact ? "sm" : "md"} variant="ghost" onClick={() => onToggleHidden(item.id)}>{item.is_hidden ? "Show" : "Hide"} <EyeOff className="h-4 w-4" /></Button> : null}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
