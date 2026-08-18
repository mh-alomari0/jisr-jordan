"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { logger } from "@/lib/logger";
import { unstable_rethrow } from "next/navigation";

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
    page = Number.isInteger(page) && page > 0 ? page : 1;
    limit = Number.isInteger(limit) ? Math.min(Math.max(limit, 1), 100) : 20;
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

    // 1. التثبت من الجلسة
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "غير مصرح: يجب تسجيل الدخول" };
    }

    // 2. فحص الدور الصريح داخل الكود (Defense-in-Depth)
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || !["ADMIN", "SUPER_ADMIN"].includes(profile.role)) {
      logger.warn(`Unauthorized audit logs access attempt by user ${user.id}`, { context: "AdminAudit" });
      return { success: false, error: "غير مصرح: هذه الصفحة مخصصة للمسؤولين فقط" };
    }

    // 3. تنفيذ الاستعلام
    const offset = (page - 1) * limit;
    const { data, error } = await supabase
      .from("audit_logs")
      .select("id, actor_id, action, target, metadata, created_at")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      logger.error(`Audit log fetch failed: ${error.message}`, { context: "AdminAudit" });
      return { success: false, error: "تعذر جلب سجلات التدقيق الأمنية" };
    }

    return { success: true, logs: data as AuditLogItem[] };
  } catch (err) {
    unstable_rethrow(err);
    logger.error("Internal error fetching audit logs", { context: "AdminAudit", error: err });
    return { success: false, error: "حدث خطأ غير متوقع" };
  }
}
