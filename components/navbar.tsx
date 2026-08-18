"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import NotificationsBell from "./notifications-bell";

export default function Navbar({ userRole }: { userRole?: string | null }) {
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
          <NotificationsBell />
          <Link
            href="/profile"
            className="hidden sm:inline-block text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg font-medium transition-colors"
          >
            الملف الشخصي
          </Link>

          {/* زر القائمة للجوال */}
          <button
            type="button"
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? "إغلاق القائمة" : "فتح القائمة"}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* قائمة الجوال */}
      {mobileOpen && (
        <div className="md:hidden border-t bg-white shadow-lg">
          <nav className="container mx-auto px-4 py-4 flex flex-col gap-3 text-sm font-medium">
            {navLinks}
            <Link
              href="/profile"
              className="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg font-medium transition-colors text-center"
              onClick={() => setMobileOpen(false)}
            >
              الملف الشخصي
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}