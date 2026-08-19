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
  { href: "/messages", label: "الرسائل", icon: MessageCircle },
  { href: "/profile", label: "حسابي", icon: UserRound },
];

const providerLinks = [
  { href: "/provider", label: "الرئيسية", icon: LayoutDashboard },
  { href: "/provider/bookings", label: "الطلبات", icon: BriefcaseBusiness },
  { href: "/provider/listings", label: "خدماتي", icon: Store },
  { href: "/messages", label: "الرسائل", icon: MessageCircle },
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
      className="fixed inset-x-0 bottom-0 z-50 border-t border-theme bg-[rgb(var(--canvas)/0.94)] px-3 pb-[max(10px,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl md:hidden"
    >
      <div className="mx-auto flex max-w-md items-end justify-between">
        {links.map(({ href, label, icon: Icon }, index) => {
          const active =
            href === "/"
              ? pathname === "/"
              : pathname === href || pathname.startsWith(`${href}/`);

          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex min-w-[56px] flex-col items-center gap-1 rounded-xl px-2 py-1.5 text-[10px] font-semibold transition ${
                active ? "text-brand" : "text-muted"
              }`}
            >
              <span
                className={`relative flex h-7 w-9 items-center justify-center rounded-full transition ${
                  active ? "bg-[rgb(var(--primary)/0.12)]" : ""
                }`}
              >
                <Icon
                  size={18}
                  strokeWidth={active ? 2.5 : 1.8}
                  aria-hidden="true"
                />
                {index === 3 && (
                  <span className="absolute right-0.5 top-0 h-1.5 w-1.5 rounded-full bg-[rgb(var(--accent-peach))]" />
                )}
              </span>
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
