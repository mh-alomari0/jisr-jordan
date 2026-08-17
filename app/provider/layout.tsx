import Link from "next/link";

export default function ProviderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row dir-rtl">
      {/* القائمة الجانبية للمزود */}
      <aside className="w-full md:w-64 bg-white border-l p-6 space-y-6">
        <div className="border-b pb-4">
          <Link href="/provider" className="text-xl font-bold text-gray-900">
            جسر | بوابة المزودين
          </Link>
          <p className="text-xs text-gray-500 mt-1">إدارة الأعمال والمواعيد</p>
        </div>

        <nav className="flex flex-col space-y-2 text-sm font-medium">
          <Link
            href="/provider"
            className="p-2.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            الطلبات الحالية والحجوزات
          </Link>
          <Link
            href="/provider/schedule"
            className="p-2.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            جدول أوقات العمل
          </Link>
          <div className="pt-4 border-t">
            <Link
              href="/"
              className="p-2.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors block text-center"
            >
              العودة للرئيسية
            </Link>
          </div>
        </nav>
      </aside>

      {/* المحتوى الرئيسي */}
      <main className="flex-1 p-2 md:p-6 overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}