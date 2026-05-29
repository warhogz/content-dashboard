import { cn } from "@/lib/utils";
import { CardAspectRatio, CardCropMode } from "@/lib/types";

function ratioClass(ratio: CardAspectRatio) {
  switch (ratio) {
    case "9:16": return "aspect-[9/16]";
    case "16:9": return "aspect-[16/9]";
    case "1:1": return "aspect-square";
    case "4:5": return "aspect-[4/5]";
    default: return "aspect-[4/3]";
  }
}

export function ImagePreview({ src, alt, aspectRatio, heightPx, cropMode }: { src?: string | null; alt: string; aspectRatio: CardAspectRatio; heightPx: number; cropMode: CardCropMode; }) {
  const customHeight = Math.min(heightPx, 360);
  const previewHeight = Math.min(heightPx, 280);

  return (
    <div className={cn("relative w-full overflow-hidden rounded-3xl border border-white/10 bg-[#2a0d18]", ratioClass(aspectRatio))} style={aspectRatio === "custom" ? { height: customHeight } : { minHeight: previewHeight }}>
      {src ? (
        <img src={src} alt={alt} className={cn("absolute inset-0 h-full w-full", cropMode === "contain" ? "object-contain bg-[#1a0811]" : "object-cover")} />
      ) : (
        <div className="flex h-full items-center justify-center text-sm text-white/35">Нет превью</div>
      )}
    </div>
  );
}
