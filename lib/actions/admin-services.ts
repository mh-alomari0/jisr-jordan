"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

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
  if (!user) return { supabase: null, user: null, role: null };

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = profile?.role || user.app_metadata?.role;
  return { supabase, user, role };
}

export async function createServiceAction(formData: {
  title: string;
  description: string;
  price: number;
}) {
  try {
    const { supabase, role } = await getAdminSupabase();
    if (!supabase || !["ADMIN", "SUPER_ADMIN"].includes(role || "")) {
      return { success: false, error: "غير مصرح لك بإضافة خدمات جديدة" };
    }

    if (!formData.title || formData.price <= 0) {
      return { success: false, error: "يرجى كتابة عنوان الخدمة وتحديد سعر صحيح" };
    }

    const { error } = await supabase.from("services").insert({
      title: formData.title,
      description: formData.description,
      price: formData.price,
      is_active: true,
    });

    if (error) return { success: false, error: error.message };

    revalidatePath("/admin/services");
    revalidatePath("/services");
    return { success: true };
  } catch {
    return { success: false, error: "حدث خطأ أثناء إضافة الخدمة" };
  }
}

export async function toggleServiceStatusAction(serviceId: string, currentStatus: boolean) {
  try {
    const { supabase, role } = await getAdminSupabase();
    if (!supabase || !["ADMIN", "SUPER_ADMIN"].includes(role || "")) {
      return { success: false, error: "غير مصرح بالوصول" };
    }

    const { error } = await supabase
      .from("services")
      .update({ is_active: !currentStatus })
      .eq("id", serviceId);

    if (error) return { success: false, error: error.message };

    revalidatePath("/admin/services");
    revalidatePath("/services");
    return { success: true };
  } catch {
    return { success: false, error: "فشل تغيير حالة الخدمة" };
  }
}