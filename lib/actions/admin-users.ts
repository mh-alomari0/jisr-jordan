"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

export interface AdminUserItem {
  id: string;
  email: string;
  full_name?: string | null;
  phone?: string | null;
  role: string;
  created_at?: string | null;
}

export async function getAdminUsersAction() {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: () => {},
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "غير مصرح بالوصول" };
    }

    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    const role = profile?.role || user.app_metadata?.role;
    if (!["ADMIN", "SUPER_ADMIN"].includes(role || "")) {
      return { success: false, error: "غير مصرح لك بإدارة المستخدمين" };
    }

    const { data: users, error } = await supabase
      .from("users")
      .select("id, email, full_name, phone, role, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, users: (users || []) as unknown as AdminUserItem[] };
  } catch {
    return { success: false, error: "فشل جلب قائمة المستخدمين" };
  }
}

export async function updateUserRoleAction(userId: string, newRole: "CUSTOMER" | "STAFF" | "ADMIN") {
  try {
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
    if (!user) {
      return { success: false, error: "غير مصرح بالوصول" };
    }

    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    const role = profile?.role || user.app_metadata?.role;

    // فقط SUPER_ADMIN يمكنه تغيير رتب المستخدمين
    if (role !== "SUPER_ADMIN") {
      return { success: false, error: "غير مصرح: هذه العملية مخصصة للمسؤول الأعلى فقط" };
    }

    // منع تعديل رتبة المستخدم لنفسه
    if (userId === user.id) {
      return { success: false, error: "لا يمكنك تعديل رتبتك الخاصة" };
    }

    // منع تعديل رتبة SUPER_ADMIN آخر
    const { data: targetProfile } = await supabase
      .from("users")
      .select("role")
      .eq("id", userId)
      .single();

    if (targetProfile?.role === "SUPER_ADMIN") {
      return { success: false, error: "لا يمكن تعديل رتبة المسؤول الأعلى" };
    }

    const { error } = await supabase
      .from("users")
      .update({ role: newRole, updated_at: new Date().toISOString() })
      .eq("id", userId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/admin/users");
    return { success: true };
  } catch {
    return { success: false, error: "فشل تحديث رتبة المستخدم" };
  }
}