import Link from "next/link";
import { Wrench, Phone, Mail, MapPin, ShieldCheck } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-neutral-text text-white pt-16 pb-8 border-t-4 border-primary">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-10">
        
        {/* عن المنصة */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white">
              <Wrench className="w-5 h-5" />
            </div>
            <span className="text-2xl font-bold">جسر | JISR</span>
          </div>
          <p className="text-neutral-300 text-sm leading-relaxed">
            منصة أردنية مخصصة لربط أصحاب المنازل بأفضل الفنيين المعتمدين لمختلف أعمال الصيانة المنزلية بسهولة وأمان تام.
          </p>
          <div className="flex items-center gap-2 text-primary-light text-xs font-semibold">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <span>ضمان جودة الخدمة وشفافية الأسعار</span>
          </div>
        </div>

        {/* روابط سريعة */}
        <div className="flex flex-col gap-3">
          <h3 className="text-lg font-bold text-white mb-2 border-r-2 border-secondary pr-2">روابط سريعة</h3>
          <Link href="/" className="text-neutral-300 hover:text-white text-sm transition-colors">الرئيسية</Link>
          <Link href="/services" className="text-neutral-300 hover:text-white text-sm transition-colors">دليل الخدمات</Link>
          <Link href="/bookings" className="text-neutral-300 hover:text-white text-sm transition-colors">متابعة الحجوزات</Link>
          <Link href="/login" className="text-neutral-300 hover:text-white text-sm transition-colors">تسجيل الدخول</Link>
        </div>

        {/* الخدمات الأكثر طلباً */}
        <div className="flex flex-col gap-3">
          <h3 className="text-lg font-bold text-white mb-2 border-r-2 border-secondary pr-2">الخدمات المتاحة</h3>
          <span className="text-neutral-300 text-sm">السباكة والمديدات الصحية</span>
          <span className="text-neutral-300 text-sm">الكهرباء والتمديدات</span>
          <span className="text-neutral-300 text-sm">التكييف والتبريد</span>
          <span className="text-neutral-300 text-sm">النجارة وتفكيك الأثاث</span>
          <span className="text-neutral-300 text-sm">الدهان والديكورات</span>
        </div>

        {/* معلومات التواصل */}
        <div className="flex flex-col gap-3">
          <h3 className="text-lg font-bold text-white mb-2 border-r-2 border-secondary pr-2">تواصل معنا</h3>
          <div className="flex items-center gap-3 text-neutral-300 text-sm">
            <MapPin className="w-4 h-4 text-primary" />
            <span>المملكة الأردنية الهاشمية — عمّان</span>
          </div>
          <div className="flex items-center gap-3 text-neutral-300 text-sm">
            <Phone className="w-4 h-4 text-primary" />
            <span>+962 7 9000 0000</span>
          </div>
          <div className="flex items-center gap-3 text-neutral-300 text-sm">
            <Mail className="w-4 h-4 text-primary" />
            <span>support@jisr-jordan.com</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 pt-6 border-t border-slate-800 text-center text-xs text-neutral-400">
        جميع الحقوق محفوظة © {new Date().getFullYear()} منصة جسر للصيانة المنزلية.
      </div>
    </footer>
  );
}