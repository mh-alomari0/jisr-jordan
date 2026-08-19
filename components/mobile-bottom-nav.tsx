"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BriefcaseBusiness, CalendarDays, Compass, Home, LayoutDashboard, MessageCircle, Store, UserRound } from "lucide-react";

const customerLinks = [
  { href: "/", label: "الرئيسية", icon: Home },
  { href: "/discover", label: "استكشاف", icon: Compass },
  { href: "/bookings", label: "حجوزاتي", icon: CalendarDays },
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

export default function MobileBottomNav({ userRole }: { userRole?: string | null }) {
  const pathname = usePathname();
  if (["ADMIN", "SUPER_ADMIN"].includes(userRole || "")) return null;
  const links = userRole === "STAFF" ? providerLinks : customerLinks;
  return (
    <nav aria-label="التنقل الرئيسي على الهاتف"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-[rgb(var(--border))] bg-[rgb(var(--surface)/0.96)] px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <div className="mx-auto grid max-w-lg grid-cols-5">
        {links.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
          return (
          <Link key={href} href={href}
            aria-current={active ? "page" : undefined}
            className={`relative flex min-h-16 flex-col items-center justify-center gap-1 text-[10px] font-bold transition ${active ? "text-brand" : "text-[rgb(var(--text-muted))] hover:text-brand"}`}>
            {active && <span className="absolute top-1.5 h-1 w-5 rounded-full bg-[rgb(var(--primary))]" aria-hidden="true" />}
            <Icon className="h-5 w-5" aria-hidden="true" />
            <span>{label}</span>
          </Link>
        );})}
      </div>
    </nav>
  );
}
