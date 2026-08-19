import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 border-t border-gray-800 text-xs dir-rtl mt-auto">
      <div className="container mx-auto px-6 py-10 grid gap-8 md:grid-cols-4 text-right">
        <div className="space-y-3">
          <h3 className="text-white text-base font-bold">جسر الأردن</h3>
          <p className="text-gray-400 leading-relaxed">
            المنصة المركزية لحجز وإدارة خدمات الصيانة المنزلية والاحترافية بأمان وسهولة داخل المملكة الأردنية الهاشمية.
          </p>
        </div>

        <div className="space-y-2">
          <h4 className="text-white font-bold text-sm">روابط سريعة</h4>
          <ul className="space-y-1.5">
            <li>
              <Link href="/services" className="hover:text-white transition-colors">
                دليل الخدمات
              </Link>
            </li>
            <li>
              <Link href="/bookings" className="hover:text-white transition-colors">
                متابعة الحجوزات
              </Link>
            </li>
            <li>
              <Link href="/profile" className="hover:text-white transition-colors">
                الملف الشخصي
              </Link>
            </li>
          </ul>
        </div>

        <div className="space-y-2">
          <h4 className="text-white font-bold text-sm">الدعم والسياسات</h4>
          <ul className="space-y-1.5">
            <li>
              <Link href="/faq" className="hover:text-white transition-colors">
                الأسئلة الشائعة
              </Link>
            </li>
            <li>
              <Link href="/terms" className="hover:text-white transition-colors">
                الشروط والأحكام
              </Link>
            </li>
            <li>
              <Link href="/privacy" className="hover:text-white transition-colors">
                سياسة الخصوصية
              </Link>
            </li>
            <li>
              <Link href="/contact" className="hover:text-white transition-colors">
                تواصل معنا
              </Link>
            </li>
          </ul>
        </div>

        <div className="space-y-2">
          <h4 className="text-white font-bold text-sm">تواصل معنا</h4>
          <p className="text-gray-400">عمان / الزرقاء - المملكة الأردنية الهاشمية</p>
          <p className="text-gray-400 dir-ltr text-right">support@jisr-jordan.com</p>
        </div>
      </div>

      <div className="border-t border-gray-800 py-4 text-center text-gray-500">
        © {new Date().getFullYear()} جسر الأردن. جميع الحقوق محفوظة.
      </div>
    </footer>
  );
}
