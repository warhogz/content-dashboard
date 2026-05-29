import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    return res;
  }

  try {
    const supabase = createServerClient(url, anon, {
      cookies: {
        get(name) {
          return req.cookies.get(name)?.value;
        },
        set(name, value, options) {
          res.cookies.set({ name, value, ...options });
        },
        remove(name, options) {
          res.cookies.set({ name, value: "", ...options });
        }
      }
    });

    const {
      data: { session }
    } = await supabase.auth.getSession();

    const protectedRoute =
      req.nextUrl.pathname.startsWith("/admin") ||
      req.nextUrl.pathname.startsWith("/settings");

    if (protectedRoute && !session) {
      const loginUrl = req.nextUrl.clone();
      loginUrl.pathname = "/login";
      return NextResponse.redirect(loginUrl);
    }

    return res;
  } catch (e) {
    console.error("Middleware auth error", e);
    return res;
  }
}

export const config = {
  matcher: ["/admin/:path*", "/settings/:path*"]
};