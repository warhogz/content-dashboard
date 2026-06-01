import "server-only";

import { normalizeDropboxSharedLink } from "@/lib/dropbox-links";

const DROPBOX_THUMBNAIL_SIZE = "w640h480";
const DROPBOX_THUMBNAIL_FORMAT = "jpeg";
const DROPBOX_THUMBNAIL_MODE = "bestfit";

function getAccessToken() {
  return process.env.DROPBOX_ACCESS_TOKEN?.trim() || null;
}

export async function fetchDropboxThumbnail(sharedUrl: string) {
  const normalizedUrl = normalizeDropboxSharedLink(sharedUrl);
  const accessToken = getAccessToken();

  if (!normalizedUrl || !accessToken) {
    return null;
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
        mode: DROPBOX_THUMBNAIL_MODE
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
    return null;
  }

  const bytes = await response.arrayBuffer();
  return {
    bytes,
    contentType: response.headers.get("content-type") || "image/jpeg"
  };
}
