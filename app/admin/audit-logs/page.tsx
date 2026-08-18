import { getAuditLogsAction, AuditLogItem } from "@/lib/actions/get-audit-logs";

export const metadata = {
  title: "سجلات النظام والأمان | لوحة التحكم",
};

export default async function AdminAuditLogsPage() {
  const result = await getAuditLogsAction();

  if (!result.success) {
    return (
      <div className="p-8 text-center text-red-600 bg-white border rounded-xl">
        <p>{result.error || "تعذر تحميل سجلات النظام"}</p>
      </div>
    );
  }

  const logs: AuditLogItem[] = result.logs || [];

  return (
    <div className="container mx-auto p-6 space-y-6 dir-rtl">
      <div className="border-b pb-4">
        <h1 className="text-2xl font-bold">سجلات النظام والتتبع الأمني</h1>
        <p className="text-gray-600 text-sm">مراقبة كافة الأحداث الحساسة، التغييرات على الصلاحيات، وعمليات النظام</p>
      </div>

      <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-right text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-4">الحدث (Action)</th>
              <th className="p-4">المورد المفتوح</th>
              <th className="p-4">معرف المنفذ</th>
              <th className="p-4">التاريخ والوقت</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-6 text-center text-gray-500">
                  لا توجد سجلات أحداث مسجلة حالياً في النظام.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="border-b">
                  <td className="p-4 font-semibold text-gray-900">{log.action}</td>
                  <td className="p-4 text-gray-600">{log.target || "غير محدد"}</td>
                  <td className="p-4 text-xs font-mono">{log.actor_id || "النظام تلقائياً"}</td>
                  <td className="p-4 text-xs text-gray-500">{log.created_at || "غير معروف"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}