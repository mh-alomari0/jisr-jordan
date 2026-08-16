"use client";

import React, { useEffect, useState } from "react";
import { Shield, Activity, Calendar, AlertTriangle } from "lucide-react";
import { getAuditLogsAction, AuditLogItem } from "@/lib/actions/get-audit-logs";

export default function AdminDashboardPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAdminData() {
      setLoading(true);
      const res = await getAuditLogsAction(1, 10);
      if (res.success && res.logs) {
        setLogs(res.logs);
      } else {
        setError(res.error || "تعذر تحميل البيانات");
      }
      setLoading(false);
    }

    loadAdminData();
  }, []);

  return (
    <div className="space-y-8 max-w-7xl mx-auto py-6 px-4">
      <div className="flex justify-between items-center border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">لوحة تحكم الإدارة</h1>
          <p className="text-sm text-slate-500 mt-1">مراقبة العمليات الحساسة، الحجوزات، وسجلات التدقيق الأمنية</p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          النظام يعمل كالمعتاد
        </span>
      </div>

      {/* بطاقات الإحصائيات السريعة */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500 font-medium">إجمالي الحجوزات</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">--</h3>
          </div>
          <div className="p-3 bg-sky-50 rounded-lg text-sky-600">
            <Calendar className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500 font-medium">الأحداث الأمنية</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{logs.length}</h3>
          </div>
          <div className="p-3 bg-indigo-50 rounded-lg text-indigo-600">
            <Shield className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500 font-medium">حالة النظام</p>
            <h3 className="text-2xl font-bold text-emerald-600 mt-1">محمي بـ HMAC</h3>
          </div>
          <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600">
            <Activity className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* جدول سجلات التدقيق الأمنية */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex justify-between items-center">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Shield className="w-5 h-5 text-sky-600" />
            سجلات التدقيق الأمني (Audit Trail)
          </h2>
        </div>

        {error ? (
          <div className="p-6 text-center text-rose-600 flex items-center justify-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        ) : loading ? (
          <div className="p-8 text-center text-slate-500">جاري تحميل السجلات...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-slate-500">لا توجد سجلات تدقيق مسجلة حالياً</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-4">الحدث (Action)</th>
                  <th className="p-4">المُنفّذ (Actor ID)</th>
                  <th className="p-4">الهدف (Target)</th>
                  <th className="p-4">التاريخ والوقت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-mono font-medium text-sky-700">{log.action}</td>
                    <td className="p-4 font-mono text-xs text-slate-500">{log.actor_id || "System"}</td>
                    <td className="p-4 font-mono text-xs text-slate-500">{log.target || "-"}</td>
                    <td className="p-4 text-xs text-slate-500">
                      {new Date(log.created_at).toLocaleString("ar-JO")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}