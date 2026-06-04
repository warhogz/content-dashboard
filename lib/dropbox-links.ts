const DROPBOX_HOSTS = new Set(["www.dropbox.com", "dropbox.com", "dl.dropboxusercontent.com"]);
export type DropboxPreviewVariant = "canvas-512";

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

export function buildDropboxThumbnailProxyUrl(value: string, variant?: DropboxPreviewVariant) {
  const params = new URLSearchParams({
    url: value
  });

  if (variant) {
    params.set("variant", variant);
  }

  return `/api/dropbox-thumbnail?${params.toString()}`;
}

export function resolveCardPreviewUrl(
  value?: string | null,
  options?: {
    variant?: DropboxPreviewVariant;
  }
) {
  if (!value) return value ?? null;
  if (!isDropboxUrl(value)) return value;
  return buildDropboxThumbnailProxyUrl(value, options?.variant);
}
