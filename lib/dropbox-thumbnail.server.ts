import "server-only";

import { normalizeDropboxSharedLink } from "@/lib/dropbox-links";

const DROPBOX_THUMBNAIL_SIZE = "w480h320";
const DROPBOX_THUMBNAIL_FORMAT = "jpeg";
const DROPBOX_THUMBNAIL_MODE = "bestfit";
const DROPBOX_THUMBNAIL_QUALITY = "quality_70";

function getAccessToken() {
  return process.env.DROPBOX_ACCESS_TOKEN?.trim() || null;
}

type DropboxImageResult = {
  bytes: ArrayBuffer;
  contentType: string;
  cacheControl: string;
};

type DropboxThumbnailVariant = "canvas-512";

function truncate(value: string, maxLength = 500) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength)}...`;
}

function formatError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      cause: error.cause ? String(error.cause) : undefined
    };
  }

  return {
    message: String(error)
  };
}

function getVariantCacheControl(variant?: DropboxThumbnailVariant) {
  if (variant === "canvas-512") {
    return "public, max-age=86400, s-maxage=2592000, stale-while-revalidate=604800";
  }

  return null;
}

async function transformImageVariant(image: DropboxImageResult, variant?: DropboxThumbnailVariant): Promise<DropboxImageResult> {
  if (variant !== "canvas-512") {
    return image;
  }

  try {
    const sharpModule = await import("sharp");
    const sharpFactory = "default" in sharpModule ? sharpModule.default : sharpModule;
    const buffer = Buffer.from(image.bytes);

    const transformed = await sharpFactory(buffer)
      .rotate()
      .resize({
        width: 512,
        height: 512,
        fit: "inside",
        withoutEnlargement: true
      })
      .webp({
        quality: 74,
        effort: 4
      })
      .toBuffer();
    const transformedBytes = Uint8Array.from(transformed).buffer;

    return {
      bytes: transformedBytes,
      contentType: "image/webp",
      cacheControl: getVariantCacheControl(variant) || image.cacheControl
    };
  } catch (error) {
    console.error("Dropbox image transform failed, returning original bytes", {
      variant,
      contentType: image.contentType,
      error: formatError(error)
    });

    return {
      ...image,
      cacheControl: getVariantCacheControl(variant) || image.cacheControl
    };
  }
}

function buildRawDropboxUrl(sharedUrl: string) {
  const normalizedUrl = normalizeDropboxSharedLink(sharedUrl);
  if (!normalizedUrl) {
    return null;
  }

  const url = new URL(normalizedUrl);
  url.searchParams.set("raw", "1");
  return url.toString();
}

async function fetchDropboxRawImage(sharedUrl: string): Promise<DropboxImageResult | null> {
  const rawUrl = buildRawDropboxUrl(sharedUrl);
  if (!rawUrl) {
    console.error("Dropbox raw image URL could not be built", {
      sharedUrl
    });
    return null;
  }

  let response: Response;
  try {
    response = await fetch(rawUrl, {
      method: "GET",
      redirect: "follow",
      cache: "no-store"
    });
  } catch (error) {
    console.error("Dropbox raw image fetch threw", {
      sharedUrl,
      rawUrl,
      error: formatError(error)
    });
    return null;
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    console.error("Dropbox raw image request failed", {
      sharedUrl,
      rawUrl,
      finalUrl: response.url,
      status: response.status,
      statusText: response.statusText,
      contentType: response.headers.get("content-type"),
      errorText: truncate(errorText)
    });
    return null;
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.startsWith("image/")) {
    const bodyPreview = await response.text().catch(() => "");
    console.error("Dropbox raw image returned non-image content", {
      sharedUrl,
      rawUrl,
      finalUrl: response.url,
      status: response.status,
      statusText: response.statusText,
      contentType,
      bodyPreview: truncate(bodyPreview)
    });
    return null;
  }

  let bytes: ArrayBuffer;
  try {
    bytes = await response.arrayBuffer();
  } catch (error) {
    console.error("Dropbox raw image buffer conversion failed", {
      sharedUrl,
      rawUrl,
      finalUrl: response.url,
      contentType,
      error: formatError(error)
    });
    return null;
  }

  return {
    bytes,
    contentType,
    cacheControl: response.headers.get("cache-control") || "public, max-age=86400, stale-while-revalidate=604800"
  };
}

export async function fetchDropboxThumbnail(sharedUrl: string): Promise<DropboxImageResult | null> {
  return fetchDropboxThumbnailVariant(sharedUrl);
}

export async function fetchDropboxThumbnailVariant(sharedUrl: string, variant?: DropboxThumbnailVariant): Promise<DropboxImageResult | null> {
  const normalizedUrl = normalizeDropboxSharedLink(sharedUrl);
  const accessToken = getAccessToken();

  if (!normalizedUrl) {
    console.error("Dropbox shared link could not be normalized", {
      sharedUrl
    });
    return null;
  }

  if (!accessToken) {
    console.error("Dropbox access token is missing, using raw image fallback", {
      sharedUrl,
      normalizedUrl
    });
    const fallbackImage = await fetchDropboxRawImage(sharedUrl);
    return fallbackImage ? transformImageVariant(fallbackImage, variant) : null;
  }

  let response: Response;
  try {
    response = await fetch("https://content.dropboxapi.com/2/files/get_thumbnail_v2", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Dropbox-API-Arg": JSON.stringify({
          resource: {
            ".tag": "link",
            url: normalizedUrl
          },
          format: DROPBOX_THUMBNAIL_FORMAT,
          size: DROPBOX_THUMBNAIL_SIZE,
          mode: DROPBOX_THUMBNAIL_MODE,
          quality: DROPBOX_THUMBNAIL_QUALITY
        })
      },
      cache: "no-store"
    });
  } catch (error) {
    console.error("Dropbox thumbnail fetch threw", {
      sharedUrl,
      normalizedUrl,
      error: formatError(error)
    });
    const fallbackImage = await fetchDropboxRawImage(sharedUrl);
    return fallbackImage ? transformImageVariant(fallbackImage, variant) : null;
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    console.error("Dropbox thumbnail request failed", {
      sharedUrl,
      normalizedUrl,
      status: response.status,
      statusText: response.statusText,
      contentType: response.headers.get("content-type"),
      errorText: truncate(errorText)
    });
    const fallbackImage = await fetchDropboxRawImage(sharedUrl);
    return fallbackImage ? transformImageVariant(fallbackImage, variant) : null;
  }

  let bytes: ArrayBuffer;
  try {
    bytes = await response.arrayBuffer();
  } catch (error) {
    console.error("Dropbox thumbnail buffer conversion failed", {
      sharedUrl,
      normalizedUrl,
      contentType: response.headers.get("content-type"),
      error: formatError(error)
    });
    const fallbackImage = await fetchDropboxRawImage(sharedUrl);
    return fallbackImage ? transformImageVariant(fallbackImage, variant) : null;
  }

  return transformImageVariant({
    bytes,
    contentType: response.headers.get("content-type") || "image/jpeg",
    cacheControl: response.headers.get("cache-control") || "public, max-age=86400, stale-while-revalidate=604800"
  }, variant);
}
