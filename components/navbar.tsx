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
      className="group flex shrink-0 items-center gap-2.5 rounded-2xl outline-none transition-transform duration-200 ease-out active:scale-[0.97]"
    >
      <span
        className="brand-mark h-10 w-10 text-lg transition-transform duration-200 ease-out group-hover:-rotate-3 group-hover:scale-[1.04]"
        aria-hidden="true"
      >
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

function NavLink({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  const pathname = usePathname();
  const active =
    href === "/"
      ? pathname === "/"
      : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`relative whitespace-nowrap rounded-2xl px-4 py-2.5 text-xs font-semibold transition-all duration-200 ease-out active:scale-[0.96] ${
        active
          ? "bg-[rgb(var(--primary-soft))] text-[rgb(var(--text-main))]"
          : "text-muted hover:bg-surface-muted hover:text-[rgb(var(--text-main))]"
      }`}
    >
      {label}
      {active && (
        <span
          className="absolute inset-x-4 -bottom-[7px] h-0.5 rounded-full bg-[rgb(var(--primary))]"
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
    <header className="sticky top-0 z-40 border-b border-theme bg-[rgb(var(--canvas)/0.92)] backdrop-blur-xl">
      <div className="relative mx-auto flex h-[76px] max-w-6xl items-center justify-between px-4 sm:px-6">
        <Brand />

        <nav
          aria-label="التنقل الرئيسي"
          className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 md:flex"
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
              className="group hidden h-11 items-center gap-2 rounded-full border border-theme bg-surface px-3.5 text-xs font-bold shadow-[0_5px_18px_rgb(var(--shadow)/0.05)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-[rgb(var(--primary)/0.28)] hover:shadow-[0_8px_24px_rgb(var(--shadow)/0.09)] active:translate-y-0 active:scale-[0.97] sm:flex"
            >
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[rgb(var(--accent-sand)/0.46)] text-[10px] font-bold transition-transform duration-200 group-hover:scale-105">
                ج
              </span>
              حسابي
            </Link>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Link
                href="/login"
                className="inline-flex h-11 items-center justify-center rounded-full border border-theme bg-surface px-4 text-xs font-bold shadow-[0_4px_15px_rgb(var(--shadow)/0.04)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-[rgb(var(--primary)/0.25)] hover:bg-surface-muted active:translate-y-0 active:scale-[0.97]"
              >
                تسجيل الدخول
              </Link>

              <Link
                href="/register"
                className="inline-flex h-11 items-center justify-center rounded-full bg-[rgb(var(--primary))] px-4 text-xs font-bold text-white shadow-[0_8px_22px_rgb(var(--primary)/0.20)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-[rgb(var(--primary-strong))] hover:shadow-[0_10px_28px_rgb(var(--primary)/0.25)] active:translate-y-0 active:scale-[0.97]"
              >
                إنشاء حساب
              </Link>
            </div>
          )}

          <button
            type="button"
            onClick={() => setMobileOpen((open) => !open)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-theme bg-surface shadow-[0_4px_15px_rgb(var(--shadow)/0.04)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-[rgb(var(--primary)/0.25)] hover:bg-surface-muted active:translate-y-0 active:scale-[0.94] md:hidden"
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
                className="rounded-full px-3 py-1 text-brand transition-all duration-200 hover:bg-[rgb(var(--primary-soft))] active:scale-[0.97]"
              >
                مساحة مقدم الخدمة
              </Link>
            )}

            {isAdmin && (
              <Link
                href="/admin"
                className="rounded-full px-3 py-1 text-brand transition-all duration-200 hover:bg-[rgb(var(--primary-soft))] active:scale-[0.97]"
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
          className="page-reveal border-t border-theme bg-[rgb(var(--surface)/0.97)] px-4 py-3 backdrop-blur-xl md:hidden"
        >
          <div className="mx-auto grid max-w-lg grid-cols-2 gap-2">
            <Link
              href="/"
              onClick={close}
              className="flex items-center gap-2 rounded-2xl bg-surface-muted px-3 py-3 text-xs font-semibold transition-all duration-200 active:scale-[0.98]"
            >
              <Home size={16} className="text-brand" />
              الرئيسية
            </Link>

            <Link
              href="/discover"
              onClick={close}
              className="flex items-center gap-2 rounded-2xl bg-surface-muted px-3 py-3 text-xs font-semibold transition-all duration-200 active:scale-[0.98]"
            >
              <Compass size={16} className="text-brand" />
              اكتشف
            </Link>

            {isAuthenticated && (
              <>
                <Link
                  href="/bookings"
                  onClick={close}
                  className="flex items-center gap-2 rounded-2xl bg-surface-muted px-3 py-3 text-xs font-semibold transition-all duration-200 active:scale-[0.98]"
                >
                  <BriefcaseBusiness size={16} className="text-brand" />
                  طلباتي
                </Link>

                <Link
                  href="/messages"
                  onClick={close}
                  className="flex items-center gap-2 rounded-2xl bg-surface-muted px-3 py-3 text-xs font-semibold transition-all duration-200 active:scale-[0.98]"
                >
                  <MessageCircle size={16} className="text-brand" />
                  الرسائل
                </Link>

                <Link
                  href="/favorites"
                  onClick={close}
                  className="flex items-center gap-2 rounded-2xl bg-surface-muted px-3 py-3 text-xs font-semibold transition-all duration-200 active:scale-[0.98]"
                >
                  <Heart size={16} className="text-brand" />
                  المحفوظات
                </Link>

                <Link
                  href="/profile"
                  onClick={close}
                  className="flex items-center gap-2 rounded-2xl bg-surface-muted px-3 py-3 text-xs font-semibold transition-all duration-200 active:scale-[0.98]"
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
                  className="flex items-center justify-center rounded-2xl border border-theme bg-surface px-3 py-3 text-xs font-semibold transition-all duration-200 active:scale-[0.98]"
                >
                  تسجيل الدخول
                </Link>

                <Link
                  href="/register"
                  onClick={close}
                  className="flex items-center justify-center rounded-2xl bg-[rgb(var(--primary))] px-3 py-3 text-xs font-bold text-white transition-all duration-200 active:scale-[0.98]"
                >
                  إنشاء حساب
                </Link>
              </>
            )}

            {isAuthenticated && !isProvider && (
              <Link
                href="/provider/apply"
                onClick={close}
                className="col-span-2 flex items-center gap-2 rounded-2xl bg-[rgb(var(--primary))] px-3 py-3 text-xs font-semibold text-white transition-all duration-200 active:scale-[0.98]"
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
