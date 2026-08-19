import {
  Activity,
  Clock3,
  Fingerprint,
  ShieldCheck,
} from "lucide-react";
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
      <div className="rounded-[1.8rem] border border-theme bg-surface p-8 text-center text-sm text-[rgb(var(--danger))]">
        {result.error || "تعذر تحميل سجلات النظام"}
      </div>
    );
  }

  const logs: AuditLogItem[] = result.logs || [];

  return (
    <main className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] bg-[#102d2c] p-6 text-white sm:p-8">
        <div className="absolute -left-16 -top-20 h-52 w-52 rounded-full border-[22px] border-white/10" />
        <div className="relative">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
            <Fingerprint size={20} />
          </span>

          <p className="mt-6 text-[10px] font-bold text-[#a9dcd6]">
            التتبع الأمني
          </p>

          <h1 className="mt-1 text-3xl font-bold tracking-[-.05em] sm:text-5xl">
            كل إجراء حساس
            <span className="text-[#ffc985]"> لازم يترك أثر.</span>
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-7 text-white/70">
            راقب الأحداث الإدارية وتغييرات الصلاحيات وعمليات النظام من سجل
            مركزي يساعد على التحقيق والمراجعة.
          </p>
        </div>
      </section>

      <section>
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold text-brand">
              الأحداث المسجلة
            </p>
            <h2 className="mt-1 text-2xl font-bold">
              سجل النظام
            </h2>
            <p className="mt-1 text-xs text-muted">
              {logs.length} حدث ظاهر
            </p>
          </div>

          <span className="inline-flex items-center gap-1 rounded-full bg-surface px-3 py-2 text-[9px] text-muted shadow-soft">
            <ShieldCheck size={12} className="text-[rgb(var(--success))]" />
            للمراجعة الأمنية
          </span>
        </div>

        {logs.length === 0 ? (
          <div className="rounded-[1.8rem] border border-dashed border-[rgb(var(--primary)/0.28)] bg-[rgb(var(--primary)/0.025)] p-10 text-center">
            <Activity className="mx-auto h-8 w-8 text-brand" />
            <p className="mt-3 text-sm font-bold">
              لا توجد سجلات أحداث حالياً
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-3 md:hidden">
              {logs.map((log) => (
                <article
                  key={log.id}
                  className="rounded-[1.6rem] border border-theme bg-surface p-4 shadow-soft"
                >
                  <div className="flex items-start justify-between gap-3">
                    <strong className="text-sm">
                      {log.action}
                    </strong>
                    <Activity className="h-4 w-4 shrink-0 text-brand" />
                  </div>

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

            <div className="hidden overflow-hidden rounded-[1.8rem] border border-theme bg-surface shadow-soft md:block">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-right text-xs">
                  <thead className="bg-surface-muted text-muted">
                    <tr>
                      <th className="p-4">الحدث</th>
                      <th className="p-4">المورد</th>
                      <th className="p-4">معرف المنفذ</th>
                      <th className="p-4">التاريخ والوقت</th>
                    </tr>
                  </thead>

                  <tbody>
                    {logs.map((log) => (
                      <tr
                        key={log.id}
                        className="border-t border-theme"
                      >
                        <td className="p-4 font-bold">
                          {log.action}
                        </td>
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
            </div>
          </>
        )}
      </section>
    </main>
  );
}
