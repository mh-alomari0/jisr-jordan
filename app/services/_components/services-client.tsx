"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { searchServicesAction, ServiceItem } from "@/lib/actions/services-search";

const CATEGORIES = [
  { id: "ALL", label: "جميع الخدمات" },
  { id: "ELECTRICITY", label: "كهرباء" },
  { id: "PLUMBING", label: "سباكة" },
  { id: "CLEANING", label: "تنظيف" },
  { id: "HVAC", label: "تكييف وتبريد" },
  { id: "CARPENTRY", label: "نجارة" },
  { id: "PAINTING", label: "دهان" },
  { id: "APPLIANCE_REPAIR", label: "صيانة أجهزة" },
  { id: "GARDENING", label: "حدائق" },
];

export default function ServicesClient({ initialServices }: { initialServices: ServiceItem[] }) {
  const [services, setServices] = useState<ServiceItem[]>(initialServices);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [sortBy, setSortBy] = useState<"price_asc" | "price_desc" | "newest">("newest");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const requestId = useRef(0);

  const handleFilterChange = async (
    query: string,
    category: string,
    sort: "price_asc" | "price_desc" | "newest"
  ) => {
    const currentRequest = ++requestId.current;
    setLoading(true);
    setError("");
    const res = await searchServicesAction({ query, category, sortBy: sort });
    if (currentRequest !== requestId.current) return;
    if (res.success && res.services) {
      setServices(res.services);
    } else {
      setError(res.error || "تعذر البحث في الخدمات حالياً.");
    }
    setLoading(false);
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void handleFilterChange(searchQuery, selectedCategory, sortBy);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [searchQuery, selectedCategory, sortBy]);

  return (
    <div className="space-y-6">
      {/* حقل البحث وأدوات الفلترة */}
      <div className="bg-white border rounded-xl p-4 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
          <input
            type="text"
            placeholder="ابحث عن خدمة (مثال: صيانة التكييف، تصليح كهرباء)..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
            }}
            aria-label="البحث في الخدمات"
            className="w-full md:w-1/2 border p-2.5 rounded-lg text-sm bg-white"
          />

          <div className="flex items-center gap-2 w-full md:w-auto">
            <label htmlFor="sort-by-select" className="text-xs font-medium shrink-0">ترتيب حسب:</label>
            <select
              id="sort-by-select"
              value={sortBy}
              onChange={(e) => {
                const val = e.target.value as "price_asc" | "price_desc" | "newest";
                setSortBy(val);
              }}
              className="border p-2 rounded-lg text-xs bg-white w-full md:w-auto"
            >
              <option value="newest">الأحدث إضافة</option>
              <option value="price_asc">السعر: من الأقل للأعلى</option>
              <option value="price_desc">السعر: من الأعلى للأقل</option>
            </select>
          </div>
        </div>

        {/* أزرار الفئات */}
        <div className="flex gap-2 overflow-x-auto pb-1 pt-2 border-t">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                setSelectedCategory(cat.id);
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                selectedCategory === cat.id
                  ? "bg-black text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* قائمة الخدمات */}
      {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
      {loading ? (
        <div className="p-8 text-center text-gray-500">جاري البحث عن الخدمات...</div>
      ) : services.length === 0 ? (
        <div className="p-8 text-center text-gray-500 bg-gray-50 border rounded-xl">
          لا توجد خدمات تطابق خيارات البحث المحددة.
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {services.map((srv) => (
            <div key={srv.id} className="bg-white border rounded-xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-lg text-gray-900">{srv.title}</h3>
                  <span className="shrink-0 whitespace-nowrap text-xs font-semibold px-2 py-1 bg-green-100 text-green-800 rounded-full">
                    {srv.price} د.أ
                  </span>
                </div>
                {srv.description && <p className="text-xs text-gray-600 line-clamp-2">{srv.description}</p>}
              </div>

              <div className="pt-3 border-t">
                <Link
                  href={`/booking?serviceId=${srv.id}`}
                  className="w-full bg-black text-white py-2 rounded-lg text-xs font-medium hover:bg-gray-800 transition-colors block text-center"
                >
                  حجز الخدمة الآن
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
