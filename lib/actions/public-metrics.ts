"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export interface SystemMetrics {
  completedBookingsCount: number;
  activeServicesCount: number;
  activeProvidersCount: number;
}

const emptyMetrics: SystemMetrics = {
  completedBookingsCount: 0,
  activeServicesCount: 0,
  activeProvidersCount: 0,
};

export async function getPublicMetricsAction(): Promise<{
  success: boolean;
  metrics: SystemMetrics;
}> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.rpc("get_public_metrics");
    if (error || !data) return { success: false, metrics: emptyMetrics };

    return {
      success: true,
      metrics: {
        completedBookingsCount: Number(data.completedBookingsCount) || 0,
        activeServicesCount: Number(data.activeServicesCount) || 0,
        activeProvidersCount: Number(data.activeProvidersCount) || 0,
      },
    };
  } catch {
    return { success: false, metrics: emptyMetrics };
  }
}
