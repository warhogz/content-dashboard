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
    return null;
  }

  const response = await fetch(rawUrl, {
    method: "GET",
    redirect: "follow",
    cache: "no-store"
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    console.error("Dropbox raw image request failed", {
      status: response.status,
      statusText: response.statusText,
      errorText
    });
    return null;
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.startsWith("image/")) {
    console.error("Dropbox raw image returned non-image content", {
      status: response.status,
      contentType
    });
    return null;
  }

  const bytes = await response.arrayBuffer();
  return {
    bytes,
    contentType,
    cacheControl: response.headers.get("cache-control") || "public, max-age=86400, stale-while-revalidate=604800"
  };
}

export async function fetchDropboxThumbnail(sharedUrl: string): Promise<DropboxImageResult | null> {
  const normalizedUrl = normalizeDropboxSharedLink(sharedUrl);
  const accessToken = getAccessToken();

  if (!normalizedUrl) {
    return null;
  }

  if (!accessToken) {
    return fetchDropboxRawImage(sharedUrl);
  }

  const response = await fetch("https://content.dropboxapi.com/2/files/get_thumbnail_v2", {
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

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    console.error("Dropbox thumbnail request failed", {
      status: response.status,
      statusText: response.statusText,
      errorText
    });
    return fetchDropboxRawImage(sharedUrl);
  }

  const bytes = await response.arrayBuffer();
  return {
    bytes,
    contentType: response.headers.get("content-type") || "image/jpeg",
    cacheControl: response.headers.get("cache-control") || "public, max-age=86400, stale-while-revalidate=604800"
  };
}
