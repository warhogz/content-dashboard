import { cn } from "@/lib/utils";
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
  cropMode
}: {
  src?: string | null;
  alt: string;
  aspectRatio: CardAspectRatio;
  heightPx: number;
  cropMode: CardCropMode;
}) {
  const customHeight = Math.min(heightPx, 360);
  const previewHeight = Math.min(heightPx, 280);
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

  return (
    <div className={cn("relative w-full overflow-hidden rounded-3xl border", ratioClass(aspectRatio))} style={style}>
      {src ? (
        <img
          src={src}
          alt={alt}
          className={cn("absolute inset-0 h-full w-full", cropMode === "contain" ? "object-contain" : "object-cover")}
          style={cropMode === "contain" ? { background: "var(--theme-image-inner-bg)" } : undefined}
        />
      ) : (
        <div className="flex h-full items-center justify-center text-sm" style={{ color: "var(--theme-text-muted)" }}>
          Нет превью
        </div>
      )}
    </div>
  );
}
