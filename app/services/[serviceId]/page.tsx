import React from "react";
import { Check, Star } from "lucide-react";

export default function ServiceDetailsPage() {
  return (
    <div className="max-w-3xl mx-auto py-8">
      <h1 className="text-3xl font-bold mb-4">تفاصيل الخدمة</h1>
      <p className="text-slate-600 mb-6">
        نقدم لكم أفضل خدمات الصيانة تحت شعار &quot;السرعة والجودة المضمونة&quot; في جميع مناطق عمان والأردن.
      </p>
      <div className="flex items-center gap-2 mb-6">
        <Star className="w-5 h-5 text-amber-500 fill-current" />
        <span className="font-semibold text-slate-800">4.9 (120 تقييم)</span>
      </div>
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <ul className="space-y-3">
          <li className="flex items-center gap-2">
            <Check className="w-5 h-5 text-green-600" />
            <span className="text-slate-700">فنيون معتمدون ومفحوصون أمنياً</span>
          </li>
        </ul>
      </div>
    </div>
  );
}