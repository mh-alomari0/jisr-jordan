import Link from "next/link";
import { SERVICES } from "@/lib/constants";
import { Wrench, Zap, Wind, Hammer, Paintbrush, Sparkles, ArrowLeft } from "lucide-react";

const ICON_MAP: Record<string, React.ReactNode> = {
  Wrench: <Wrench className="w-7 h-7 text-primary" />,
  Zap: <Zap className="w-7 h-7 text-amber-500" />,
  Wind: <Wind className="w-7 h-7 text-sky-500" />,
  Hammer: <Hammer className="w-7 h-7 text-orange-500" />,
  Paintbrush: <Paintbrush className="w-7 h-7 text-emerald-500" />,
  Sparkles: <Sparkles className="w-7 h-7 text-purple-500" />
};

export default function FeaturedServices() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
          <div>
            <span className="text-primary font-bold text-sm bg-primary-light px-3 py-1 rounded-md">خدماتنا الرئيسية</span>
            <h2 className="text-3xl font-extrabold text-neutral-text mt-2">ما الذي يحتاجه بيتك اليوم؟</h2>
          </div>
          <Link href="/services" className="inline-flex items-center gap-2 text-primary font-bold hover:underline mt-4 md:mt-0">
            <span>جميع الخدمات</span>
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {SERVICES.map((service) => (
            <div
              key={service.id}
              className="bg-neutral-surface border border-neutral-border p-6 rounded-card hover:shadow-lg transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center shadow-sm border border-neutral-border mb-4 group-hover:scale-105 transition-transform">
                  {ICON_MAP[service.iconName] || <Wrench className="w-7 h-7 text-primary" />}
                </div>
                <h3 className="text-xl font-bold text-neutral-text mb-2">{service.title}</h3>
                <p className="text-neutral-muted text-sm leading-relaxed mb-6">{service.shortDescription}</p>
              </div>

              <div className="pt-4 border-t border-neutral-border flex items-center justify-between">
                <div>
                  <span className="text-xs text-neutral-muted block">تبدأ من</span>
                  <span className="text-lg font-black text-primary">{service.startingPrice} د.أ</span>
                </div>
                <Link
                  href={`/booking?service=${service.id}`}
                  className="bg-primary text-white text-sm font-bold px-4 py-2 rounded-btn hover:bg-primary-hover transition-colors"
                >
                  احجز الآن
                </Link>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}