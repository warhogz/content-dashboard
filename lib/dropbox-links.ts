const DROPBOX_HOSTS = new Set(["www.dropbox.com", "dropbox.com", "dl.dropboxusercontent.com"]);

export function isDropboxUrl(value?: string | null) {
  if (!value) return false;

  try {
    const url = new URL(value);
    return DROPBOX_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

export function normalizeDropboxSharedLink(value: string) {
  try {
    const url = new URL(value);
    if (!DROPBOX_HOSTS.has(url.hostname)) return null;

    url.protocol = "https:";
    if (url.hostname === "dl.dropboxusercontent.com") {
      url.hostname = "www.dropbox.com";
    }

    url.searchParams.delete("raw");
    url.searchParams.delete("dl");

    return url.toString();
  } catch {
    return null;
  }
}

export function buildDropboxThumbnailProxyUrl(value: string) {
  return `/api/dropbox-thumbnail?url=${encodeURIComponent(value)}`;
}

export function resolveCardPreviewUrl(value?: string | null) {
  if (!value) return value ?? null;
  if (!isDropboxUrl(value)) return value;
  return buildDropboxThumbnailProxyUrl(value);
}
