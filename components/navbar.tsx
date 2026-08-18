"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import NotificationsBell from "./notifications-bell";

export default function Navbar({
  userRole,
  isAuthenticated = false,
}: {
  userRole?: string | null;
  isAuthenticated?: boolean;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(userRole || "");
  const isProvider = ["STAFF", "ADMIN", "SUPER_ADMIN"].includes(userRole || "");

  const navLinks = (
    <>
      <Link href="/services" className="hover:text-blue-600 transition-colors" onClick={() => setMobileOpen(false)}>
        الخدمات
      </Link>
      <Link href="/bookings" className="hover:text-blue-600 transition-colors" onClick={() => setMobileOpen(false)}>
        حجوزاتي
      </Link>
      {isAdmin && (
        <Link href="/admin" className="text-purple-700 font-semibold hover:underline" onClick={() => setMobileOpen(false)}>
          لوحة التحكم
        </Link>
      )}
      {isProvider && (
        <Link href="/provider" className="text-blue-700 font-semibold hover:underline" onClick={() => setMobileOpen(false)}>
          بوابة المزودين
        </Link>
      )}
      {isAuthenticated && !isProvider && (
        <Link href="/provider/apply" className="text-emerald-700 font-semibold hover:underline" onClick={() => setMobileOpen(false)}>
          انضم كمقدم خدمة
        </Link>
      )}
    </>
  );

  return (
    <header className="bg-white border-b sticky top-0 z-40 dir-rtl">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-xl font-bold text-gray-900">
            جسر الأردن
          </Link>

          <nav className="hidden md:flex items-center gap-4 text-sm font-medium">
            {navLinks}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <>
              <NotificationsBell />
              <Link
                href="/profile"
                className="hidden sm:inline-block text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg font-medium transition-colors"
              >
                الملف الشخصي
              </Link>
            </>
          ) : (
            <div className="hidden sm:flex items-center gap-2">
              <Link href="/login" className="text-sm font-semibold text-slate-700 hover:text-sky-700">
                تسجيل الدخول
              </Link>
              <Link href="/register" className="rounded-lg bg-sky-600 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-700">
                إنشاء حساب
              </Link>
            </div>
          )}

          {/* زر القائمة للجوال */}
          <button
            type="button"
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? "إغلاق القائمة" : "فتح القائمة"}
            aria-expanded={mobileOpen}
            aria-controls="mobile-navigation"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* قائمة الجوال */}
      {mobileOpen && (
        <div id="mobile-navigation" className="md:hidden border-t bg-white shadow-lg">
          <nav aria-label="التنقل على الهاتف" className="container mx-auto px-4 py-4 flex flex-col gap-3 text-sm font-medium">
            {navLinks}
            {isAuthenticated ? (
              <Link
                href="/profile"
                className="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg font-medium transition-colors text-center"
                onClick={() => setMobileOpen(false)}
              >
                الملف الشخصي
              </Link>
            ) : (
              <>
                <Link href="/login" onClick={() => setMobileOpen(false)}>تسجيل الدخول</Link>
                <Link href="/register" onClick={() => setMobileOpen(false)}>إنشاء حساب</Link>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
