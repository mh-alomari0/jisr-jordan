"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export interface AuditLogItem {
  id: string;
  action: string;
  target_resource?: string | null;
  actor_id?: string | null;
  created_at?: string | null;
  details?: string | null;
}

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
  if (!user) return { supabase: null, role: null };

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = profile?.role || user.app_metadata?.role;
  return { supabase, role };
}

export async function getAuditLogsAction() {
  try {
    const { supabase, role } = await getAdminSupabase();
    if (!supabase || !["ADMIN", "SUPER_ADMIN"].includes(role || "")) {
      return { success: false, error: "غير مصرح لك باستعراض سجلات النظام الحساسة" };
    }

    const { data: logs, error } = await supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      // في حال عدم وجود جدول audit_logs بعد في الداتابيز، إرجاع سجل افتراضي بأمان
      return { success: true, logs: [] };
    }

    return { success: true, logs: (logs || []) as unknown as AuditLogItem[] };
  } catch {
    return { success: false, error: "فشل جلب سجلات الأمان" };
  }
}