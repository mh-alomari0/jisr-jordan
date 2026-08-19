"use client";

import { useState } from "react";
import Link from "next/link";
import { Heart, Menu, Search, X } from "lucide-react";
import NotificationsBell from "./notifications-bell";
import ThemeToggle from "./theme-toggle";

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

  const close = () => setMobileOpen(false);
  const navLinks = (
    <>
      <Link href="/discover" className="transition hover:text-brand" onClick={close}>استكشاف</Link>
      <Link href="/services" className="transition hover:text-brand" onClick={close}>الخدمات المنزلية</Link>
      {isAuthenticated && <Link href="/quotes" className="transition hover:text-brand" onClick={close}>عروض الأسعار</Link>}
      {isProvider && <Link href="/provider" className="font-bold text-brand" onClick={close}>مساحة مقدم الخدمة</Link>}
      {isAdmin && <Link href="/admin" className="font-bold text-brand" onClick={close}>الإدارة</Link>}
    </>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-theme bg-[rgb(var(--surface)/0.94)] backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-3 sm:px-5">
        <Link href="/" className="shrink-0 text-lg font-black tracking-tight text-[rgb(var(--text-main))]" aria-label="جسر الأردن — الرئيسية">
          <span className="text-brand">جسر</span> الأردن
        </Link>

        <form action="/discover" role="search" className="mx-auto hidden w-full max-w-xl lg:block">
          <label htmlFor="nav-search" className="sr-only">ابحث عن خدمة أو مقدم خدمة</label>
          <div className="relative">
            <Search className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
            <input id="nav-search" name="q" type="search" maxLength={120}
              placeholder="محتاج مدرس رياضيات، مبرمج متجر، سباك في عمّان..."
              className="h-11 w-full rounded-full border border-theme bg-[rgb(var(--surface-muted))] pe-10 ps-4 text-sm outline-none transition focus:bg-[rgb(var(--surface))]" />
          </div>
        </form>

        <nav aria-label="التنقل الرئيسي" className="hidden shrink-0 items-center gap-4 text-xs font-bold xl:flex">
          {navLinks}
        </nav>

        <div className="ms-auto flex shrink-0 items-center gap-1.5">
          <ThemeToggle />
          {isAuthenticated ? (
            <>
              <Link href="/favorites" aria-label="المفضلة"
                className="hidden h-10 w-10 items-center justify-center rounded-full border border-theme transition hover:bg-surface-muted sm:inline-flex">
                <Heart className="h-4 w-4" aria-hidden="true" />
              </Link>
              <NotificationsBell />
              <Link href="/profile" className="hidden rounded-full bg-[rgb(var(--primary-soft))] px-3 py-2 text-xs font-bold text-brand sm:inline-block">
                حسابي
              </Link>
            </>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Link href="/login" className="px-2 py-2 text-xs font-bold">دخول</Link>
              <Link href="/register" className="brand-button !min-h-10 !rounded-full !px-4 !py-1.5">إنشاء حساب</Link>
            </div>
          )}
          <button type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-theme xl:hidden"
            onClick={() => setMobileOpen((open) => !open)}
            aria-label={mobileOpen ? "إغلاق القائمة" : "فتح القائمة"}
            aria-expanded={mobileOpen}
            aria-controls="mobile-navigation">
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div id="mobile-navigation" className="border-t border-theme bg-surface xl:hidden">
          <div className="mx-auto max-w-7xl space-y-4 px-4 py-4">
            <form action="/discover" role="search" className="lg:hidden">
              <label htmlFor="mobile-search" className="sr-only">ابحث في جسر الأردن</label>
              <div className="relative">
                <Search className="absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
                <input id="mobile-search" name="q" type="search" maxLength={120}
                  placeholder="عن ماذا تبحث؟" className="form-field !rounded-full pe-10" />
              </div>
            </form>
            <nav aria-label="القائمة الموسعة" className="grid gap-1 text-sm font-bold">
              {navLinks}
              {isAuthenticated ? (
                <>
                  <Link href="/favorites" onClick={close}>المفضلة</Link>
                  <Link href="/profile" onClick={close}>الملف الشخصي</Link>
                </>
              ) : (
                <>
                  <Link href="/login" onClick={close}>تسجيل الدخول</Link>
                  <Link href="/register" onClick={close}>إنشاء حساب</Link>
                </>
              )}
              {isAuthenticated && !isProvider && (
                <Link href="/provider/apply" className="text-brand" onClick={close}>انضم كمقدم خدمة</Link>
              )}
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}
