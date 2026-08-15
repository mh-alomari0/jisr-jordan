"use client";

import { useState } from "react";
import Link from "next/link";
import { SERVICES } from "@/lib/constants";
import { 
  Search, Wrench, Zap, Wind, Hammer, Paintbrush, Sparkles, ArrowLeft, Layers 
} from "lucide-react";

const ICON_MAP: Record<string, React.ReactNode> = {
  Wrench: <Wrench className="w-7 h-7 text-primary" />,
  Zap: <Zap className="w-7 h-7 text-amber-500" />,
  Wind: <Wind className="w-7 h-7 text-sky-500" />,
  Hammer: <Hammer className="w-7 h-7 text-orange-500" />,
  Paintbrush: <Paintbrush className="w-7 h-7 text-emerald-500" />,
  Sparkles: <Sparkles className="w-7 h-7 text-purple-500" />
};

export default function ServicesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("الكل");

  const categories = ["الكل", "صيانة منزلية", "تكييف وتبريد", "نجارة وديكور", "دهان وديكور", "تنظيف"];

  const filteredServices = SERVICES.filter((srv) => {
    const matchesSearch = srv.title.includes(searchTerm) || srv.shortDescription.includes(searchTerm);
    const matchesCategory = selectedCategory === "الكل" || srv.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="py-12 bg-neutral-surface min-h-[85vh]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* الترويسة وشريط البحث */}
        <div className="text-center max-w-2xl mx-auto space-y-4">
          <h1 className="text-3xl sm:text-4xl font-black text-neutral-text">دليل خدمات الصيانة المنزلية</h1>
          <p className="text-neutral-muted text-sm sm:text-base">
            تصفح خدماتنا المتخصصة مع ضمان أعلى معايير الجودة والشفافية في الأسعار.
          </p>

          <div className="relative max-w-md mx-auto pt-2">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ابحث عن خدمة (سباكة، تكييف، كهرباء...)"
              className="w-full py-3.5 pr-11 pl-4 bg-white border border-neutral-border rounded-btn text-sm font-medium focus:outline-none focus:border-primary shadow-sm"
            />
            <Search className="w-5 h-5 text-neutral-muted absolute right-3.5 top-5" />
          </div>
        </div>

        {/* أزرار الفئات */}
        <div className="flex items-center justify-center gap-2 overflow-x-auto pb-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-btn text-xs font-bold transition-all shrink-0 ${
                selectedCategory === cat
                  ? "bg-primary text-white shadow-md"
                  : "bg-white border border-neutral-border text-neutral-muted hover:bg-neutral-border/50"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* قائمة الخدمات */}
        {filteredServices.length === 0 ? (
          <div className="bg-white p-12 rounded-card border border-neutral-border text-center space-y-3 max-w-md mx-auto">
            <Layers className="w-12 h-12 text-neutral-muted mx-auto stroke-1" />
            <h3 className="text-base font-bold text-neutral-text">لم نجد أية خدمة تطابق بحثك</h3>
            <p className="text-xs text-neutral-muted">جرب البحث بكلمة أخرى أو تصفح كافة التصنيفات.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredServices.map((srv) => (
              <div
                key={srv.id}
                className="bg-white rounded-card border border-neutral-border p-6 shadow-sm hover:shadow-xl transition-all flex flex-col justify-between group"
              >
                <div className="space-y-4">
                  <div className="w-14 h-14 bg-neutral-surface rounded-2xl flex items-center justify-center border border-neutral-border group-hover:bg-primary-light/40 transition-colors">
                    {ICON_MAP[srv.iconName] || <Wrench className="w-7 h-7 text-primary" />}
                  </div>

                  <div>
                    <span className="text-[11px] font-bold text-primary bg-primary-light/50 px-2.5 py-1 rounded-md inline-block mb-2">
                      {srv.category}
                    </span>
                    <h2 className="text-lg font-bold text-neutral-text group-hover:text-primary transition-colors">
                      {srv.title}
                    </h2>
                    <p className="text-xs text-neutral-muted mt-2 leading-relaxed">
                      {srv.shortDescription}
                    </p>
                  </div>
                </div>

                <div className="pt-6 border-t border-neutral-border mt-6 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-neutral-muted block">التكلفة الابتدائية</span>
                    <span className="text-base font-black text-neutral-text">تبدأ من {srv.startingPrice} د.أ</span>
                  </div>

                  <Link
                    href={`/booking?service=${srv.id}`}
                    className="inline-flex items-center gap-1.5 bg-primary text-white text-xs font-bold px-4 py-2.5 rounded-btn hover:bg-primary-hover transition-colors shadow-sm"
                  >
                    <span>احجز الآن</span>
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}