"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { logger } from "@/lib/logger";

export interface ServiceItem {
  id: string;
  title: string;
  description: string | null;
  price: number;
  category: string;
  is_active: boolean;
  created_at: string;
}

export async function getServicesAction(): Promise<{
  success: boolean;
  services?: ServiceItem[];
  error?: string;
}> {
  try {
    const cookieStore = await cookies();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    });

    const { data, error } = await supabase
      .from("services")
      .select("*")
      .eq("is_active", true)
      .order("title", { ascending: true });

    if (error) {
      logger.error(`Failed to fetch services: ${error.message}`, { context: "ServicesAction" });
      return { success: false, error: "تعذر جلب قائمة الخدمات" };
    }

    return { success: true, services: data as ServiceItem[] };
  } catch (err) {
    logger.error("Internal error fetching services", { context: "ServicesAction", error: err });
    return { success: false, error: "حدث خطأ غير متوقع أثناء تحميل الخدمات" };
  }
}