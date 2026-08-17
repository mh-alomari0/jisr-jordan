"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { ServiceItem } from "./services-search";

export async function getServiceDetailAction(serviceId: string) {
  try {
    if (!serviceId) {
      return { success: false, error: "معرف الخدمة غير صالح" };
    }

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

    const { data: service, error } = await supabase
      .from("services")
      .select("*")
      .eq("id", serviceId)
      .eq("is_active", true)
      .single();

    if (error || !service) {
      return { success: false, error: "الخدمة المطلوبة غير موجودة أو غير متاحة حالياً" };
    }

    return { success: true, service: service as unknown as ServiceItem };
  } catch {
    return { success: false, error: "فشل تحميل تفاصيل الخدمة" };
  }
}