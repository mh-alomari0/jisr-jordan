import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

/**
 * Creates a Supabase server client that respects RLS policies.
 * Use this for all normal user-facing operations (queries, inserts, updates).
 * Cookies are properly handled for session refresh.
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
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );
}

/**
 * Creates a Supabase admin client using the service role key.
 * BYPASSES RLS — use ONLY where explicitly required (e.g., webhooks, system operations).
 * Never expose this client to user-facing flows.
 */
export function createAdminSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL");
  }

  return createSupabaseClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Helper: get the authenticated user or return null.
 * Centralizes the most common auth pattern used across server actions.
 */
export async function getAuthenticatedUser(supabase?: SupabaseClient) {
  const client = supabase ?? await createServerSupabaseClient();
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) return null;
  return user;
}

/**
 * Helper: verify the user has an admin role (ADMIN or SUPER_ADMIN).
 * Returns the role string or null if not admin.
 */
export async function getUserRole(supabase: SupabaseClient, userId: string): Promise<string | null> {
  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", userId)
    .single();

  return profile?.role || null;
}

/**
 * Helper: check if a role is an admin-level role.
 */
export function isAdminRole(role: string | null): boolean {
  return !!role && ["ADMIN", "SUPER_ADMIN"].includes(role);
}

/**
 * Helper: check if a role is staff-level or above.
 */
export function isStaffOrAbove(role: string | null): boolean {
  return !!role && ["STAFF", "ADMIN", "SUPER_ADMIN"].includes(role);
}
