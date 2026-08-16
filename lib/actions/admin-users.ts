"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

export type UserRole = "USER" | "STAFF" | "ADMIN" | "SUPER_ADMIN";

async function getAdminSupabase() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase: null, role: null };

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = profile?.role || user.app_metadata?.role;
  return { supabase, role };
}

export async function updateUserRoleAction(targetUserId: string, newRole: UserRole) {
  try {
    const { supabase, role } = await getAdminSupabase();
    if (!supabase || !["ADMIN", "SUPER_ADMIN"].includes(role || "")) {
      return { success: false, error: "غير مصرح لك بتعديل صلاحيات المستخدمين" };
    }

    const { error } = await supabase
      .from("users")
      .update({ role: newRole, updated_at: new Date().toISOString() })
      .eq("id", targetUserId);

    if (error) return { success: false, error: error.message };

    revalidatePath("/admin/users");
    return { success: true };
  } catch {
    return { success: false, error: "فشل تحديث دور المستخدم" };
  }
}