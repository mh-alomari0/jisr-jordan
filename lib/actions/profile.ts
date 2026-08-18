"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

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
      .select("*")
      .eq("id", user.id)
      .single();

    if (error && error.code !== "PGRST116") {
      return { success: false, error: error.message };
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

    const { error } = await supabase.from("users").upsert({
      id: user.id,
      email: user.email,
      full_name: data.full_name,
      phone: data.phone,
      address: data.address,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/profile");
    return { success: true };
  } catch {
    return { success: false, error: "حدث خطأ أثناء تحديث الملف الشخصي" };
  }
}