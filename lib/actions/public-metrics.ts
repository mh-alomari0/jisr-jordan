"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export interface SystemMetrics {
  completedBookingsCount: number;
  activeServicesCount: number;
  activeProvidersCount: number;
}

export async function getPublicMetricsAction(): Promise<{
  success: boolean;
  metrics: SystemMetrics;
}> {
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

    const [bookingsRes, servicesRes, providersRes] = await Promise.all([
      supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("status", "COMPLETED"),
      supabase
        .from("services")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true),
      supabase
        .from("users")
        .select("id", { count: "exact", head: true })
        .in("role", ["STAFF", "ADMIN"]),
    ]);

    return {
      success: true,
      metrics: {
        completedBookingsCount: bookingsRes.count || 0,
        activeServicesCount: servicesRes.count || 0,
        activeProvidersCount: providersRes.count || 0,
      },
    };
  } catch {
    return {
      success: false,
      metrics: {
        completedBookingsCount: 0,
        activeServicesCount: 0,
        activeProvidersCount: 0,
      },
    };
  }
}