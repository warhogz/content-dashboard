"use client";

const DEFAULT_MAX_DIMENSION = 1600;
const DEFAULT_QUALITY = 0.82;

const OPTIMIZABLE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/bmp"
]);

type OptimizeOptions = {
  maxDimension?: number;
  quality?: number;
};

export type OptimizedImageResult = {
  file: File;
  originalSize: number;
  optimizedSize: number;
  changed: boolean;
};

function extensionFromMimeType(type: string) {
  switch (type) {
    case "image/webp":
      return "webp";
    case "image/png":
      return "png";
    case "image/jpeg":
      return "jpg";
    case "image/avif":
      return "avif";
    default:
      return "jpg";
  }
}

function isOptimizableImage(file: File) {
  if (file.type === "image/svg+xml") return false;
  if (file.type === "image/gif") return false;
  return OPTIMIZABLE_TYPES.has(file.type);
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not read image"));
    };

    image.src = objectUrl;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number) {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}

export async function optimizeImageForUpload(file: File, options: OptimizeOptions = {}): Promise<OptimizedImageResult> {
  const originalSize = file.size;

  if (!isOptimizableImage(file)) {
    return {
      file,
      originalSize,
      optimizedSize: originalSize,
      changed: false
    };
  }

  const maxDimension = options.maxDimension ?? DEFAULT_MAX_DIMENSION;
  const quality = options.quality ?? DEFAULT_QUALITY;

  const image = await loadImage(file);
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  const scale = Math.min(1, maxDimension / Math.max(sourceWidth, sourceHeight));
  const targetWidth = Math.max(1, Math.round(sourceWidth * scale));
  const targetHeight = Math.max(1, Math.round(sourceHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const context = canvas.getContext("2d", { alpha: true });
  if (!context) {
    return {
      file,
      originalSize,
      optimizedSize: originalSize,
      changed: false
    };
  }

  context.drawImage(image, 0, 0, targetWidth, targetHeight);

  const preferredType = "image/webp";
  const fallbackType = file.type === "image/png" ? "image/png" : "image/jpeg";

  const optimizedBlob =
    (await canvasToBlob(canvas, preferredType, quality)) ??
    (await canvasToBlob(canvas, fallbackType, quality));

  if (!optimizedBlob) {
    return {
      file,
      originalSize,
      optimizedSize: originalSize,
      changed: false
    };
  }

  const outputType = optimizedBlob.type || fallbackType;
  const optimizedFile = new File(
    [optimizedBlob],
    `${file.name.replace(/\.[^.]+$/, "")}.${extensionFromMimeType(outputType)}`,
    {
      type: outputType,
      lastModified: Date.now()
    }
  );

  if (optimizedFile.size >= file.size && scale === 1) {
    return {
      file,
      originalSize,
      optimizedSize: originalSize,
      changed: false
    };
  }

  return {
    file: optimizedFile,
    originalSize,
    optimizedSize: optimizedFile.size,
    changed: true
  };
}
