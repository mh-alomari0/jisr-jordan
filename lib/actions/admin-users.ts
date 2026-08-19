"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export interface AdminUserItem {
  id: string;
  email: string;
  full_name?: string | null;
  phone?: string | null;
  role: string;
  created_at?: string | null;
}

export async function getAdminUsersAction(page = 1) {
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

    const role = profile?.role;
    if (!["ADMIN", "SUPER_ADMIN"].includes(role || "")) {
      return { success: false, error: "غير مصرح لك بإدارة المستخدمين" };
    }

    const safePage = Math.max(1, Math.floor(page));
    const pageSize = 25;
    const from = (safePage - 1) * pageSize;
    const { data: users, error } = await supabase
      .from("users")
      .select("id, email, full_name, phone, role, created_at")
      .order("created_at", { ascending: false })
      .range(from, from + pageSize);

    if (error) {
      return { success: false, error: "تعذر تحميل قائمة المستخدمين" };
    }

    const hasMore = (users || []).length > pageSize;
    return { success: true, users: (users || []).slice(0, pageSize) as unknown as AdminUserItem[], page: safePage, hasMore };
  } catch {
    return { success: false, error: "فشل جلب قائمة المستخدمين" };
  }
}

export async function updateUserRoleAction(userId: string, newRole: "CUSTOMER" | "ADMIN") {
  try {
    const input = z.object({
      userId: z.string().uuid(),
      newRole: z.enum(["CUSTOMER", "ADMIN"]),
    }).safeParse({ userId, newRole });
    if (!input.success) return { success: false, error: "بيانات تعديل الصلاحية غير صالحة" };
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

    const role = profile?.role;

    // فقط SUPER_ADMIN يمكنه تغيير رتب المستخدمين
    if (role !== "SUPER_ADMIN") {
      return { success: false, error: "غير مصرح: هذه العملية مخصصة للمسؤول الأعلى فقط" };
    }

    // منع تعديل رتبة المستخدم لنفسه
    if (input.data.userId === user.id) {
      return { success: false, error: "لا يمكنك تعديل رتبتك الخاصة" };
    }

    const { data, error } = await supabase.rpc("set_user_role_by_super_admin", {
      p_target_id: input.data.userId,
      p_new_role: input.data.newRole,
    });
    if (error || !data?.success) {
      const messages: Record<string, string> = {
        SELF_ROLE_CHANGE: "لا يمكنك تعديل رتبتك الخاصة",
        PROTECTED_ROLE: "لا يمكن تعديل رتبة المسؤول الأعلى",
        USE_PROVIDER_WORKFLOW: "استخدم شاشة مقدمي الخدمة لاعتماد أو إيقاف مقدم الخدمة",
        USER_NOT_FOUND: "المستخدم غير موجود",
        FORBIDDEN: "غير مصرح بتنفيذ هذا الإجراء",
      };
      return { success: false, error: messages[data?.error] || "تعذر تحديث رتبة المستخدم" };
    }

    revalidatePath("/admin/users");
    return { success: true };
  } catch {
    return { success: false, error: "فشل تحديث رتبة المستخدم" };
  }
}
