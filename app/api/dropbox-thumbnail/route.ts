import { NextRequest } from "next/server";
import { type DropboxPreviewVariant, isDropboxUrl } from "@/lib/dropbox-links";
import { fetchDropboxThumbnailVariant } from "@/lib/dropbox-thumbnail.server";

export const runtime = "nodejs";

function parseVariant(value: string | null): DropboxPreviewVariant | undefined {
  if (value === "canvas-512") {
    return value;
  }

  return undefined;
}

export async function GET(request: NextRequest) {
  const originalUrl = request.nextUrl.searchParams.get("url");
  const variant = parseVariant(request.nextUrl.searchParams.get("variant"));

  if (!originalUrl || !isDropboxUrl(originalUrl)) {
    return new Response("Invalid Dropbox URL", { status: 400 });
  }

  try {
    const thumbnail = await fetchDropboxThumbnailVariant(originalUrl, variant);
    if (!thumbnail) {
      console.error("Dropbox thumbnail route returned 502", {
        originalUrl,
        variant
      });

      return new Response("Unable to load Dropbox image", {
        status: 502,
        headers: {
          "Cache-Control": "no-store"
        }
      });
    }

    return new Response(thumbnail.bytes, {
      status: 200,
      headers: {
        "Content-Type": thumbnail.contentType,
        "Cache-Control": thumbnail.cacheControl
      }
    });
  } catch (error) {
    console.error("Dropbox thumbnail route crashed", {
      originalUrl,
      variant,
      error: error instanceof Error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
            cause: error.cause ? String(error.cause) : undefined
          }
        : String(error)
    });

    return new Response("Unable to load Dropbox image", {
      status: 502,
      headers: {
        "Cache-Control": "no-store"
      }
    });
  }
}
