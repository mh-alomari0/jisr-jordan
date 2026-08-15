"use client";

import { MessageCircle } from "lucide-react";

export default function WhatsAppWidget() {
  // رقم الواتساب المخصص للدعم الفني (مثال: الأردن)
  const whatsappNumber = "962780853633"; // استبدل هذا الرقم برقم الواتساب الخاص بك 
  const defaultText = encodeURIComponent("مرحباً منصة جسر، أود الاستفسار عن خدمات الصيانة المتاحة.");

  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${defaultText}`;

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 left-6 z-50 bg-emerald-500 hover:bg-emerald-600 text-white p-3.5 rounded-full shadow-2xl flex items-center gap-2 group transition-all duration-300 hover:scale-110"
      aria-label="تواصل عبر الواتساب"
    >
      <MessageCircle className="w-7 h-7 fill-white stroke-emerald-500" />
      <span className="max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-xs transition-all duration-300 text-xs font-bold pl-1">
        تحدث معنا مباشرة
      </span>
    </a>
  );
}