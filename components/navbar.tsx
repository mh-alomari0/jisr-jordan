"use client";

import { useState } from "react";
import Link from "next/link";
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
      className="flex shrink-0 items-center gap-2.5"
      aria-label="جسر الأردن — الرئيسية"
    >
      <span className="brand-mark h-10 w-10 text-lg" aria-hidden="true">
        ج
      </span>

      <span className="leading-none">
        <span className="block text-[17px] font-bold tracking-[-.04em]">
          جسر
        </span>
        <span className="mt-1 block text-[9px] font-medium tracking-[.18em] text-muted">
          JISR · JORDAN
        </span>
      </span>
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
    <header className="sticky top-0 z-40 border-b border-theme bg-[rgb(var(--canvas)/0.9)] backdrop-blur-xl">
      <div className="relative mx-auto flex h-[72px] max-w-6xl items-center justify-between px-4 sm:px-6">
        <Brand />

        <nav
          aria-label="التنقل الرئيسي"
          className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 md:flex"
        >
          {primaryLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="whitespace-nowrap rounded-xl px-4 py-2.5 text-xs font-semibold text-muted transition hover:bg-surface-muted hover:text-[rgb(var(--text-main))]"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          {isAuthenticated && <NotificationsBell />}
          <ThemeToggle />

          {isAuthenticated ? (
            <Link
              href="/profile"
              className="hidden h-10 items-center gap-2 rounded-full border border-theme bg-surface px-3 text-xs font-semibold sm:flex"
            >
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[rgb(var(--accent-sand)/0.45)] text-[10px] font-bold">
                ج
              </span>
              حسابي
            </Link>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Link
                href="/login"
                className="rounded-full border border-theme bg-surface px-4 py-2.5 text-xs font-semibold"
              >
                تسجيل الدخول
              </Link>
              <Link
                href="/register"
                className="rounded-full bg-[rgb(var(--primary))] px-4 py-2.5 text-xs font-bold text-white"
              >
                إنشاء حساب
              </Link>
            </div>
          )}

          <button
            type="button"
            onClick={() => setMobileOpen((open) => !open)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-theme bg-surface md:hidden"
            aria-label={mobileOpen ? "إغلاق القائمة" : "فتح القائمة"}
            aria-expanded={mobileOpen}
            aria-controls="mobile-navigation"
          >
            {mobileOpen ? <X size={19} /> : <Menu size={19} />}
          </button>
        </div>
      </div>

      {(isProvider || isAdmin) && (
        <div className="hidden border-t border-theme/70 md:block">
          <div className="mx-auto flex h-9 max-w-6xl items-center justify-center gap-2 px-6 text-[10px] font-semibold">
            {isProvider && (
              <Link
                href="/provider"
                className="rounded-full px-3 py-1 text-brand hover:bg-[rgb(var(--primary-soft))]"
              >
                مساحة مقدم الخدمة
              </Link>
            )}

            {isAdmin && (
              <Link
                href="/admin"
                className="rounded-full px-3 py-1 text-brand hover:bg-[rgb(var(--primary-soft))]"
              >
                الإدارة
              </Link>
            )}
          </div>
        </div>
      )}

      {mobileOpen && (
        <div
          id="mobile-navigation"
          className="page-reveal border-t border-theme bg-surface px-4 py-3 md:hidden"
        >
          <div className="mx-auto grid max-w-lg grid-cols-2 gap-2">
            <Link
              href="/"
              onClick={close}
              className="flex items-center gap-2 rounded-xl bg-surface-muted px-3 py-3 text-xs font-semibold"
            >
              <Home size={16} className="text-brand" />
              الرئيسية
            </Link>

            <Link
              href="/discover"
              onClick={close}
              className="flex items-center gap-2 rounded-xl bg-surface-muted px-3 py-3 text-xs font-semibold"
            >
              <Compass size={16} className="text-brand" />
              اكتشف
            </Link>

            {isAuthenticated && (
              <>
                <Link
                  href="/bookings"
                  onClick={close}
                  className="flex items-center gap-2 rounded-xl bg-surface-muted px-3 py-3 text-xs font-semibold"
                >
                  <BriefcaseBusiness size={16} className="text-brand" />
                  طلباتي
                </Link>

                <Link
                  href="/messages"
                  onClick={close}
                  className="flex items-center gap-2 rounded-xl bg-surface-muted px-3 py-3 text-xs font-semibold"
                >
                  <MessageCircle size={16} className="text-brand" />
                  الرسائل
                </Link>

                <Link
                  href="/favorites"
                  onClick={close}
                  className="flex items-center gap-2 rounded-xl bg-surface-muted px-3 py-3 text-xs font-semibold"
                >
                  <Heart size={16} className="text-brand" />
                  المحفوظات
                </Link>

                <Link
                  href="/profile"
                  onClick={close}
                  className="flex items-center gap-2 rounded-xl bg-surface-muted px-3 py-3 text-xs font-semibold"
                >
                  <Settings size={16} className="text-brand" />
                  حسابي
                </Link>
              </>
            )}

            {!isAuthenticated && (
              <>
                <Link
                  href="/login"
                  onClick={close}
                  className="flex items-center justify-center rounded-xl border border-theme bg-surface px-3 py-3 text-xs font-semibold"
                >
                  تسجيل الدخول
                </Link>
                <Link
                  href="/register"
                  onClick={close}
                  className="flex items-center justify-center rounded-xl bg-[rgb(var(--primary))] px-3 py-3 text-xs font-bold text-white"
                >
                  إنشاء حساب
                </Link>
              </>
            )}

            {isAuthenticated && !isProvider && (
              <Link
                href="/provider/apply"
                onClick={close}
                className="col-span-2 flex items-center gap-2 rounded-xl bg-[rgb(var(--primary))] px-3 py-3 text-xs font-semibold text-white"
              >
                <BriefcaseBusiness size={16} />
                سجّل كمقدم خدمة
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
