"use client";

import React from "react";
import { User, Mail, Shield } from "lucide-react";

export default function ProfilePage() {
  const handleProfileUpdate = async () => {
    try {
      // منطق تحديث البيانات
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "حدث خطأ غير متوقع";
      console.error(message);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">الملف الشخصي</h1>
      <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-4 shadow-sm">
        <div className="flex items-center gap-3">
          <User className="w-5 h-5 text-sky-600" />
          <span className="text-slate-800">المستخدم الحالي</span>
        </div>
        <div className="flex items-center gap-3">
          <Mail className="w-5 h-5 text-sky-600" />
          <span className="text-slate-800">user@jisr.jo</span>
        </div>
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-sky-600" />
          <span className="text-slate-800">عميل معتمد</span>
        </div>
        <button
          onClick={handleProfileUpdate}
          className="mt-4 px-4 py-2 bg-sky-600 text-white rounded-lg text-sm hover:bg-sky-700 transition-colors"
        >
          حفظ التغييرات
        </button>
      </div>
    </div>
  );
}