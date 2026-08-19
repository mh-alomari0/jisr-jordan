"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const ServiceSchema = z.object({
  title: z.string().trim().min(3, "اسم الخدمة قصير جداً").max(120),
  description: z.string().trim().max(2000),
  price: z.number().finite().positive("السعر يجب أن يكون أكبر من صفر").max(10000),
  category: z.enum(["ELECTRICITY", "PLUMBING", "CLEANING", "HVAC", "CARPENTRY", "PAINTING", "APPLIANCE_REPAIR", "GARDENING", "GENERAL"]).default("GENERAL"),
});
const ServiceIdSchema = z.string().uuid();

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

  const role = profile?.role;
  return { supabase, user, role };
}

export async function createServiceAction(formData: {
  title: string;
  description: string;
  price: number;
  category?: "ELECTRICITY" | "PLUMBING" | "CLEANING" | "HVAC" | "CARPENTRY" | "PAINTING" | "APPLIANCE_REPAIR" | "GARDENING" | "GENERAL";
}) {
  try {
    const { supabase, role } = await getAdminSupabase();
    if (!supabase || !["ADMIN", "SUPER_ADMIN"].includes(role || "")) {
      return { success: false, error: "غير مصرح لك بإضافة خدمات جديدة" };
    }

    const parsed = ServiceSchema.safeParse(formData);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message || "بيانات الخدمة غير صالحة" };

    const { error } = await supabase.from("services").insert({
      title: parsed.data.title,
      description: parsed.data.description,
      price: parsed.data.price,
      category: parsed.data.category,
      is_active: true,
    });

    if (error) return { success: false, error: "تعذر إضافة الخدمة" };

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

    if (!ServiceIdSchema.safeParse(serviceId).success) {
      return { success: false, error: "معرف الخدمة غير صالح" };
    }

    const { data, error } = await supabase
      .from("services")
      .update({ is_active: !currentStatus })
      .eq("id", serviceId)
      .eq("is_active", currentStatus)
      .select("id")
      .maybeSingle();

    if (error) return { success: false, error: "تعذر تغيير حالة الخدمة" };
    if (!data) return { success: false, error: "تم تعديل حالة الخدمة من جلسة أخرى؛ حدّث الصفحة" };

    revalidatePath("/admin/services");
    revalidatePath("/services");
    return { success: true };
  } catch {
    return { success: false, error: "فشل تغيير حالة الخدمة" };
  }
}
