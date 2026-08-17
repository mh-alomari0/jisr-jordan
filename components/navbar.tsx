"use client";

import Link from "next/link";
import NotificationsBell from "./notifications-bell";

export default function Navbar({ userRole }: { userRole?: string | null }) {
  const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(userRole || "");
  const isProvider = ["STAFF", "ADMIN", "SUPER_ADMIN"].includes(userRole || "");

  return (
    <header className="bg-white border-b sticky top-0 z-40 dir-rtl">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-xl font-bold text-gray-900">
            جسر الأردن
          </Link>

          <nav className="hidden md:flex items-center gap-4 text-sm font-medium">
            <Link href="/services" className="hover:text-blue-600 transition-colors">
              الخدمات
            </Link>
            <Link href="/bookings" className="hover:text-blue-600 transition-colors">
              حجوزاتي
            </Link>

            {isAdmin && (
              <Link href="/admin" className="text-purple-700 font-semibold hover:underline">
                لوحة التحكم
              </Link>
            )}

            {isProvider && (
              <Link href="/provider" className="text-blue-700 font-semibold hover:underline">
                بوابة المزودين
              </Link>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <NotificationsBell />
          <Link
            href="/profile"
            className="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg font-medium transition-colors"
          >
            الملف الشخصي
          </Link>
        </div>
      </div>
    </header>
  );
}