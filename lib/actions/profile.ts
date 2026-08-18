"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const ProfileSchema = z.object({
  full_name: z.string().trim().min(2, "الاسم قصير جداً").max(100, "الاسم طويل جداً"),
  phone: z.string().trim().regex(/^(077|078|079)\d{7}$/, "رقم الهاتف الأردني غير صالح"),
  address: z.string().trim().min(5, "العنوان قصير جداً").max(300, "العنوان طويل جداً"),
});

export interface UserProfileData {
  id: string;
  email: string;
  full_name?: string | null;
  phone?: string | null;
  address?: string | null;
  role: string;
}

export async function getUserProfileAction() {
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

    const { data: profile, error } = await supabase
      .from("users")
      .select("id, email, full_name, phone, address, role")
      .eq("id", user.id)
      .single();

    if (error && error.code !== "PGRST116") {
      return { success: false, error: "تعذر تحميل الملف الشخصي" };
    }

    const profileData: UserProfileData = {
      id: user.id,
      email: user.email || "",
      full_name: profile?.full_name || "",
      phone: profile?.phone || "",
      address: profile?.address || "",
      role: profile?.role || "CUSTOMER",
    };

    return { success: true, profile: profileData };
  } catch {
    return { success: false, error: "فشل جلب الملف الشخصي" };
  }
}

export async function updateUserProfileAction(data: {
  full_name: string;
  phone: string;
  address: string;
}) {
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

    const parsed = ProfileSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || "بيانات الملف غير صالحة" };
    }

    const { error } = await supabase
      .from("users")
      .update({
        full_name: parsed.data.full_name,
        phone: parsed.data.phone,
        address: parsed.data.address,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (error) {
      return { success: false, error: "تعذر حفظ بيانات الملف الشخصي" };
    }

    revalidatePath("/profile");
    return { success: true };
  } catch {
    return { success: false, error: "حدث خطأ أثناء تحديث الملف الشخصي" };
  }
}
