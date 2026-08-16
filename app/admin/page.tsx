import React from "react";

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900">لوحة تحكم الإدارة</h1>
      </div>
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <p className="text-slate-600">مرحباً بك في لوحة تحكم منصة جسر الأردن.</p>
      </div>
    </div>
  );
}