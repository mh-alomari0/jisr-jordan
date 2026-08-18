"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { ServiceItem } from "@/lib/actions/services";

export type { ServiceItem };

export async function searchServicesAction(params?: {
  query?: string;
  category?: string;
  sortBy?: "price_asc" | "price_desc" | "newest";
}) {
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

    let dbQuery = supabase
      .from("services")
      .select("*")
      .eq("is_active", true);

    if (params?.category && params.category !== "ALL") {
      dbQuery = dbQuery.eq("category", params.category);
    }

    if (params?.query && params.query.trim().length > 0) {
      dbQuery = dbQuery.ilike("title", `%${params.query.trim()}%`);
    }

    if (params?.sortBy === "price_asc") {
      dbQuery = dbQuery.order("price", { ascending: true });
    } else if (params?.sortBy === "price_desc") {
      dbQuery = dbQuery.order("price", { ascending: false });
    } else {
      dbQuery = dbQuery.order("created_at", { ascending: false });
    }

    const { data: services, error } = await dbQuery;

    if (error) {
      return { success: true, services: [] };
    }

    return { success: true, services: (services || []) as unknown as ServiceItem[] };
  } catch {
    return { success: false, error: "فشل جلب قائمة الخدمات" };
  }
}