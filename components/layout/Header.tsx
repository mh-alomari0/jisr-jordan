"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Wrench, Calendar, LogIn, LogOut, User, Menu, X } from "lucide-react";

export default function Header() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<{ id: string; email?: string; fullName?: string } | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUser({
          id: user.id,
          email: user.email,
          fullName: user.user_metadata?.full_name || user.email,
        });
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email,
          fullName: session.user.user_metadata?.full_name || session.user.email,
        });
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsOpen(false);
    router.push("/login");
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-neutral-border transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        
        {/* الشعار */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-11 h-11 bg-primary rounded-xl flex items-center justify-center text-white shadow-md group-hover:bg-primary-hover transition-colors">
            <Wrench className="w-6 h-6 stroke-[2.25]" />
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-extrabold text-neutral-text tracking-tight flex items-center gap-1">
              جسر <span className="text-secondary text-xl font-bold">| JISR</span>
            </span>
            <span className="text-[10px] font-medium text-neutral-muted -mt-1">صيانة منزلك بأمان وثقة</span>
          </div>
        </Link>

        {/* القائمة الرئيسية */}
        <nav className="hidden md:flex items-center gap-8 font-medium text-neutral-text text-base">
          <Link href="/" className="hover:text-primary transition-colors">الرئيسية</Link>
          <Link href="/services" className="hover:text-primary transition-colors">الخدمات</Link>
          <Link href="/bookings" className="flex items-center gap-1.5 hover:text-primary transition-colors">
            <Calendar className="w-4 h-4 text-primary" />
            <span>حجوزاتي</span>
          </Link>
        </nav>

        {/* زر الحساب المحدث لإظهار الاسم */}
        <div className="hidden md:flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-3">
              <Link
  href="/profile"
  className="flex items-center gap-2 bg-neutral-surface border border-neutral-border px-4 py-2 rounded-btn text-xs font-bold text-neutral-text hover:bg-neutral-border transition-colors"
  title="إدارة الملف الشخصي"
>
  <User className="w-4 h-4 text-primary" />
  <span className="max-w-[140px] truncate">{user.fullName}</span>
</Link>
              <button
                onClick={handleLogout}
                className="p-2 text-neutral-muted hover:text-rose-600 transition-colors"
                title="تسجيل الخروج"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-btn font-semibold hover:bg-primary-hover transition-colors shadow-sm text-sm"
            >
              <LogIn className="w-4 h-4" />
              <span>تسجيل الدخول</span>
            </Link>
          )}
        </div>

        {/* زر الموبايل */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="md:hidden p-2 rounded-lg text-neutral-text hover:bg-neutral-surface"
          aria-label="قائمة التنقل"
        >
          {isOpen ? <X className="w-7 h-7" /> : <Menu className="w-7 h-7" />}
        </button>
      </div>

      {/* قائمة الموبايل */}
      {isOpen && (
        <div className="md:hidden bg-white border-b border-neutral-border px-4 pt-2 pb-6 flex flex-col gap-4 font-medium">
          <Link href="/" onClick={() => setIsOpen(false)} className="py-2 border-b border-neutral-border/50">
            الرئيسية
          </Link>
          <Link href="/services" onClick={() => setIsOpen(false)} className="py-2 border-b border-neutral-border/50">
            الخدمات
          </Link>
          <Link href="/bookings" onClick={() => setIsOpen(false)} className="py-2 border-b border-neutral-border/50 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            <span>حجوزاتي</span>
          </Link>

          {user ? (
            <button
              onClick={handleLogout}
              className="flex items-center justify-center gap-2 bg-rose-50 text-rose-600 py-3 rounded-btn font-semibold mt-2"
            >
              <LogOut className="w-4 h-4" />
              <span>تسجيل الخروج ({user.fullName})</span>
            </button>
          ) : (
            <Link
              href="/login"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-center gap-2 bg-primary text-white py-3 rounded-btn mt-2 font-semibold"
            >
              <LogIn className="w-4 h-4" />
              <span>تسجيل الدخول</span>
            </Link>
          )}
        </div>
      )}
    </header>
  );
}