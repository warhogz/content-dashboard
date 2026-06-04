"use client";

import { useEffect, useRef } from "react";
import { Application, Container, Graphics, Point, Sprite, Text, Texture } from "pixi.js";
import { Viewport } from "pixi-viewport";
import { resolveCardPreviewUrl } from "@/lib/dropbox-links";
import { ContentCard } from "@/lib/types";

type CanvasSection = {
  id: string;
  title: string;
  color: string;
  subtitle?: string;
  cards: ContentCard[];
};

type CardNode = {
  card: ContentCard;
  centerX: number;
  centerY: number;
  width: number;
  height: number;
  container: Container;
  frame: Graphics;
  accent: Graphics;
  preview: Sprite | null;
  title: Text;
  meta: Text;
  glow: Graphics;
  scale: number;
};

const CARD_WIDTH = 288;
const CARD_HEIGHT = 392;
const CARD_RADIUS = 28;
const CARD_IMAGE_HEIGHT = 188;
const SECTION_GAP_X = 460;
const SECTION_GAP_Y = 380;
const CARD_GAP_X = 34;
const CARD_GAP_Y = 38;
const SECTION_COLUMNS = 2;
const WORLD_PADDING = 1600;
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 2.4;
const BACKGROUND_COLOR = 0x08050a;

const textureCache = new Map<string, Texture | null>();

function hexToNumber(value: string) {
  const normalized = value.replace("#", "");
  const parsed = Number.parseInt(normalized, 16);
  return Number.isFinite(parsed) ? parsed : 0xc12657;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function sanitize(value: number, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function truncate(value: string | null | undefined, length: number) {
  if (!value) return "";
  return value.length > length ? `${value.slice(0, length - 1)}…` : value;
}

function loadTexture(url?: string | null) {
  if (!url) return Promise.resolve<Texture | null>(null);

  const resolved = resolveCardPreviewUrl(url);
  if (!resolved) return Promise.resolve<Texture | null>(null);

  const cached = textureCache.get(resolved);
  if (cached !== undefined) {
    return Promise.resolve(cached);
  }

  return new Promise<Texture | null>((resolve) => {
    const image = new window.Image();
    image.crossOrigin = "anonymous";
    image.decoding = "async";
    image.loading = "eager";

    image.onload = () => {
      const texture = Texture.from(image);
      textureCache.set(resolved, texture);
      resolve(texture);
    };

    image.onerror = () => {
      textureCache.set(resolved, null);
      resolve(null);
    };

    image.src = resolved;
  });
}

function createCardTexturePlaceholder(color: number) {
  const placeholder = new Graphics();
  placeholder.beginFill(color, 0.14);
  placeholder.drawRoundedRect(0, 0, CARD_WIDTH - 28, CARD_IMAGE_HEIGHT, 22);
  placeholder.endFill();
  placeholder.beginFill(0xffffff, 0.06);
  placeholder.drawRoundedRect(18, 18, CARD_WIDTH - 64, 18, 9);
  placeholder.drawRoundedRect(18, 48, CARD_WIDTH - 120, 14, 7);
  placeholder.endFill();
  return placeholder;
}

function buildLayout(sections: CanvasSection[]) {
  const cards: Array<{ card: ContentCard; color: number; centerX: number; centerY: number }> = [];
  const labels: Array<{ title: string; subtitle: string; color: number; x: number; y: number; width: number }> = [];

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (let sectionIndex = 0; sectionIndex < sections.length; sectionIndex += 1) {
    const section = sections[sectionIndex];
    const color = hexToNumber(section.color);
    const sectionColumn = sectionIndex % SECTION_COLUMNS;
    const sectionRow = Math.floor(sectionIndex / SECTION_COLUMNS);
    const sectionX = sectionColumn * SECTION_GAP_X;
    const sectionY = sectionRow * SECTION_GAP_Y;
    const columns = Math.min(4, Math.max(2, Math.ceil(Math.sqrt(Math.max(section.cards.length, 1)))));

    labels.push({
      title: section.title,
      subtitle: section.subtitle || `${section.cards.length} карточек`,
      color,
      x: sectionX,
      y: sectionY,
      width: columns * CARD_WIDTH + Math.max(0, columns - 1) * CARD_GAP_X
    });

    section.cards.forEach((card, cardIndex) => {
      const column = cardIndex % columns;
      const row = Math.floor(cardIndex / columns);
      const x = sectionX + column * (CARD_WIDTH + CARD_GAP_X);
      const y = sectionY + 94 + row * (CARD_HEIGHT + CARD_GAP_Y);
      const centerX = x + CARD_WIDTH / 2;
      const centerY = y + CARD_HEIGHT / 2;

      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + CARD_WIDTH);
      maxY = Math.max(maxY, y + CARD_HEIGHT);

      cards.push({
        card,
        color,
        centerX,
        centerY
      });
    });
  }

  if (!cards.length) {
    return {
      cards: [],
      labels: [],
      worldWidth: 4200,
      worldHeight: 3200,
      center: new Point(2100, 1600)
    };
  }

  const contentWidth = maxX - minX;
  const contentHeight = maxY - minY;
  const offsetX = WORLD_PADDING - minX;
  const offsetY = WORLD_PADDING - minY;
  const worldWidth = Math.max(contentWidth + WORLD_PADDING * 2, 7600);
  const worldHeight = Math.max(contentHeight + WORLD_PADDING * 2, 5600);

  return {
    cards: cards.map((item) => ({
      ...item,
      centerX: item.centerX + offsetX,
      centerY: item.centerY + offsetY
    })),
    labels: labels.map((label) => ({
      ...label,
      x: label.x + offsetX,
      y: label.y + offsetY
    })),
    worldWidth,
    worldHeight,
    center: new Point(worldWidth / 2, worldHeight / 2)
  };
}

function createSectionLabel(title: string, subtitle: string, color: number, width: number) {
  const container = new Container();
  const plate = new Graphics();
  plate.lineStyle(1, color, 0.3);
  plate.beginFill(0x1a0b12, 0.76);
  plate.drawRoundedRect(0, 0, width, 72, 24);
  plate.endFill();
  container.addChild(plate);

  const dot = new Graphics();
  dot.beginFill(color, 1);
  dot.drawCircle(0, 0, 6);
  dot.endFill();
  dot.position.set(22, 24);
  container.addChild(dot);

  const titleText = new Text({
    text: title,
    style: {
      fontFamily: "Inter, sans-serif",
      fontSize: 24,
      fontWeight: "600",
      fill: 0xfff8fb
    }
  });
  titleText.position.set(40, 12);
  container.addChild(titleText);

  const subtitleText = new Text({
    text: subtitle,
    style: {
      fontFamily: "Inter, sans-serif",
      fontSize: 14,
      fill: 0xd9c1cb
    }
  });
  subtitleText.alpha = 0.86;
  subtitleText.position.set(18, 42);
  container.addChild(subtitleText);

  return container;
}

function createCardNode(item: { card: ContentCard; color: number; centerX: number; centerY: number }, texture: Texture | null) {
  const container = new Container();
  container.position.set(item.centerX, item.centerY);
  container.pivot.set(CARD_WIDTH / 2, CARD_HEIGHT / 2);

  const glow = new Graphics();
  glow.beginFill(item.color, 0.12);
  glow.drawRoundedRect(-8, -8, CARD_WIDTH + 16, CARD_HEIGHT + 16, CARD_RADIUS + 6);
  glow.endFill();
  glow.alpha = 0.14;
  container.addChild(glow);

  const frame = new Graphics();
  frame.lineStyle(1, item.color, 0.24);
  frame.beginFill(0x14080f, 0.94);
  frame.drawRoundedRect(0, 0, CARD_WIDTH, CARD_HEIGHT, CARD_RADIUS);
  frame.endFill();
  container.addChild(frame);

  const previewMask = new Graphics();
  previewMask.beginFill(0xffffff, 1);
  previewMask.drawRoundedRect(14, 14, CARD_WIDTH - 28, CARD_IMAGE_HEIGHT, 22);
  previewMask.endFill();
  container.addChild(previewMask);

  let preview: Sprite | null = null;
  if (texture) {
    preview = new Sprite(texture);
    preview.position.set(14, 14);
    const scale = Math.max((CARD_WIDTH - 28) / Math.max(texture.width, 1), CARD_IMAGE_HEIGHT / Math.max(texture.height, 1));
    preview.scale.set(scale);
    preview.x = 14 + ((CARD_WIDTH - 28) - texture.width * scale) / 2;
    preview.y = 14 + (CARD_IMAGE_HEIGHT - texture.height * scale) / 2;
    preview.mask = previewMask;
    container.addChild(preview);
  } else {
    const placeholder = createCardTexturePlaceholder(item.color);
    placeholder.position.set(14, 14);
    placeholder.mask = previewMask;
    container.addChild(placeholder);
  }

  const divider = new Graphics();
  divider.lineStyle(1, 0xffffff, 0.06);
  divider.moveTo(0, CARD_IMAGE_HEIGHT + 30);
  divider.lineTo(CARD_WIDTH, CARD_IMAGE_HEIGHT + 30);
  container.addChild(divider);

  const accent = new Graphics();
  accent.lineStyle(2, item.color, 0.9);
  accent.drawRoundedRect(-2, -2, CARD_WIDTH + 4, CARD_HEIGHT + 4, CARD_RADIUS + 2);
  accent.alpha = 0.2;
  container.addChild(accent);

  const meta = new Text({
    text: `${item.card.type?.title ?? "Card"} • ${item.card.status?.title ?? ""}`.trim(),
    style: {
      fontFamily: "Inter, sans-serif",
      fontSize: 12,
      fontWeight: "600",
      fill: item.color
    }
  });
  meta.position.set(18, CARD_IMAGE_HEIGHT + 48);
  container.addChild(meta);

  const title = new Text({
    text: truncate(item.card.title, 54),
    style: {
      fontFamily: "Inter, sans-serif",
      fontSize: 18,
      fontWeight: "600",
      fill: 0xfff8fb,
      wordWrap: true,
      wordWrapWidth: CARD_WIDTH - 36,
      breakWords: true
    }
  });
  title.position.set(18, CARD_IMAGE_HEIGHT + 72);
  container.addChild(title);

  const subtitleText = new Text({
    text: truncate(item.card.subtitle, 96),
    style: {
      fontFamily: "Inter, sans-serif",
      fontSize: 13,
      fill: 0xd5bfc8,
      wordWrap: true,
      wordWrapWidth: CARD_WIDTH - 36,
      breakWords: true
    }
  });
  subtitleText.alpha = 0.82;
  subtitleText.position.set(18, CARD_IMAGE_HEIGHT + 124);
  container.addChild(subtitleText);

  container.cursor = "pointer";

  return {
    card: item.card,
    centerX: item.centerX,
    centerY: item.centerY,
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    container,
    frame,
    accent,
    preview,
    title,
    meta,
    glow,
    scale: 1
  };
}

function containsPoint(node: CardNode, x: number, y: number) {
  const halfWidth = (node.width * node.scale) / 2;
  const halfHeight = (node.height * node.scale) / 2;

  return x >= node.centerX - halfWidth && x <= node.centerX + halfWidth && y >= node.centerY - halfHeight && y <= node.centerY + halfHeight;
}

export function CanvasV2Engine({
  sections,
  onSelectCard,
  onReadyChange,
  onProgressChange
}: {
  sections: CanvasSection[];
  onSelectCard: (card: ContentCard) => void;
  onReadyChange: (ready: boolean) => void;
  onProgressChange: (value: number) => void;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !sections.length) {
      onReadyChange(false);
      onProgressChange(0);
      return;
    }

    let disposed = false;
    let app: Application | null = null;

    const run = async () => {
      onReadyChange(false);
      onProgressChange(0.05);

      const nextApp = new Application();
      await nextApp.init({
        backgroundAlpha: 0,
        antialias: true,
        autoDensity: true,
        eventMode: "passive",
        preference: "webgl",
        powerPreference: "high-performance",
        resolution: Math.min(window.devicePixelRatio || 1, 1.75),
        resizeTo: host
      });

      if (disposed) {
        nextApp.destroy(true, { children: true });
        return;
      }

      app = nextApp;
      host.innerHTML = "";
      host.appendChild(nextApp.canvas);

      const layout = buildLayout(sections);
      const viewport = new Viewport({
        events: nextApp.renderer.events,
        screenWidth: host.clientWidth,
        screenHeight: host.clientHeight,
        worldWidth: layout.worldWidth,
        worldHeight: layout.worldHeight,
        passiveWheel: false,
        stopPropagation: true
      });

      viewport.eventMode = "static";
      viewport.drag({ mouseButtons: "all", pressDrag: true });
      viewport.pinch();
      viewport.wheel({ smooth: 6, percent: 0.16, trackpadPinch: true });
      viewport.decelerate({ friction: 0.92 });
      viewport.clampZoom({ minScale: MIN_ZOOM, maxScale: MAX_ZOOM });
      nextApp.stage.addChild(viewport);

      const ambience = new Container();
      const backgroundPlate = new Graphics();
      backgroundPlate.beginFill(BACKGROUND_COLOR, 1);
      backgroundPlate.drawRect(0, 0, layout.worldWidth, layout.worldHeight);
      backgroundPlate.endFill();
      ambience.addChild(backgroundPlate);

      const backgroundDots = new Graphics();
      backgroundDots.beginFill(0xffffff, 0.06);
      for (let x = 0; x < layout.worldWidth; x += 42) {
        for (let y = 0; y < layout.worldHeight; y += 42) {
          if ((x + y) % 126 === 0) {
            backgroundDots.drawCircle(x, y, 1.4);
          }
        }
      }
      backgroundDots.endFill();
      ambience.addChild(backgroundDots);

      const glowField = new Graphics();
      glowField.beginFill(0xc12657, 0.06);
      glowField.drawCircle(layout.center.x - 900, layout.center.y - 420, 520);
      glowField.drawCircle(layout.center.x + 740, layout.center.y + 380, 460);
      glowField.endFill();
      ambience.addChild(glowField);
      viewport.addChild(ambience);

      layout.labels.forEach((label) => {
        const container = createSectionLabel(label.title, label.subtitle, label.color, label.width);
        container.position.set(label.x, label.y);
        viewport.addChild(container);
      });

      const world = new Container();
      viewport.addChild(world);

      const textureEntries = await Promise.all(
        layout.cards.map(async (item, index) => {
          const texture = await loadTexture(item.card.thumbnail_url);
          onProgressChange(0.08 + ((index + 1) / Math.max(layout.cards.length, 1)) * 0.78);
          return { item, texture };
        })
      );

      if (disposed || !app) {
        return;
      }

      const cardNodes = textureEntries.map(({ item, texture }) => createCardNode(item, texture));
      cardNodes.forEach((node) => {
        world.addChild(node.container);
      });

      const fitScale = clamp(
        Math.min(
          sanitize(host.clientWidth / Math.max(layout.worldWidth * 0.64, 1), 0.22),
          sanitize(host.clientHeight / Math.max(layout.worldHeight * 0.56, 1), 0.22),
          0.78
        ),
        MIN_ZOOM,
        0.78
      );

      viewport.moveCenter(layout.center);
      viewport.setZoom(fitScale, true);

      const gesture = {
        down: new Point(),
        moved: false
      };

      viewport.on("pointerdown", (event) => {
        gesture.down.copyFrom(event.global);
        gesture.moved = false;
      });

      viewport.on("pointermove", (event) => {
        if (Math.hypot(event.global.x - gesture.down.x, event.global.y - gesture.down.y) > 8) {
          gesture.moved = true;
        }
      });

      viewport.on("clicked", ({ world: worldPoint }) => {
        if (gesture.moved) return;

        const hit = [...cardNodes]
          .reverse()
          .find((node) => containsPoint(node, sanitize(worldPoint.x), sanitize(worldPoint.y)));

        if (hit) {
          onSelectCard(hit.card);
        }
      });

      let focusedId: string | null = null;
      let desiredFocusId: string | null = null;
      const focusRadius = 620;

      const updateFocusTarget = () => {
        const center = viewport.center;
        let nearest: CardNode | null = null;
        let nearestDistance = Number.POSITIVE_INFINITY;

        for (const node of cardNodes) {
          const distance = Math.hypot(node.centerX - center.x, node.centerY - center.y);
          if (distance < nearestDistance) {
            nearestDistance = distance;
            nearest = node;
          }
        }

        if (!nearest) {
          desiredFocusId = null;
          return;
        }

        if (focusedId && focusedId !== nearest.card.id) {
          const current = cardNodes.find((node) => node.card.id === focusedId);
          const currentDistance = current ? Math.hypot(current.centerX - center.x, current.centerY - center.y) : Number.POSITIVE_INFINITY;
          if (currentDistance < nearestDistance + 80 && currentDistance < focusRadius * 1.15) {
            desiredFocusId = focusedId;
            return;
          }
        }

        desiredFocusId = nearest.card.id;
      };

      const resize = () => {
        if (!host || !app) return;
        viewport.resize(host.clientWidth, host.clientHeight, layout.worldWidth, layout.worldHeight);
      };

      const resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(host);

      viewport.on("moved", updateFocusTarget);
      viewport.on("zoomed", updateFocusTarget);
      updateFocusTarget();

      nextApp.ticker.add(() => {
        const center = viewport.center;

        for (const node of cardNodes) {
          const isFocused = node.card.id === desiredFocusId;
          const distance = Math.hypot(node.centerX - center.x, node.centerY - center.y);
          const intensity = isFocused ? Math.max(0, 1 - distance / focusRadius) : 0;
          const targetScale = isFocused ? 1.02 + intensity * 0.08 : 1;
          const nextScale = node.scale + (targetScale - node.scale) * 0.16;

          node.scale = nextScale;
          node.container.scale.set(nextScale);
          node.accent.alpha = isFocused ? 0.42 + intensity * 0.42 : 0.16;
          node.glow.alpha = isFocused ? 0.22 + intensity * 0.38 : 0.12;
        }

        if (desiredFocusId !== focusedId) {
          focusedId = desiredFocusId;
        }
      });

      onProgressChange(1);
      onReadyChange(true);

      return () => {
        resizeObserver.disconnect();
      };
    };

    let cleanup: (() => void) | undefined;
    void run().then((disposeFn) => {
      cleanup = disposeFn;
    });

    return () => {
      disposed = true;
      cleanup?.();
      onReadyChange(false);
      app?.destroy(true, { children: true });
      if (host) {
        host.innerHTML = "";
      }
    };
  }, [onProgressChange, onReadyChange, onSelectCard, sections]);

  return <div ref={hostRef} className="absolute inset-0" />;
}
