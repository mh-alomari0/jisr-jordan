import { createServerClient } from "@supabase/ssr";
import {
  createClient as createSupabaseClient,
  type SupabaseClient,
} from "@supabase/supabase-js";
import { cookies } from "next/headers";

/**
 * Creates a Supabase server client that respects RLS policies.
 *
 * Important:
 * - Server Components are allowed to READ cookies.
 * - Next.js does not allow Server Components to WRITE cookies while rendering.
 * - Supabase may call setAll() while trying to refresh an auth session.
 * - The proxy is responsible for refreshing the browser session on normal requests.
 *
 * In Server Actions / Route Handlers, cookieStore.set() is allowed and succeeds.
 * In Server Components, the write throws and is intentionally ignored.
 */
export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },

        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Expected when called during Server Component rendering.
            // Session refresh is handled by lib/supabase/proxy.ts.
          }
        },
      },
    },
  );
}

/**
 * Creates a Supabase admin client using the service role key.
 * BYPASSES RLS — use ONLY where explicitly required
 * (webhooks/system/admin-only operations).
 */
export function createAdminSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL",
    );
  }

  return createSupabaseClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Returns the authenticated user, or null.
 */
export async function getAuthenticatedUser(
  supabase?: SupabaseClient,
) {
  const client =
    supabase ?? (await createServerSupabaseClient());

  const {
    data: { user },
    error,
  } = await client.auth.getUser();

  if (error || !user) return null;

  return user;
}

/**
 * Returns ADMIN / SUPER_ADMIN role, otherwise null.
 */
export async function getUserRole(
  supabase: SupabaseClient,
  userId: string,
): Promise<string | null> {
  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", userId)
    .single();

  return profile?.role || null;
}

export function isAdminRole(
  role: string | null,
): boolean {
  return (
    !!role &&
    ["ADMIN", "SUPER_ADMIN"].includes(role)
  );
}

export function isStaffOrAbove(
  role: string | null,
): boolean {
  return (
    !!role &&
    ["STAFF", "ADMIN", "SUPER_ADMIN"].includes(role)
  );
}
