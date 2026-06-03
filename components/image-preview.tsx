"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { resolveCardPreviewUrl } from "@/lib/dropbox-links";
import { enqueueImage, isImageLoaded, markImageLoaded, subscribeToImage } from "@/lib/image-cache";
import { CardAspectRatio, CardCropMode } from "@/lib/types";

function ratioClass(ratio: CardAspectRatio) {
  switch (ratio) {
    case "9:16":
      return "aspect-[9/16]";
    case "16:9":
      return "aspect-[16/9]";
    case "1:1":
      return "aspect-square";
    case "4:5":
      return "aspect-[4/5]";
    default:
      return "aspect-[4/3]";
  }
}

export function ImagePreview({
  src,
  alt,
  aspectRatio,
  heightPx,
  cropMode,
  fetchPriority = "auto",
  className
}: {
  src?: string | null;
  alt: string;
  aspectRatio: CardAspectRatio;
  heightPx: number;
  cropMode: CardCropMode;
  fetchPriority?: "high" | "auto" | "low";
  className?: string;
}) {
  const customHeight = Math.min(heightPx, 360);
  const previewHeight = Math.min(heightPx, 280);
  const resolvedSrc = useMemo(() => resolveCardPreviewUrl(src), [src]);
  const [currentSrc, setCurrentSrc] = useState(resolvedSrc);
  const [loaded, setLoaded] = useState(() => isImageLoaded(resolvedSrc));
  const style =
    aspectRatio === "custom"
      ? {
          height: customHeight,
          borderColor: "var(--theme-border-soft)",
          background: "var(--theme-image-bg)",
          boxShadow: "inset 0 0 0 1px color-mix(in srgb, var(--theme-border-soft) 60%, transparent)"
        }
      : {
          minHeight: previewHeight,
          borderColor: "var(--theme-border-soft)",
          background: "var(--theme-image-bg)",
          boxShadow: "inset 0 0 0 1px color-mix(in srgb, var(--theme-border-soft) 60%, transparent)"
        };

  useEffect(() => {
    setCurrentSrc(resolvedSrc);
  }, [resolvedSrc]);

  useEffect(() => {
    if (!currentSrc) {
      setLoaded(false);
      return;
    }

    if (isImageLoaded(currentSrc)) {
      setLoaded(true);
      return;
    }

    setLoaded(false);
    enqueueImage(currentSrc, { priority: fetchPriority, concurrency: fetchPriority === "high" ? 8 : 6 });

    return subscribeToImage(currentSrc, () => {
      if (isImageLoaded(currentSrc)) {
        setLoaded(true);
      }
    });
  }, [currentSrc, fetchPriority]);

  return (
    <div className={cn("relative w-full overflow-hidden rounded-3xl border", ratioClass(aspectRatio), className)} style={style}>
      {currentSrc ? (
        <>
          <div
            className={cn(
              "absolute inset-0 animate-pulse transition duration-500",
              loaded ? "opacity-0" : "opacity-100"
            )}
            style={{
              background:
                "linear-gradient(135deg, color-mix(in srgb, var(--theme-surface-soft) 72%, transparent), color-mix(in srgb, var(--theme-surface-strong) 88%, transparent))"
            }}
          />
          <img
            src={currentSrc}
            alt={alt}
            draggable={false}
            loading={fetchPriority === "high" ? "eager" : "lazy"}
            fetchPriority={fetchPriority}
            decoding="async"
            onLoad={() => {
              markImageLoaded(currentSrc);
              setLoaded(true);
            }}
            onError={() => {
              if (src && currentSrc !== src) {
                setLoaded(isImageLoaded(src));
                setCurrentSrc(src);
                return;
              }
              setLoaded(true);
            }}
            className={cn(
              "absolute inset-0 h-full w-full transition duration-500",
              cropMode === "contain" ? "object-contain" : "object-cover",
              loaded ? "opacity-100" : "opacity-0"
            )}
            style={cropMode === "contain" ? { background: "var(--theme-image-inner-bg)" } : undefined}
          />
        </>
      ) : (
        <div className="flex h-full items-center justify-center text-sm" style={{ color: "var(--theme-text-muted)" }}>
          Нет превью
        </div>
      )}
    </div>
  );
}
