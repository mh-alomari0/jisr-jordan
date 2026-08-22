"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BriefcaseBusiness,
  Compass,
  Heart,
  Home,
  Menu,
  MessageCircle,
  Settings,
  X,
} from "lucide-react";
import NotificationsBell from "./notifications-bell";
import ThemeToggle from "./theme-toggle";

function Brand() {
  return (
    <Link
      href="/"
      aria-label="جسر الأردن — الرئيسية"
      className="flex shrink-0 items-center gap-2.5 rounded-xl outline-none active:opacity-80"
    >
      <span className="brand-mark h-10 w-10 text-lg" aria-hidden="true">
        ج
      </span>

      <span className="leading-none">
        <span className="block text-[17px] font-black tracking-[-.04em]">
          جسر
        </span>
        <span className="mt-1 block text-[8px] font-bold tracking-[.16em] text-muted">
          JISR · JORDAN
        </span>
      </span>
    </Link>
  );
}

function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active =
    href === "/"
      ? pathname === "/"
      : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`relative whitespace-nowrap px-3 py-2 text-xs transition-colors ${
        active
          ? "font-black text-[rgb(var(--text-main))]"
          : "font-bold text-muted hover:text-[rgb(var(--text-main))]"
      }`}
    >
      {label}
      {active && (
        <span
          className="absolute inset-x-3 -bottom-[14px] h-[3px] rounded-t-full bg-[rgb(var(--primary))]"
          aria-hidden="true"
        />
      )}
    </Link>
  );
}

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

  const primaryLinks = [
    { href: "/", label: "الرئيسية" },
    { href: "/discover", label: "اكتشف" },
    ...(isAuthenticated ? [{ href: "/bookings", label: "طلباتي" }] : []),
    ...(isAuthenticated ? [{ href: "/messages", label: "الرسائل" }] : []),
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-theme bg-[rgb(var(--canvas)/0.94)] backdrop-blur-xl">
      <div className="relative mx-auto flex h-[72px] max-w-6xl items-center justify-between px-4 sm:px-6">
        <Brand />

        <nav
          aria-label="التنقل الرئيسي"
          className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-2 md:flex"
        >
          {primaryLinks.map((item) => (
            <NavLink key={item.href} href={item.href} label={item.label} />
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          {isAuthenticated && <NotificationsBell />}
          <ThemeToggle />

          {isAuthenticated ? (
            <Link
              href="/profile"
              className="hidden h-10 items-center gap-2 rounded-xl border border-theme bg-surface px-3.5 text-xs font-bold shadow-sm transition-colors hover:border-[rgb(var(--primary)/0.35)] hover:text-brand active:opacity-80 sm:flex"
            >
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-[rgb(var(--primary-soft))] text-[10px] font-black text-brand">
                ج
              </span>
              حسابي
            </Link>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Link
                href="/login"
                className="inline-flex min-h-[40px] items-center px-3 text-xs font-bold text-muted transition-colors hover:text-[rgb(var(--text-main))]"
              >
                تسجيل الدخول
              </Link>

              <Link
                href="/register"
                className="inline-flex min-h-[40px] items-center justify-center rounded-xl bg-[rgb(var(--primary))] px-4 text-xs font-black text-white shadow-sm transition active:scale-[0.98]"
              >
                إنشاء حساب
              </Link>
            </div>
          )}

          <button
            type="button"
            onClick={() => setMobileOpen((open) => !open)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-theme bg-surface text-muted shadow-sm transition-colors hover:text-[rgb(var(--text-main))] active:opacity-70 md:hidden"
            aria-label={mobileOpen ? "إغلاق القائمة" : "فتح القائمة"}
            aria-expanded={mobileOpen}
            aria-controls="mobile-navigation"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {(isProvider || isAdmin) && (
        <div className="hidden border-t border-theme/70 md:block">
          <div className="mx-auto flex h-9 max-w-6xl items-center justify-center gap-5 px-6 text-[11px] font-bold">
            {isProvider && (
              <Link href="/provider" className="text-brand hover:underline underline-offset-4">
                مساحة مقدم الخدمة
              </Link>
            )}

            {isAdmin && (
              <Link href="/admin" className="text-brand hover:underline underline-offset-4">
                لوحة الإدارة
              </Link>
            )}
          </div>
        </div>
      )}

      {mobileOpen && (
        <div
          id="mobile-navigation"
          className="border-t border-theme bg-[rgb(var(--surface)/0.98)] px-4 py-4 md:hidden"
        >
          <div className="mx-auto max-w-lg divide-y divide-[rgb(var(--border))]">
            <div className="grid grid-cols-2 gap-2 pb-3">
              <Link
                href="/"
                onClick={close}
                className="flex items-center gap-2.5 rounded-xl px-3 py-3 text-xs font-bold hover:bg-surface-muted active:opacity-70"
              >
                <Home size={17} className="text-brand" />
                الرئيسية
              </Link>

              <Link
                href="/discover"
                onClick={close}
                className="flex items-center gap-2.5 rounded-xl px-3 py-3 text-xs font-bold hover:bg-surface-muted active:opacity-70"
              >
                <Compass size={17} className="text-brand" />
                اكتشف
              </Link>

              {isAuthenticated && (
                <>
                  <Link
                    href="/bookings"
                    onClick={close}
                    className="flex items-center gap-2.5 rounded-xl px-3 py-3 text-xs font-bold hover:bg-surface-muted active:opacity-70"
                  >
                    <BriefcaseBusiness size={17} className="text-brand" />
                    طلباتي
                  </Link>

                  <Link
                    href="/messages"
                    onClick={close}
                    className="flex items-center gap-2.5 rounded-xl px-3 py-3 text-xs font-bold hover:bg-surface-muted active:opacity-70"
                  >
                    <MessageCircle size={17} className="text-brand" />
                    الرسائل
                  </Link>

                  <Link
                    href="/favorites"
                    onClick={close}
                    className="flex items-center gap-2.5 rounded-xl px-3 py-3 text-xs font-bold hover:bg-surface-muted active:opacity-70"
                  >
                    <Heart size={17} className="text-brand" />
                    المحفوظات
                  </Link>

                  <Link
                    href="/profile"
                    onClick={close}
                    className="flex items-center gap-2.5 rounded-xl px-3 py-3 text-xs font-bold hover:bg-surface-muted active:opacity-70"
                  >
                    <Settings size={17} className="text-brand" />
                    حسابي
                  </Link>
                </>
              )}
            </div>

            {!isAuthenticated && (
              <div className="grid grid-cols-2 gap-2 pt-3">
                <Link
                  href="/login"
                  onClick={close}
                  className="flex min-h-11 items-center justify-center rounded-xl border border-theme bg-surface px-3 text-xs font-bold"
                >
                  تسجيل الدخول
                </Link>

                <Link
                  href="/register"
                  onClick={close}
                  className="flex min-h-11 items-center justify-center rounded-xl bg-[rgb(var(--primary))] px-3 text-xs font-black text-white"
                >
                  إنشاء حساب
                </Link>
              </div>
            )}

            {isAuthenticated && !isProvider && (
              <div className="pt-3">
                <Link
                  href="/provider/apply"
                  onClick={close}
                  className="flex items-center justify-between rounded-xl border border-[rgb(var(--primary)/0.2)] bg-[rgb(var(--primary-soft)/0.65)] px-3.5 py-3 text-xs font-black text-brand"
                >
                  <span>عندك شغلة بتتقنها؟ سجّل كمقدم خدمة</span>
                  <BriefcaseBusiness size={17} />
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
