import { ArrowUpRight, Copy, EyeOff, Pin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ImagePreview } from "@/components/image-preview";
import { StatusBadge } from "@/components/status-badge";
import { TypeBadge } from "@/components/type-badge";
import { ContentCard } from "@/lib/types";

export function CardItem({ item, onCopy, onToggleHidden, onTogglePinned, compact = false }: { item: ContentCard; onCopy?: (id: string) => void; onToggleHidden?: (id: string) => void; onTogglePinned?: (id: string) => void; compact?: boolean; }) {
  const previewHeight = compact ? Math.min(item.height_px, 210) : Math.min(item.height_px, 340);

  return (
    <Card className="panel-hover h-full overflow-hidden border-white/12 bg-white/[0.04]">
      <CardContent className="p-0">
        <div className="flex h-full flex-col">
          <div className={compact ? "p-3" : "p-4"}>
            <ImagePreview src={item.thumbnail_url} alt={item.title} aspectRatio={item.aspect_ratio} heightPx={previewHeight} cropMode={item.crop_mode} />
          </div>
          <div className={compact ? "flex flex-1 flex-col justify-between gap-3 border-t border-white/8 p-4 pt-4" : "flex flex-1 flex-col justify-between gap-4 border-t border-white/8 p-5 pt-4"}>
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <TypeBadge type={item.type} />
                <StatusBadge status={item.status} />
                {item.is_pinned ? <Badge className="border-amber-400/25 bg-amber-500/10 text-amber-200">Pinned</Badge> : null}
                {item.is_hidden ? <Badge className="bg-white/7 text-white/60">Hidden</Badge> : null}
              </div>
              <div>
                <h3 className={compact ? "text-base font-semibold leading-snug tracking-tight text-white" : "text-lg font-semibold leading-snug tracking-tight text-white"}>{item.title}</h3>
                {item.subtitle ? <p className={compact ? "mt-2 text-[13px] leading-5 text-white/60" : "mt-2 text-sm leading-6 text-white/58"}>{item.subtitle}</p> : null}
              </div>
              {item.notes ? <div className={compact ? "rounded-2xl border border-white/10 bg-black/20 p-3 text-[13px] text-white/72" : "rounded-2xl border border-white/10 bg-black/20 p-3 text-sm text-white/72"}>{item.notes}</div> : null}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              <a href={item.link} target="_blank" rel="noreferrer" className={compact ? "inline-flex h-10 w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/6 px-3 text-sm font-medium text-white transition hover:bg-white/10 sm:w-auto" : "inline-flex h-10 w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/6 px-4 text-sm font-medium text-white transition hover:bg-white/10 sm:w-auto"}>Открыть <ArrowUpRight className="h-4 w-4" /></a>
              {onCopy ? <Button className="w-full sm:w-auto" size={compact ? "sm" : "md"} variant="secondary" onClick={() => onCopy(item.id)}>Дублировать <Copy className="h-4 w-4" /></Button> : null}
              {onTogglePinned ? <Button className="w-full sm:w-auto" size={compact ? "sm" : "md"} variant="ghost" onClick={() => onTogglePinned(item.id)}>{item.is_pinned ? "Открепить" : "Закрепить"} <Pin className="h-4 w-4" /></Button> : null}
              {onToggleHidden ? <Button className="w-full sm:w-auto" size={compact ? "sm" : "md"} variant="ghost" onClick={() => onToggleHidden(item.id)}>{item.is_hidden ? "Показать" : "Скрыть"} <EyeOff className="h-4 w-4" /></Button> : null}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
