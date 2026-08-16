"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { logger } from "@/lib/logger";

export interface AuditLogItem {
  id: string;
  actor_id: string | null;
  action: string;
  target: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export async function getAuditLogsAction(page = 1, limit = 20): Promise<{
  success: boolean;
  logs?: AuditLogItem[];
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

    const offset = (page - 1) * limit;

    const { data, error } = await supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      logger.error(`Audit log fetch failed: ${error.message}`, { context: "AdminAudit" });
      return { success: false, error: "تعذر جلب سجلات التدقيق الأمنية" };
    }

    return { success: true, logs: data as AuditLogItem[] };
  } catch (err) {
    logger.error("Internal error fetching audit logs", { context: "AdminAudit", error: err });
    return { success: false, error: "حدث خطأ غير متوقع" };
  }
}