import { Activity, Clock3 } from "lucide-react";
import {
  getAuditLogsAction,
  type AuditLogItem,
} from "@/lib/actions/get-audit-logs";

export const metadata = {
  title: "سجلات النظام والأمان | لوحة التحكم",
};

export default async function AdminAuditLogsPage() {
  const result = await getAuditLogsAction();

  if (!result.success) {
    return (
      <div className="border-b border-theme py-8 text-sm text-[rgb(var(--danger))]">
        {result.error || "تعذر تحميل سجلات النظام"}
      </div>
    );
  }

  const logs: AuditLogItem[] = result.logs || [];

  return (
    <main className="space-y-6">
      <header className="border-b border-theme pb-5">
        <p className="text-[10px] font-bold text-brand">
          التتبع الأمني
        </p>
        <h1 className="mt-1 text-2xl font-bold sm:text-3xl">
          سجل النظام
        </h1>
        <p className="mt-2 max-w-2xl text-xs leading-6 text-muted sm:text-sm">
          الأحداث الإدارية وتغييرات الصلاحيات والإجراءات الحساسة بمكان واحد للمراجعة والتحقيق عند الحاجة.
        </p>
        <p className="mt-3 text-[10px] text-muted">
          {logs.length} حدث ظاهر
        </p>
      </header>

      {logs.length === 0 ? (
        <div className="py-12 text-center">
          <Activity className="mx-auto h-7 w-7 text-muted" />
          <p className="mt-3 text-sm font-bold">
            ما في أحداث مسجلة حالياً
          </p>
        </div>
      ) : (
        <section>
          <div className="divide-y divide-theme border-y border-theme md:hidden">
            {logs.map((log) => (
              <article key={log.id} className="py-4">
                <strong className="text-sm">{log.action}</strong>
                <p className="mt-2 text-[10px] text-muted">
                  المورد: {log.target || "غير محدد"}
                </p>
                <p className="mt-1 break-all font-mono text-[9px] text-muted">
                  المنفذ: {log.actor_id || "النظام تلقائياً"}
                </p>
                <p className="mt-3 flex items-center gap-1 text-[9px] text-muted">
                  <Clock3 size={11} />
                  {log.created_at || "غير معروف"}
                </p>
              </article>
            ))}
          </div>

          <div className="hidden overflow-x-auto border-y border-theme md:block">
            <table className="w-full min-w-[760px] text-right text-xs">
              <thead className="text-muted">
                <tr className="border-b border-theme">
                  <th className="p-4 font-bold">الحدث</th>
                  <th className="p-4 font-bold">المورد</th>
                  <th className="p-4 font-bold">معرف المنفذ</th>
                  <th className="p-4 font-bold">التاريخ والوقت</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-t border-theme first:border-t-0">
                    <td className="p-4 font-bold">{log.action}</td>
                    <td className="p-4 text-muted">
                      {log.target || "غير محدد"}
                    </td>
                    <td className="p-4 font-mono text-[10px]">
                      {log.actor_id || "النظام تلقائياً"}
                    </td>
                    <td className="p-4 text-[10px] text-muted">
                      {log.created_at || "غير معروف"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}
