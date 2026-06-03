"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent, type WheelEvent } from "react";
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

type SectionMetric = {
  section: CanvasSection;
  columns: number;
  rows: number;
  width: number;
  height: number;
};

const CARD_WIDTH = 272;
const CARD_HEIGHT = 364;
const CARD_GAP_X = 44;
const CARD_GAP_Y = 40;
const HEADER_HEIGHT = 94;
const SECTION_GAP_X = 240;
const SECTION_GAP_Y = 180;
const MIN_SCALE = 0.24;
const MAX_SCALE = 2.4;
const DRAG_THRESHOLD = 7;
const PAN_LIMIT = 96000;
const WORLD_GRID_SIZE = 46;
const GLOW_FIELD_SIZE = 1200;
const CULL_MARGIN = 280;
const MIN_CARD_RENDER_WIDTH = 24;
const MIN_CARD_RENDER_HEIGHT = 32;
const COMPACT_CARD_WIDTH = 128;
const FULL_CARD_WIDTH = 188;
const FOCUS_MIN_SCALE = 0.38;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function sanitizeNumber(value: unknown, fallback = 0) {
  return isFiniteNumber(value) ? value : fallback;
}

function wrapOffset(value: number, size: number) {
  const safeValue = sanitizeNumber(value);
  return ((safeValue % size) + size) % size;
}

function sanitizeTransform(
  next: { x: number; y: number; scale: number },
  fallback: { x: number; y: number; scale: number }
) {
  const fallbackScale = isFiniteNumber(fallback.scale) && fallback.scale > 0 ? fallback.scale : 1;
  const safeScale = clamp(sanitizeNumber(next.scale, fallbackScale), MIN_SCALE, MAX_SCALE);
  const safeX = clamp(sanitizeNumber(next.x, fallback.x), -PAN_LIMIT, PAN_LIMIT);
  const safeY = clamp(sanitizeNumber(next.y, fallback.y), -PAN_LIMIT, PAN_LIMIT);

  return {
    x: safeX,
    y: safeY,
    scale: safeScale
  };
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

function measureSection(section: CanvasSection): SectionMetric {
  const count = Math.max(section.cards.length, 1);
  const columns = Math.min(4, Math.max(2, Math.ceil(Math.sqrt(count))));
  const rows = Math.max(1, Math.ceil(count / columns));
  const width = columns * CARD_WIDTH + Math.max(0, columns - 1) * CARD_GAP_X;
  const height = HEADER_HEIGHT + rows * CARD_HEIGHT + Math.max(0, rows - 1) * CARD_GAP_Y;

  return {
    section,
    columns,
    rows,
    width,
    height
  };
}

function buildCanvasLayout(sections: CanvasSection[]) {
  const cards: CanvasCard[] = [];
  const labels: CanvasLabel[] = [];
  const metrics = sections.map(measureSection);

  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let yCursor = 0;

  for (let rowIndex = 0; rowIndex < metrics.length; rowIndex += 2) {
    const rowItems = metrics.slice(rowIndex, rowIndex + 2);
    const rowHeight = Math.max(...rowItems.map((item) => item.height));
    const rowWidth = rowItems.reduce((total, item) => total + item.width, 0) + SECTION_GAP_X * Math.max(0, rowItems.length - 1);
    let xCursor = -rowWidth / 2;

    rowItems.forEach((metric) => {
      labels.push({
        id: `label-${metric.section.id}`,
        x: xCursor,
        y: yCursor,
        width: metric.width,
        title: metric.section.title,
        subtitle: metric.section.subtitle || `${metric.section.cards.length} карточек`,
        color: metric.section.color
      });

      metric.section.cards.forEach((card, index) => {
        const column = index % metric.columns;
        const row = Math.floor(index / metric.columns);
        const x = xCursor + column * (CARD_WIDTH + CARD_GAP_X);
        const y = yCursor + HEADER_HEIGHT + row * (CARD_HEIGHT + CARD_GAP_Y);

        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x + CARD_WIDTH);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y + CARD_HEIGHT);

        cards.push({
          id: card.id,
          x,
          y,
          card,
          sectionColor: metric.section.color
        });
      });

      minX = Math.min(minX, xCursor);
      maxX = Math.max(maxX, xCursor + metric.width);
      minY = Math.min(minY, yCursor);
      maxY = Math.max(maxY, yCursor + metric.height);

      xCursor += metric.width + SECTION_GAP_X;
    });

    yCursor += rowHeight + SECTION_GAP_Y;
  }

  if (!cards.length && !labels.length) {
    return { cards: [], labels: [] };
  }

  const centerXOffset = (minX + maxX) / 2;
  const centerYOffset = (minY + maxY) / 2;

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
  onOpenCard,
  storageKey = "public-canvas"
}: {
  sections: CanvasSection[];
  onOpenCard: (card: ContentCard) => void;
  storageKey?: string;
}) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const inertiaFrameRef = useRef<number | null>(null);
  const lastDragSampleRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const focusedCardIdRef = useRef<string | null>(null);
  const dragStateRef = useRef<{
    active: boolean;
    pointerId: number | null;
    startX: number;
    startY: number;
    lastX: number;
    lastY: number;
    cardId: string | null;
  }>({
    active: false,
    pointerId: null,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    cardId: null
  });
  const transformRef = useRef({ x: 0, y: 0, scale: 1 });
  const velocityRef = useRef({ x: 0, y: 0 });
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchRef = useRef<null | { distance: number; scale: number; worldX: number; worldY: number }>(null);

  const [dragging, setDragging] = useState(false);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [focusedCardId, setFocusedCardId] = useState<string | null>(null);

  const layout = useMemo(() => buildCanvasLayout(sections), [sections]);
  const cardsById = useMemo(() => new Map(layout.cards.map((item) => [item.id, item.card])), [layout.cards]);

  const commitTransform = (next: { x: number; y: number; scale: number }) => {
    const safeNext = sanitizeTransform(next, transformRef.current);
    transformRef.current = safeNext;
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    animationFrameRef.current = requestAnimationFrame(() => {
      setTransform(safeNext);
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
      const x = sanitizeNumber(velocityRef.current.x);
      const y = sanitizeNumber(velocityRef.current.y);
      if (Math.abs(x) < 0.08 && Math.abs(y) < 0.08) {
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
        x: x * 0.93,
        y: y * 0.93
      };

      inertiaFrameRef.current = requestAnimationFrame(tick);
    };

    inertiaFrameRef.current = requestAnimationFrame(tick);
  };

  const zoomAt = (targetScale: number, originX: number, originY: number, baseTransform = transformRef.current) => {
    if (!viewport.width || !viewport.height || !isFiniteNumber(originX) || !isFiniteNumber(originY)) return;

    const safeBase = sanitizeTransform(baseTransform, transformRef.current);
    const nextScale = clamp(sanitizeNumber(targetScale, safeBase.scale), MIN_SCALE, MAX_SCALE);
    const baseScale = safeBase.scale || 1;
    const worldX = (originX - viewport.width / 2 - safeBase.x) / baseScale;
    const worldY = (originY - viewport.height / 2 - safeBase.y) / baseScale;

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

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const raw = window.sessionStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<{ x: number; y: number; scale: number }>;
      const restored = sanitizeTransform(
        {
          x: sanitizeNumber(parsed.x),
          y: sanitizeNumber(parsed.y),
          scale: sanitizeNumber(parsed.scale, 1)
        },
        { x: 0, y: 0, scale: 1 }
      );
      transformRef.current = restored;
      setTransform(restored);
    } catch {
      // Ignore corrupted persisted canvas state and continue with defaults.
    }
  }, [storageKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const safe = sanitizeTransform(transform, transformRef.current);
      window.sessionStorage.setItem(storageKey, JSON.stringify(safe));
    } catch {
      // Ignore storage quota and privacy mode errors.
    }
  }, [storageKey, transform]);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    stopInertia();
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointersRef.current.size === 1) {
      const target = event.target as HTMLElement;
      const cardId = target.closest<HTMLElement>("[data-canvas-card-id]")?.dataset.canvasCardId ?? null;

      dragStateRef.current = {
        active: false,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        lastX: event.clientX,
        lastY: event.clientY,
        cardId
      };
      lastDragSampleRef.current = {
        x: event.clientX,
        y: event.clientY,
        time: performance.now()
      };
      velocityRef.current = { x: 0, y: 0 };
      setDragging(false);
    } else if (pointersRef.current.size === 2) {
      dragStateRef.current.active = false;
      dragStateRef.current.cardId = null;
      dragStateRef.current.pointerId = null;
      setDragging(false);

      const [first, second] = [...pointersRef.current.values()];
      const pinchMidpoint = midpoint(first, second);
      const current = transformRef.current;
      pinchRef.current = {
        distance: Math.max(1, distance(first, second)),
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
      const nextDistance = Math.max(1, distance(first, second));
      const nextScale = pinchRef.current.scale * (nextDistance / Math.max(1, pinchRef.current.distance));
      const clampedScale = clamp(nextScale, MIN_SCALE, MAX_SCALE);

      commitTransform({
        scale: clampedScale,
        x: pinchMidpoint.x - viewport.width / 2 - pinchRef.current.worldX * clampedScale,
        y: pinchMidpoint.y - viewport.height / 2 - pinchRef.current.worldY * clampedScale
      });
      return;
    }

    if (dragStateRef.current.pointerId !== event.pointerId) return;

    const totalMove = Math.hypot(event.clientX - dragStateRef.current.startX, event.clientY - dragStateRef.current.startY);
    if (!dragStateRef.current.active && totalMove < DRAG_THRESHOLD) {
      return;
    }

    if (!dragStateRef.current.active) {
      dragStateRef.current.active = true;
      dragStateRef.current.cardId = null;
      setDragging(true);
      lastDragSampleRef.current = {
        x: dragStateRef.current.lastX,
        y: dragStateRef.current.lastY,
        time: performance.now()
      };
    }

    const deltaX = sanitizeNumber(event.clientX - dragStateRef.current.lastX);
    const deltaY = sanitizeNumber(event.clientY - dragStateRef.current.lastY);
    const current = transformRef.current;

    commitTransform({
      ...current,
      x: current.x + deltaX,
      y: current.y + deltaY
    });

    dragStateRef.current.lastX = event.clientX;
    dragStateRef.current.lastY = event.clientY;

    const now = performance.now();
    if (lastDragSampleRef.current) {
      const elapsed = Math.max(16, now - lastDragSampleRef.current.time);
      velocityRef.current = {
        x: sanitizeNumber(((event.clientX - lastDragSampleRef.current.x) / elapsed) * 16),
        y: sanitizeNumber(((event.clientY - lastDragSampleRef.current.y) / elapsed) * 16)
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
      const wasDrag = dragStateRef.current.active;
      const tappedCardId = !wasDrag ? dragStateRef.current.cardId : null;

      dragStateRef.current.active = false;
      dragStateRef.current.pointerId = null;
      dragStateRef.current.cardId = null;
      setDragging(false);

      if (wasDrag) {
        startInertia();
      } else if (tappedCardId) {
        const card = cardsById.get(tappedCardId);
        if (card) onOpenCard(card);
      }
    }
  };

  const onWheel = (event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    stopInertia();

    const rect = viewportRef.current?.getBoundingClientRect();
    if (!rect) return;

    const originX = sanitizeNumber(event.clientX - rect.left);
    const originY = sanitizeNumber(event.clientY - rect.top);

    const isTrackpadPan = !event.ctrlKey && (Math.abs(event.deltaX) > 0 || Math.abs(event.deltaY) < 18);
    if (isTrackpadPan) {
      const current = transformRef.current;
      commitTransform({
        ...current,
        x: current.x - sanitizeNumber(event.deltaX),
        y: current.y - sanitizeNumber(event.deltaY)
      });
      return;
    }

    const zoomFactor = Math.exp(-sanitizeNumber(event.deltaY) * 0.00125);
    zoomAt(transformRef.current.scale * zoomFactor, originX, originY);
  };

  const safeTransform = useMemo(() => sanitizeTransform(transform, transformRef.current), [transform]);

  const screenCards = useMemo(() => {
    return layout.cards.map((item) => {
      const left = viewport.width / 2 + safeTransform.x + item.x * safeTransform.scale;
      const top = viewport.height / 2 + safeTransform.y + item.y * safeTransform.scale;
      const projectedWidth = CARD_WIDTH * safeTransform.scale;
      const projectedHeight = CARD_HEIGHT * safeTransform.scale;
      const centerX = left + projectedWidth / 2;
      const centerY = top + projectedHeight / 2;
      const visible =
        left <= viewport.width + CULL_MARGIN &&
        top <= viewport.height + CULL_MARGIN &&
        left + projectedWidth >= -CULL_MARGIN &&
        top + projectedHeight >= -CULL_MARGIN &&
        projectedWidth >= MIN_CARD_RENDER_WIDTH &&
        projectedHeight >= MIN_CARD_RENDER_HEIGHT;
      const renderMode = projectedWidth < COMPACT_CARD_WIDTH ? "minimal" : projectedWidth < FULL_CARD_WIDTH ? "compact" : "full";

      return {
        id: item.id,
        distance: sanitizeNumber(Math.hypot(centerX - viewport.width / 2, centerY - viewport.height / 2), Number.POSITIVE_INFINITY),
        projectedWidth,
        projectedHeight,
        visible,
        renderMode
      };
    });
  }, [layout.cards, transform, viewport.height, viewport.width]);

  const dominantFocusCandidate = useMemo(() => {
    const focusableCards = screenCards.filter((item) => item.visible && item.renderMode !== "minimal");
    if (!focusableCards.length || safeTransform.scale < FOCUS_MIN_SCALE) return null;
    return focusableCards.reduce((nearest, item) => (item.distance < nearest.distance ? item : nearest), focusableCards[0]);
  }, [safeTransform.scale, screenCards]);

  useEffect(() => {
    if (!screenCards.length || !dominantFocusCandidate) {
      focusedCardIdRef.current = null;
      setFocusedCardId(null);
      return;
    }

    const current = focusedCardIdRef.current ? screenCards.find((item) => item.id === focusedCardIdRef.current) : null;
    const focusRadius = Math.max(280, Math.min(viewport.width || 0, viewport.height || 0) * 0.44);

    let nextId = dominantFocusCandidate.id;
    if (current && current.id !== dominantFocusCandidate.id) {
      const nearestClearlyBetter = dominantFocusCandidate.distance + 72 < current.distance;
      const currentStillRelevant = current.distance < focusRadius * 1.18;
      if (!nearestClearlyBetter && currentStillRelevant) {
        nextId = current.id;
      }
    }

    if (focusedCardIdRef.current !== nextId) {
      focusedCardIdRef.current = nextId;
      setFocusedCardId(nextId);
    }
  }, [dominantFocusCandidate, screenCards, viewport.height, viewport.width]);

  const cardsWithFocus = useMemo(() => {
    const dominantCard = screenCards.find((item) => item.id === focusedCardId) ?? dominantFocusCandidate ?? null;
    const focusRadius = Math.max(280, Math.min(viewport.width || 0, viewport.height || 0) * 0.44);
    const focusStrength = dominantCard ? Math.max(0, 1 - sanitizeNumber(dominantCard.distance) / focusRadius) : 0;

    return layout.cards.map((item, index) => {
      const metrics = screenCards.find((screenCard) => screenCard.id === item.id);
      const isFocused = item.id === focusedCardId;
      const intensity = isFocused ? focusStrength : 0;
      const renderMode = metrics?.renderMode ?? "full";
      const isVisible = metrics?.visible ?? false;

      return {
        ...item,
        focusScale: isFocused ? 1 + intensity * 0.1 : 1,
        focusOpacity: isFocused ? 0.96 + intensity * 0.04 : 0.84,
        focusBrightness: isFocused ? 1.02 + intensity * 0.16 : 0.92,
        focusGlow: isFocused ? 0.24 + intensity * 0.26 : 0.07,
        zIndex: isFocused ? 40 : 10 + (index % 6),
        renderMode,
        isVisible
      };
    });
  }, [dominantFocusCandidate, focusedCardId, layout.cards, screenCards, viewport.height, viewport.width]);

  const gridOffsetX = wrapOffset(safeTransform.x * 0.18, WORLD_GRID_SIZE);
  const gridOffsetY = wrapOffset(safeTransform.y * 0.18, WORLD_GRID_SIZE);
  const glowOffsetX = wrapOffset(safeTransform.x * 0.05, GLOW_FIELD_SIZE);
  const glowOffsetY = wrapOffset(safeTransform.y * 0.05, GLOW_FIELD_SIZE);

  return (
    <div className="relative">
      <div
        ref={viewportRef}
        className="relative h-[calc(100vh-12.5rem)] min-h-[640px] overflow-hidden touch-none sm:h-[calc(100vh-13.5rem)]"
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
            "radial-gradient(circle at 50% 46%, color-mix(in srgb, var(--theme-glow) 18%, transparent), transparent 24%), radial-gradient(circle at 50% 78%, color-mix(in srgb, var(--theme-glow-soft) 16%, transparent), transparent 30%), linear-gradient(180deg, rgba(10, 4, 8, .22), rgba(6, 2, 6, .44))"
        }}
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, color-mix(in srgb, var(--theme-text) 12%, transparent) 1px, transparent 0), radial-gradient(circle at 22% 28%, color-mix(in srgb, var(--theme-glow) 18%, transparent), transparent 26%), radial-gradient(circle at 76% 72%, color-mix(in srgb, var(--theme-accent) 12%, transparent), transparent 30%)",
            backgroundSize: `${WORLD_GRID_SIZE}px ${WORLD_GRID_SIZE}px, ${GLOW_FIELD_SIZE}px ${GLOW_FIELD_SIZE}px, 1600px 1600px`,
            backgroundPosition: `${gridOffsetX}px ${gridOffsetY}px, ${glowOffsetX}px ${glowOffsetY}px, ${wrapOffset(safeTransform.x * 0.035 + 380, 1600)}px ${wrapOffset(safeTransform.y * 0.035 + 540, 1600)}px`,
            opacity: 0.82
          }}
        />

        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between px-4 pt-4 sm:px-6 sm:pt-5">
          <div
            className="rounded-full border px-4 py-2 text-[11px] uppercase tracking-[0.22em] backdrop-blur-xl"
            style={{
              borderColor: "var(--theme-border-soft)",
              background: "color-mix(in srgb, var(--theme-surface) 78%, transparent)",
              color: "var(--theme-label)",
              boxShadow: "0 0 0 1px rgba(255,255,255,.02) inset, 0 16px 50px rgba(0,0,0,.18)"
            }}
          >
            Infinite canvas
          </div>

          <div
            className="rounded-full border px-4 py-2 text-[11px] uppercase tracking-[0.22em] backdrop-blur-xl"
            style={{
              borderColor: "var(--theme-border-soft)",
              background: "color-mix(in srgb, var(--theme-surface) 78%, transparent)",
              color: "var(--theme-text-muted)"
            }}
          >
            {Math.round(transform.scale * 100)}%
          </div>
        </div>

        <div
          className="absolute left-0 top-0"
          style={{
            transform: `translate3d(${viewport.width / 2 + safeTransform.x}px, ${viewport.height / 2 + safeTransform.y}px, 0) scale(${safeTransform.scale})`,
            transformOrigin: "0 0",
            willChange: dragging ? "transform" : "auto"
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
                background: "color-mix(in srgb, var(--theme-surface-soft) 90%, transparent)",
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

          {cardsWithFocus.filter((item) => item.isVisible).map((item, index) => (
            <div
              key={item.id}
              role="button"
              tabIndex={0}
              data-canvas-card-id={item.id}
              onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onOpenCard(item.card);
                }
              }}
              className="absolute select-none overflow-hidden rounded-[28px] border text-left transition-[opacity,filter,box-shadow,border-color,transform] duration-300 ease-out"
              style={{
                width: CARD_WIDTH,
                height: CARD_HEIGHT,
                zIndex: item.zIndex,
                transform: `translate3d(${item.x}px, ${item.y}px, 0) scale(${item.focusScale})`,
                transformOrigin: "center center",
                borderColor: `${item.sectionColor}${item.focusOpacity > 0.9 ? "4a" : "30"}`,
                opacity: item.focusOpacity,
                filter: item.renderMode === "minimal" ? "none" : `brightness(${item.focusBrightness}) saturate(${1 + item.focusGlow * 0.18})`,
                background: "var(--theme-card-bg)",
                boxShadow:
                  item.renderMode === "minimal"
                    ? `0 10px 28px rgba(0,0,0,.18), 0 0 0 1px rgba(255,255,255,.03) inset`
                    : index < 8
                    ? `var(--theme-shadow-lift), 0 0 38px color-mix(in srgb, ${item.sectionColor} ${Math.round(item.focusGlow * 100)}%, transparent)`
                    : `var(--theme-shadow-lift), 0 0 24px color-mix(in srgb, ${item.sectionColor} ${Math.round(item.focusGlow * 70)}%, transparent)`,
                contain: "layout paint style"
              }}
            >
              {item.renderMode === "minimal" ? (
                <div className="pointer-events-none flex h-full flex-col justify-between p-3">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.sectionColor, boxShadow: `0 0 12px ${item.sectionColor}` }} />
                  <div className="rounded-2xl border px-3 py-2 text-[10px] uppercase tracking-[0.18em]" style={{ borderColor: "var(--theme-border-soft)", color: "var(--theme-label)" }}>
                    {item.card.type?.title ?? "Card"}
                  </div>
                </div>
              ) : (
                <>
                  {item.renderMode === "full" ? (
                    <div className="pointer-events-none p-3">
                      <ImagePreview
                        src={item.card.thumbnail_url}
                        alt={item.card.title}
                        aspectRatio="custom"
                        heightPx={176}
                        cropMode={item.card.crop_mode}
                        fetchPriority={index < 4 ? "high" : "auto"}
                      />
                    </div>
                  ) : (
                    <div
                      className="pointer-events-none mx-3 mt-3 h-[132px] rounded-[24px] border"
                      style={{
                        borderColor: "var(--theme-border-soft)",
                        background: `linear-gradient(135deg, color-mix(in srgb, ${item.sectionColor} 22%, transparent), color-mix(in srgb, var(--theme-surface-soft) 94%, transparent))`
                      }}
                    />
                  )}

                  <div className="pointer-events-none flex h-[172px] flex-col justify-between border-t px-4 py-3" style={{ borderColor: "var(--theme-border-soft)" }}>
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        {item.renderMode === "full" ? (
                          <>
                            <TypeBadge type={item.card.type} />
                            <StatusBadge status={item.card.status} />
                            {item.card.project_key === "mena" ? (
                              <Badge style={{ background: "color-mix(in srgb, var(--theme-accent) 14%, transparent)", color: "var(--theme-text)" }}>
                                Mena
                              </Badge>
                            ) : null}
                          </>
                        ) : (
                          <span className="text-[11px] uppercase tracking-[0.18em]" style={{ color: "var(--theme-label)" }}>
                            {item.card.type?.title ?? "Card"}
                          </span>
                        )}
                      </div>

                      <div>
                        <h3 className="text-sm font-semibold leading-6" style={{ color: "var(--theme-text)" }}>
                          {item.card.title}
                        </h3>
                        {item.renderMode === "full" && item.card.subtitle ? (
                          <p className="mt-1 max-h-10 overflow-hidden text-xs leading-5" style={{ color: "var(--theme-text-muted)" }}>
                            {item.card.subtitle}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        <div className="pointer-events-none absolute bottom-4 left-4 right-4 z-20 flex justify-between text-[11px] uppercase tracking-[0.18em] sm:bottom-5 sm:left-6 sm:right-6">
          <span style={{ color: "var(--theme-label)" }}>Drag anywhere to explore</span>
          <span style={{ color: "var(--theme-label)" }}>Pinch or wheel to zoom</span>
        </div>
      </div>
    </div>
  );
}
