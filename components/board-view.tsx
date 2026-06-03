"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent, type WheelEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { ImagePreview } from "@/components/image-preview";
import { StatusBadge } from "@/components/status-badge";
import { TypeBadge } from "@/components/type-badge";
import { ContentCard } from "@/lib/types";

type CanvasSection = {
  id: string;
  title: string;
  color: string;
  cards: ContentCard[];
  subtitle?: string;
};

type CanvasCard = {
  id: string;
  x: number;
  y: number;
  card: ContentCard;
  sectionColor: string;
};

type CanvasLabel = {
  id: string;
  x: number;
  y: number;
  width: number;
  title: string;
  subtitle?: string;
  color: string;
};

const CARD_WIDTH = 272;
const CARD_HEIGHT = 364;
const CARD_GAP_X = 28;
const CARD_GAP_Y = 28;
const HEADER_HEIGHT = 64;
const SECTION_GAP = 88;
const MIN_SCALE = 0.72;
const MAX_SCALE = 1.75;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function midpoint(a: { x: number; y: number }, b: { x: number; y: number }) {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2
  };
}

function buildCanvasLayout(sections: CanvasSection[]) {
  const cards: CanvasCard[] = [];
  const labels: CanvasLabel[] = [];

  let yCursor = 0;
  let minX = 0;
  let maxX = 0;

  for (const section of sections) {
    const count = Math.max(section.cards.length, 1);
    const columns = Math.min(5, Math.max(3, Math.ceil(Math.sqrt(count + 1))));
    const rows = Math.max(1, Math.ceil(count / columns));
    const sectionWidth = columns * CARD_WIDTH + (columns - 1) * CARD_GAP_X;
    const startX = -sectionWidth / 2;

    labels.push({
      id: `label-${section.id}`,
      x: startX,
      y: yCursor,
      width: sectionWidth,
      title: section.title,
      subtitle: section.subtitle || `${section.cards.length} карточек`,
      color: section.color
    });

    section.cards.forEach((card, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      const x = startX + column * (CARD_WIDTH + CARD_GAP_X);
      const y = yCursor + HEADER_HEIGHT + row * (CARD_HEIGHT + CARD_GAP_Y);

      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x + CARD_WIDTH);

      cards.push({
        id: card.id,
        x,
        y,
        card,
        sectionColor: section.color
      });
    });

    yCursor += HEADER_HEIGHT + rows * CARD_HEIGHT + Math.max(0, rows - 1) * CARD_GAP_Y + SECTION_GAP;
  }

  const totalHeight = Math.max(0, yCursor - SECTION_GAP);
  const centerYOffset = totalHeight / 2;
  const centerXOffset = (minX + maxX) / 2;

  return {
    cards: cards.map((item) => ({
      ...item,
      x: item.x - centerXOffset,
      y: item.y - centerYOffset
    })),
    labels: labels.map((item) => ({
      ...item,
      x: item.x - centerXOffset,
      y: item.y - centerYOffset
    }))
  };
}

export function BoardView({
  sections,
  onOpenCard
}: {
  sections: CanvasSection[];
  onOpenCard: (card: ContentCard) => void;
}) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const inertiaFrameRef = useRef<number | null>(null);
  const lastDragSampleRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const dragStateRef = useRef<{ active: boolean; pointerId: number | null; x: number; y: number }>({
    active: false,
    pointerId: null,
    x: 0,
    y: 0
  });
  const transformRef = useRef({ x: 0, y: 0, scale: 1 });
  const velocityRef = useRef({ x: 0, y: 0 });
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchRef = useRef<null | { distance: number; scale: number; worldX: number; worldY: number }>(null);

  const [dragging, setDragging] = useState(false);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [viewport, setViewport] = useState({ width: 0, height: 0 });

  const layout = useMemo(() => buildCanvasLayout(sections), [sections]);

  const commitTransform = (next: { x: number; y: number; scale: number }) => {
    transformRef.current = next;
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    animationFrameRef.current = requestAnimationFrame(() => {
      setTransform(next);
    });
  };

  const stopInertia = () => {
    if (inertiaFrameRef.current) {
      cancelAnimationFrame(inertiaFrameRef.current);
      inertiaFrameRef.current = null;
    }
  };

  const startInertia = () => {
    stopInertia();

    const tick = () => {
      const { x, y } = velocityRef.current;
      if (Math.abs(x) < 0.12 && Math.abs(y) < 0.12) {
        velocityRef.current = { x: 0, y: 0 };
        inertiaFrameRef.current = null;
        return;
      }

      const current = transformRef.current;
      commitTransform({
        ...current,
        x: current.x + x,
        y: current.y + y
      });

      velocityRef.current = {
        x: x * 0.94,
        y: y * 0.94
      };

      inertiaFrameRef.current = requestAnimationFrame(tick);
    };

    inertiaFrameRef.current = requestAnimationFrame(tick);
  };

  const zoomAt = (targetScale: number, originX: number, originY: number, baseTransform = transformRef.current) => {
    if (!viewport.width || !viewport.height) return;

    const nextScale = clamp(targetScale, MIN_SCALE, MAX_SCALE);
    const worldX = (originX - viewport.width / 2 - baseTransform.x) / baseTransform.scale;
    const worldY = (originY - viewport.height / 2 - baseTransform.y) / baseTransform.scale;

    commitTransform({
      scale: nextScale,
      x: originX - viewport.width / 2 - worldX * nextScale,
      y: originY - viewport.height / 2 - worldY * nextScale
    });
  };

  useEffect(() => {
    const node = viewportRef.current;
    if (!node) return;

    const updateSize = () => {
      const rect = node.getBoundingClientRect();
      setViewport({ width: rect.width, height: rect.height });
    };

    updateSize();

    const observer = new ResizeObserver(updateSize);
    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (inertiaFrameRef.current) cancelAnimationFrame(inertiaFrameRef.current);
    };
  }, []);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest("[data-canvas-card='true']")) return;

    stopInertia();
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointersRef.current.size === 1) {
      dragStateRef.current = {
        active: true,
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY
      };
      lastDragSampleRef.current = {
        x: event.clientX,
        y: event.clientY,
        time: performance.now()
      };
      velocityRef.current = { x: 0, y: 0 };
      setDragging(true);
    } else if (pointersRef.current.size === 2) {
      dragStateRef.current.active = false;
      setDragging(false);
      const [first, second] = [...pointersRef.current.values()];
      const pinchMidpoint = midpoint(first, second);
      const current = transformRef.current;
      pinchRef.current = {
        distance: distance(first, second),
        scale: current.scale,
        worldX: (pinchMidpoint.x - viewport.width / 2 - current.x) / current.scale,
        worldY: (pinchMidpoint.y - viewport.height / 2 - current.y) / current.scale
      };
    }

    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (pointersRef.current.has(event.pointerId)) {
      pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    }

    if (pointersRef.current.size === 2 && pinchRef.current) {
      const [first, second] = [...pointersRef.current.values()];
      const pinchMidpoint = midpoint(first, second);
      const nextScale = pinchRef.current.scale * (distance(first, second) / pinchRef.current.distance);
      const clampedScale = clamp(nextScale, MIN_SCALE, MAX_SCALE);

      commitTransform({
        scale: clampedScale,
        x: pinchMidpoint.x - viewport.width / 2 - pinchRef.current.worldX * clampedScale,
        y: pinchMidpoint.y - viewport.height / 2 - pinchRef.current.worldY * clampedScale
      });
      return;
    }

    if (!dragStateRef.current.active || dragStateRef.current.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - dragStateRef.current.x;
    const deltaY = event.clientY - dragStateRef.current.y;
    const current = transformRef.current;

    commitTransform({
      ...current,
      x: current.x + deltaX,
      y: current.y + deltaY
    });

    dragStateRef.current.x = event.clientX;
    dragStateRef.current.y = event.clientY;

    const now = performance.now();
    if (lastDragSampleRef.current) {
      const elapsed = Math.max(16, now - lastDragSampleRef.current.time);
      velocityRef.current = {
        x: ((event.clientX - lastDragSampleRef.current.x) / elapsed) * 16,
        y: ((event.clientY - lastDragSampleRef.current.y) / elapsed) * 16
      };
    }

    lastDragSampleRef.current = {
      x: event.clientX,
      y: event.clientY,
      time: now
    };
  };

  const finishPointer = (event: PointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(event.pointerId);
    event.currentTarget.releasePointerCapture?.(event.pointerId);

    if (pointersRef.current.size < 2) {
      pinchRef.current = null;
    }

    if (dragStateRef.current.pointerId === event.pointerId) {
      dragStateRef.current.active = false;
      dragStateRef.current.pointerId = null;
      setDragging(false);
      startInertia();
    }
  };

  const onWheel = (event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    stopInertia();

    const rect = viewportRef.current?.getBoundingClientRect();
    if (!rect) return;

    const originX = event.clientX - rect.left;
    const originY = event.clientY - rect.top;

    const isTrackpadPan = !event.ctrlKey && (Math.abs(event.deltaX) > 0 || Math.abs(event.deltaY) < 24);
    if (isTrackpadPan) {
      const current = transformRef.current;
      commitTransform({
        ...current,
        x: current.x - event.deltaX,
        y: current.y - event.deltaY
      });
      return;
    }

    const zoomFactor = Math.exp(-event.deltaY * 0.0012);
    zoomAt(transformRef.current.scale * zoomFactor, originX, originY);
  };

  const cardsWithFocus = useMemo(() => {
    const focusRadius = Math.max(420, Math.hypot(viewport.width, viewport.height) * 0.38);

    return layout.cards.map((item) => {
      const centerX = transform.x + (item.x + CARD_WIDTH / 2) * transform.scale;
      const centerY = transform.y + (item.y + CARD_HEIGHT / 2) * transform.scale;
      const normalizedDistance = Math.min(1.25, Math.hypot(centerX, centerY) / focusRadius);
      const intensity = Math.max(0, 1 - normalizedDistance);

      return {
        ...item,
        focusScale: 1 + intensity * 0.08,
        focusOpacity: 0.78 + intensity * 0.22,
        focusBrightness: 0.92 + intensity * 0.12,
        focusGlow: 0.12 + intensity * 0.22
      };
    });
  }, [layout.cards, transform, viewport.height, viewport.width]);

  return (
    <section
      className="overflow-hidden rounded-[34px] border backdrop-blur-2xl"
      style={{
        borderColor: "var(--theme-border)",
        background: "linear-gradient(180deg, color-mix(in srgb, var(--theme-surface) 86%, transparent), color-mix(in srgb, var(--theme-surface-soft) 92%, transparent))",
        boxShadow: "var(--theme-shadow)"
      }}
    >
      <div className="flex items-center justify-between gap-3 border-b px-4 py-3 sm:px-5" style={{ borderColor: "var(--theme-border-soft)" }}>
        <div>
          <div className="label">Canvas</div>
          <div className="mt-1 text-sm" style={{ color: "var(--theme-text-muted)" }}>
            Drag to explore, wheel or pinch to zoom
          </div>
        </div>
        <div className="text-xs" style={{ color: "var(--theme-text-muted)" }}>
          {Math.round(transform.scale * 100)}%
        </div>
      </div>

      <div
        ref={viewportRef}
        className="relative h-[72vh] min-h-[560px] overflow-hidden touch-none sm:h-[78vh]"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finishPointer}
        onPointerCancel={finishPointer}
        onPointerLeave={(event) => {
          if (dragStateRef.current.active && event.pointerType === "mouse") {
            finishPointer(event);
          }
        }}
        onWheel={onWheel}
        style={{
          cursor: dragging ? "grabbing" : "grab",
          background:
            "radial-gradient(circle at 50% 50%, color-mix(in srgb, var(--theme-glow) 24%, transparent), transparent 28%), radial-gradient(circle at 50% 50%, color-mix(in srgb, var(--theme-surface-soft) 94%, transparent), transparent 58%), linear-gradient(180deg, rgba(12, 6, 10, .54), rgba(8, 4, 8, .78))"
        }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, color-mix(in srgb, var(--theme-text) 18%, transparent) 1px, transparent 0)",
            backgroundSize: `${Math.max(26, 34 * transform.scale)}px ${Math.max(26, 34 * transform.scale)}px`,
            transform: `translate3d(${transform.x * 0.14}px, ${transform.y * 0.14}px, 0)`
          }}
        />

        <div
          className="absolute left-0 top-0 will-change-transform"
          style={{
            transform: `translate3d(${viewport.width / 2 + transform.x}px, ${viewport.height / 2 + transform.y}px, 0) scale(${transform.scale})`,
            transformOrigin: "0 0"
          }}
        >
          {layout.labels.map((label) => (
            <div
              key={label.id}
              className="absolute rounded-[24px] border px-5 py-4 backdrop-blur-xl"
              style={{
                transform: `translate3d(${label.x}px, ${label.y}px, 0)`,
                width: label.width,
                borderColor: `${label.color}2f`,
                background: "color-mix(in srgb, var(--theme-surface-soft) 92%, transparent)",
                boxShadow: `0 0 0 1px ${label.color}10 inset, 0 0 34px ${label.color}12`
              }}
            >
              <div className="flex items-center gap-3">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: label.color, boxShadow: `0 0 18px ${label.color}` }} />
                <h2 className="text-lg font-semibold tracking-tight" style={{ color: "var(--theme-text)" }}>
                  {label.title}
                </h2>
              </div>
              <p className="mt-2 text-sm" style={{ color: "var(--theme-text-muted)" }}>
                {label.subtitle}
              </p>
            </div>
          ))}

          {cardsWithFocus.map((item, index) => (
            <button
              key={item.id}
              type="button"
              data-canvas-card="true"
              onClick={() => onOpenCard(item.card)}
              className="absolute overflow-hidden rounded-[28px] border text-left transition"
              style={{
                width: CARD_WIDTH,
                height: CARD_HEIGHT,
                transform: `translate3d(${item.x}px, ${item.y}px, 0) scale(${item.focusScale})`,
                transformOrigin: "center center",
                borderColor: `${item.sectionColor}${item.focusOpacity > 0.9 ? "4a" : "30"}`,
                opacity: item.focusOpacity,
                filter: `brightness(${item.focusBrightness}) saturate(${1 + item.focusGlow * 0.2})`,
                background: "var(--theme-card-bg)",
                boxShadow:
                  index < 8
                    ? `var(--theme-shadow-lift), 0 0 36px color-mix(in srgb, ${item.sectionColor} ${Math.round(item.focusGlow * 100)}%, transparent)`
                    : `var(--theme-shadow-lift), 0 0 24px color-mix(in srgb, ${item.sectionColor} ${Math.round(item.focusGlow * 70)}%, transparent)`
              }}
            >
              <div className="p-3">
                <ImagePreview
                  src={item.card.thumbnail_url}
                  alt={item.card.title}
                  aspectRatio="custom"
                  heightPx={176}
                  cropMode={item.card.crop_mode}
                  fetchPriority={index < 6 ? "high" : "auto"}
                />
              </div>

              <div className="flex h-[172px] flex-col justify-between border-t px-4 py-3" style={{ borderColor: "var(--theme-border-soft)" }}>
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <TypeBadge type={item.card.type} />
                    <StatusBadge status={item.card.status} />
                    {item.card.project_key === "mena" ? (
                      <Badge style={{ background: "color-mix(in srgb, var(--theme-accent) 14%, transparent)", color: "var(--theme-text)" }}>
                        Mena
                      </Badge>
                    ) : null}
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold leading-6" style={{ color: "var(--theme-text)" }}>
                      {item.card.title}
                    </h3>
                    {item.card.subtitle ? (
                      <p className="mt-1 max-h-10 overflow-hidden text-xs leading-5" style={{ color: "var(--theme-text-muted)" }}>
                        {item.card.subtitle}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="pointer-events-none absolute bottom-4 left-4 right-4 flex justify-between text-[11px] uppercase tracking-[0.18em] sm:bottom-5 sm:left-5 sm:right-5">
          <span style={{ color: "var(--theme-label)" }}>Infinite media plane</span>
          <span style={{ color: "var(--theme-label)" }}>Center focus active</span>
        </div>
      </div>
    </section>
  );
}
