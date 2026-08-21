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
      className="group flex shrink-0 items-center gap-2.5 rounded-2xl outline-none transition-transform duration-200 active:scale-[0.97]"
    >
      <span
        className="brand-mark h-10 w-10 text-lg transition-transform duration-200 group-hover:-rotate-3 group-hover:scale-105"
        aria-hidden="true"
      >
        ج
      </span>

      <span className="leading-none">
        <span className="block text-[17px] font-black tracking-[-.04em]">
          جسر
        </span>
        <span className="mt-0.5 block text-[9px] font-bold tracking-[.18em] text-muted">
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
      className={`relative whitespace-nowrap rounded-2xl px-4 py-2 text-xs font-bold transition-all duration-200 active:scale-[0.96] ${
        active
          ? "bg-[rgb(var(--primary-soft))] text-[rgb(var(--primary))]"
          : "text-muted hover:bg-surface-muted hover:text-[rgb(var(--text-main))]"
      }`}
    >
      {label}
      {active && (
        <span
          className="absolute inset-x-4 -bottom-[9px] h-0.5 rounded-full bg-[rgb(var(--primary))]"
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
    <header className="sticky top-0 z-40 border-b border-theme bg-[rgb(var(--canvas)/0.88)] backdrop-blur-2xl transition-all">
      <div className="relative mx-auto flex h-[72px] max-w-6xl items-center justify-between px-4 sm:px-6">
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
              className="group hidden h-11 items-center gap-2 rounded-full border border-theme bg-surface px-3.5 text-xs font-bold shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[rgb(var(--primary)/0.3)] active:scale-[0.97] sm:flex"
            >
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[rgb(var(--primary-soft))] text-[11px] font-black text-brand">
                ج
              </span>
              حسابي
            </Link>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Link
                href="/login"
                className="secondary-button !min-h-[42px] !rounded-full !px-4 text-xs font-bold"
              >
                تسجيل الدخول
              </Link>

              <Link
                href="/register"
                className="brand-button !min-h-[42px] !rounded-full !px-4 text-xs font-bold"
              >
                إنشاء حساب
              </Link>
            </div>
          )}

          <button
            type="button"
            onClick={() => setMobileOpen((open) => !open)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-theme bg-surface text-muted shadow-sm transition-all duration-200 hover:text-[rgb(var(--text-main))] active:scale-95 md:hidden"
            aria-label={mobileOpen ? "إغلاق القائمة" : "فتح القائمة"}
            aria-expanded={mobileOpen}
            aria-controls="mobile-navigation"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {(isProvider || isAdmin) && (
        <div className="hidden border-t border-theme/60 md:block">
          <div className="mx-auto flex h-9 max-w-6xl items-center justify-center gap-3 px-6 text-[11px] font-bold">
            {isProvider && (
              <Link
                href="/provider"
                className="rounded-full px-3 py-1 text-brand transition-all hover:bg-[rgb(var(--primary-soft))] active:scale-95"
              >
                مساحة مقدم الخدمة
              </Link>
            )}

            {isAdmin && (
              <Link
                href="/admin"
                className="rounded-full px-3 py-1 text-brand transition-all hover:bg-[rgb(var(--primary-soft))] active:scale-95"
              >
                لوحة الإدارة
              </Link>
            )}
          </div>
        </div>
      )}

      {mobileOpen && (
        <div
          id="mobile-navigation"
          className="page-reveal border-t border-theme bg-[rgb(var(--surface)/0.96)] px-4 py-4 backdrop-blur-2xl md:hidden"
        >
          <div className="mx-auto grid max-w-lg grid-cols-2 gap-2.5">
            <Link
              href="/"
              onClick={close}
              className="flex items-center gap-2.5 rounded-2xl bg-surface-muted px-3.5 py-3 text-xs font-bold transition active:scale-95"
            >
              <Home size={17} className="text-brand" />
              الرئيسية
            </Link>

            <Link
              href="/discover"
              onClick={close}
              className="flex items-center gap-2.5 rounded-2xl bg-surface-muted px-3.5 py-3 text-xs font-bold transition active:scale-95"
            >
              <Compass size={17} className="text-brand" />
              اكتشف
            </Link>

            {isAuthenticated && (
              <>
                <Link
                  href="/bookings"
                  onClick={close}
                  className="flex items-center gap-2.5 rounded-2xl bg-surface-muted px-3.5 py-3 text-xs font-bold transition active:scale-95"
                >
                  <BriefcaseBusiness size={17} className="text-brand" />
                  طلباتي
                </Link>

                <Link
                  href="/messages"
                  onClick={close}
                  className="flex items-center gap-2.5 rounded-2xl bg-surface-muted px-3.5 py-3 text-xs font-bold transition active:scale-95"
                >
                  <MessageCircle size={17} className="text-brand" />
                  الرسائل
                </Link>

                <Link
                  href="/favorites"
                  onClick={close}
                  className="flex items-center gap-2.5 rounded-2xl bg-surface-muted px-3.5 py-3 text-xs font-bold transition active:scale-95"
                >
                  <Heart size={17} className="text-brand" />
                  المحفوظات
                </Link>

                <Link
                  href="/profile"
                  onClick={close}
                  className="flex items-center gap-2.5 rounded-2xl bg-surface-muted px-3.5 py-3 text-xs font-bold transition active:scale-95"
                >
                  <Settings size={17} className="text-brand" />
                  حسابي
                </Link>
              </>
            )}

            {!isAuthenticated && (
              <>
                <Link
                  href="/login"
                  onClick={close}
                  className="flex items-center justify-center rounded-2xl border border-theme bg-surface px-3 py-3 text-xs font-bold transition active:scale-95"
                >
                  تسجيل الدخول
                </Link>

                <Link
                  href="/register"
                  onClick={close}
                  className="brand-button !min-h-[44px] text-xs font-bold"
                >
                  إنشاء حساب
                </Link>
              </>
            )}

            {isAuthenticated && !isProvider && (
              <Link
                href="/provider/apply"
                onClick={close}
                className="col-span-2 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#0b8f87] to-[#07645f] px-3 py-3 text-xs font-black text-white shadow-md active:scale-95"
              >
                <BriefcaseBusiness size={17} />
                سجّل كمقدم خدمة على جسر
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}