import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

function getEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return { url, anon, service };
}

export function hasSupabase() {
  const { url, anon } = getEnv();
  return Boolean(url && anon);
}

export async function createSupabaseServerClient() {
  const { url, anon } = getEnv();
  if (!url || !anon) return null;

  const cookieStore = await cookies();

  return createServerClient(url, anon, {
    cookies: {
      get(name) {
        return cookieStore.get(name)?.value;
      },
      set(name, value, options) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch {
          // Cookie writes from server components are not allowed in Next.js.
          // Middleware and route handlers already handle the writable auth flow.
        }
      },
      remove(name, options) {
        try {
          cookieStore.set({ name, value: "", ...options });
        } catch {
          // Ignore write attempts in read-only server contexts.
        }
      }
    }
  });
}

export function createSupabaseServiceClient() {
  const { url, service } = getEnv();
  if (!url || !service) return null;
  return createClient(url, service, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}
