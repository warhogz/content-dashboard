"use client";

import { type PointerEvent, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ImagePreview } from "@/components/image-preview";
import { StatusBadge } from "@/components/status-badge";
import { TypeBadge } from "@/components/type-badge";
import { ContentCard } from "@/lib/types";

type BoardSection = {
  id: string;
  title: string;
  color: string;
  cards: ContentCard[];
  subtitle?: string;
};

export function BoardView({
  sections,
  onOpenCard
}: {
  sections: BoardSection[];
  onOpenCard: (card: ContentCard) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const dragState = useRef({ active: false, x: 0, y: 0, left: 0, top: 0 });

  const startPan = (event: PointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest("[data-board-card='true']")) return;

    const container = containerRef.current;
    if (!container) return;

    dragState.current = {
      active: true,
      x: event.clientX,
      y: event.clientY,
      left: container.scrollLeft,
      top: container.scrollTop
    };

    setDragging(true);
    container.setPointerCapture?.(event.pointerId);
  };

  const movePan = (event: PointerEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    if (!dragState.current.active || !container) return;

    container.scrollLeft = dragState.current.left - (event.clientX - dragState.current.x);
    container.scrollTop = dragState.current.top - (event.clientY - dragState.current.y);
  };

  const endPan = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragState.current.active) return;

    dragState.current.active = false;
    setDragging(false);
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  };

  return (
    <section
      className="overflow-hidden rounded-[34px] border backdrop-blur-2xl"
      style={{
        borderColor: "var(--theme-border)",
        background: "linear-gradient(180deg, color-mix(in srgb, var(--theme-surface) 86%, transparent), color-mix(in srgb, var(--theme-surface-soft) 92%, transparent))",
        boxShadow: "var(--theme-shadow)"
      }}
    >
      <div
        ref={containerRef}
        className="overflow-auto p-4 sm:p-5"
        style={{
          cursor: dragging ? "grabbing" : "grab",
          touchAction: "pan-x pan-y"
        }}
        onPointerDown={startPan}
        onPointerMove={movePan}
        onPointerUp={endPan}
        onPointerCancel={endPan}
        onPointerLeave={endPan}
      >
        <div
          className="grid min-w-max grid-flow-col gap-5 pb-2"
          style={{
            gridAutoColumns: "minmax(320px, 360px)"
          }}
        >
          {sections.map((section, index) => (
            <div
              key={section.id}
              className="flex h-full min-h-[70vh] flex-col rounded-[30px] border p-4 sm:p-5"
              style={{
                transform: index % 2 ? "translateY(28px)" : "translateY(0)",
                borderColor: `${section.color}33`,
                background: "linear-gradient(180deg, color-mix(in srgb, var(--theme-card-bg) 92%, transparent), color-mix(in srgb, var(--theme-surface-soft) 90%, transparent))",
                boxShadow: `0 0 0 1px ${section.color}12 inset, var(--theme-shadow-lift), 0 0 42px ${section.color}14`
              }}
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: section.color, boxShadow: `0 0 18px ${section.color}` }} />
                    <h2 className="text-lg font-semibold tracking-tight" style={{ color: "var(--theme-text)" }}>
                      {section.title}
                    </h2>
                  </div>
                  <p className="mt-2 text-sm" style={{ color: "var(--theme-text-muted)" }}>
                    {section.subtitle || `${section.cards.length} карточек`}
                  </p>
                </div>
                <Badge style={{ background: "var(--theme-surface-soft)", color: "var(--theme-text)" }}>{section.cards.length}</Badge>
              </div>

              <div className="space-y-4">
                {section.cards.map((card, cardIndex) => (
                  <button
                    key={card.id}
                    type="button"
                    data-board-card="true"
                    onClick={() => onOpenCard(card)}
                    className="w-full rounded-[26px] border p-3 text-left transition duration-300 hover:-translate-y-1"
                    style={{
                      borderColor: "var(--theme-border-soft)",
                      background: "var(--theme-card-bg)",
                      boxShadow: cardIndex < 2 ? "var(--theme-shadow-lift), 0 0 28px color-mix(in srgb, var(--theme-accent) 10%, transparent)" : "var(--theme-shadow-lift)"
                    }}
                  >
                    <ImagePreview
                      src={card.thumbnail_url}
                      alt={card.title}
                      aspectRatio={card.aspect_ratio}
                      heightPx={Math.min(card.height_px, 220)}
                      cropMode={card.crop_mode}
                      fetchPriority={cardIndex < 2 ? "high" : "auto"}
                    />

                    <div className="mt-3 space-y-3">
                      <div className="flex flex-wrap gap-2">
                        <TypeBadge type={card.type} />
                        <StatusBadge status={card.status} />
                        {card.project_key === "mena" ? (
                          <Badge style={{ background: "color-mix(in srgb, var(--theme-accent) 14%, transparent)", color: "var(--theme-text)" }}>
                            Mena
                          </Badge>
                        ) : null}
                      </div>

                      <div>
                        <h3 className="text-sm font-semibold leading-6" style={{ color: "var(--theme-text)" }}>
                          {card.title}
                        </h3>
                        {card.subtitle ? (
                          <p className="mt-1 text-xs leading-5" style={{ color: "var(--theme-text-muted)" }}>
                            {card.subtitle}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
