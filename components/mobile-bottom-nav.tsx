"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BriefcaseBusiness,
  CalendarDays,
  Compass,
  Home,
  LayoutDashboard,
  MessageCircle,
  Store,
  UserRound,
} from "lucide-react";

const customerLinks = [
  { href: "/", label: "الرئيسية", icon: Home },
  { href: "/discover", label: "اكتشف", icon: Compass },
  { href: "/bookings", label: "طلباتي", icon: CalendarDays },
  { href: "/messages", label: "الرسائل", icon: MessageCircle, badge: true },
  { href: "/profile", label: "حسابي", icon: UserRound },
];

const providerLinks = [
  { href: "/provider", label: "الرئيسية", icon: LayoutDashboard },
  { href: "/provider/bookings", label: "الطلبات", icon: BriefcaseBusiness },
  { href: "/provider/listings", label: "خدماتي", icon: Store },
  { href: "/messages", label: "الرسائل", icon: MessageCircle, badge: true },
  { href: "/provider/profile", label: "حسابي", icon: UserRound },
];

export default function MobileBottomNav({
  userRole,
}: {
  userRole?: string | null;
}) {
  const pathname = usePathname();

  if (["ADMIN", "SUPER_ADMIN"].includes(userRole || "")) {
    return null;
  }

  const links = userRole === "STAFF" ? providerLinks : customerLinks;

  return (
    <nav
      aria-label="التنقل الرئيسي على الهاتف"
      className="fixed inset-x-0 bottom-0 z-50 px-3 pb-[max(0.6rem,env(safe-area-inset-bottom))] pt-1 md:hidden pointer-events-none"
    >
      <div className="pointer-events-auto mx-auto flex max-w-md items-center justify-around rounded-[2rem] border border-[rgb(var(--border)/0.8)] bg-[rgb(var(--surface)/0.88)] p-1.5 shadow-[0_12px_40px_rgb(var(--shadow)/0.18)] backdrop-blur-2xl transition-all duration-300">
        {links.map(({ href, label, icon: Icon, badge }) => {
          const active =
            href === "/"
              ? pathname === "/"
              : pathname === href || pathname.startsWith(`${href}/`);

          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`relative flex flex-1 flex-col items-center justify-center py-1 transition-all duration-200 active:scale-90 ${
                active
                  ? "text-[rgb(var(--primary))]"
                  : "text-muted hover:text-[rgb(var(--text-main))]"
              }`}
            >
              <div
                className={`relative flex h-8 w-12 items-center justify-center rounded-2xl transition-all duration-300 ${
                  active
                    ? "bg-[rgb(var(--primary)/0.16)] text-[rgb(var(--primary))] shadow-sm"
                    : "bg-transparent"
                }`}
              >
                <Icon
                  size={19}
                  strokeWidth={active ? 2.5 : 1.8}
                  className="transition-transform duration-200"
                  aria-hidden="true"
                />
                {badge && (
                  <span className="absolute 1.5 top-0 flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[rgb(var(--accent-peach))] opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-[rgb(var(--accent-peach))]" />
                  </span>
                )}
              </div>
              <span
                className={`mt-1 text-[10px] tracking-tight transition-all ${
                  active ? "font-black" : "font-medium opacity-85"
                }`}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}