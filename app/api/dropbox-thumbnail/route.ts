import { NextRequest } from "next/server";
import { isDropboxUrl } from "@/lib/dropbox-links";
import { fetchDropboxThumbnail } from "@/lib/dropbox-thumbnail.server";

export async function GET(request: NextRequest) {
  const originalUrl = request.nextUrl.searchParams.get("url");

  if (!originalUrl || !isDropboxUrl(originalUrl)) {
    return new Response("Invalid Dropbox URL", { status: 400 });
  }

  const thumbnail = await fetchDropboxThumbnail(originalUrl);
  if (!thumbnail) {
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
}
