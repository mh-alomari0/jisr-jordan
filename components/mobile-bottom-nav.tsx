import Link from "next/link";
import { Bell, CalendarDays, Compass, Home, UserRound } from "lucide-react";

const links = [
  { href: "/", label: "الرئيسية", icon: Home },
  { href: "/discover", label: "استكشاف", icon: Compass },
  { href: "/bookings", label: "حجوزاتي", icon: CalendarDays },
  { href: "/notifications", label: "الإشعارات", icon: Bell },
  { href: "/profile", label: "حسابي", icon: UserRound },
];

export default function MobileBottomNav() {
  return (
    <nav aria-label="التنقل الرئيسي على الهاتف"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-[rgb(var(--border))] bg-[rgb(var(--surface)/0.96)] px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <div className="mx-auto grid max-w-lg grid-cols-5">
        {links.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href}
            className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-lg text-[10px] font-bold text-[rgb(var(--text-muted))] transition hover:text-[rgb(var(--primary))] focus-visible:text-[rgb(var(--primary))]">
            <Icon className="h-5 w-5" aria-hidden="true" />
            <span>{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}

