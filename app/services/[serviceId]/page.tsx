import { notFound } from "next/navigation";
import Link from "next/link";
import { SERVICES } from "@/lib/constants";
import { supabase } from "@/lib/supabase/client";
import { 
  Wrench, Zap, Wind, Hammer, Paintbrush, Sparkles, 
  CheckCircle2, ArrowLeft, ShieldCheck, Clock, HelpCircle, Star, MessageSquare
} from "lucide-react";

const ICON_MAP: Record<string, React.ReactNode> = {
  Wrench: <Wrench className="w-10 h-10 text-primary" />,
  Zap: <Zap className="w-10 h-10 text-amber-500" />,
  Wind: <Wind className="w-10 h-10 text-sky-500" />,
  Hammer: <Hammer className="w-10 h-10 text-orange-500" />,
  Paintbrush: <Paintbrush className="w-10 h-10 text-emerald-500" />,
  Sparkles: <Sparkles className="w-10 h-10 text-purple-500" />
};

export async function generateStaticParams() {
  return SERVICES.map((srv) => ({
    serviceId: srv.id,
  }));
}

export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<{ serviceId: string }>;
}) {
  const { serviceId } = await params;
  const service = SERVICES.find((s) => s.id === serviceId);

  if (!service) {
    notFound();
  }

  // جلب التقييمات الخاصة بهذه الخدمة من Supabase
  const { data: reviewsData } = await supabase
    .from("reviews")
    .select("rating, comment, created_at, bookings!inner(service_title)")
    .eq("bookings.service_title", service.title)
    .order("created_at", { ascending: false });

  const reviews = reviewsData || [];
  const totalReviews = reviews.length;
  const avgRating = totalReviews > 0
    ? (reviews.reduce((acc, curr) => acc + curr.rating, 0) / totalReviews).toFixed(1)
    : "5.0";

  return (
    <div className="py-12 bg-neutral-surface min-h-[85vh]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-8">
        
        {/* الترويسة الرئيسية للخدمة */}
        <div className="bg-white p-8 rounded-card border border-neutral-border shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-neutral-border pb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-neutral-surface rounded-2xl flex items-center justify-center border border-neutral-border shrink-0">
                {ICON_MAP[service.iconName] || <Wrench className="w-8 h-8 text-primary" />}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-primary bg-primary-light/50 px-3 py-1 rounded-md">
                    {service.category}
                  </span>
                  <div className="flex items-center gap-1 text-xs font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
                    <Star className="w-3.5 h-3.5 fill-amber-400 stroke-amber-400" />
                    <span>{avgRating} ({totalReviews} تقييم)</span>
                  </div>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-neutral-text">{service.title}</h1>
              </div>
            </div>

            <div className="text-right sm:text-left">
              <span className="text-xs text-neutral-muted block">التكلفة الابتدائية</span>
              <span className="text-2xl font-black text-primary">تبدأ من {service.startingPrice} د.أ</span>
            </div>
          </div>

          <p className="text-neutral-text text-sm sm:text-base leading-relaxed">
            {service.fullDescription}
          </p>

          <div className="pt-2">
            <Link
              href={`/booking?service=${service.id}`}
              className="w-full bg-primary text-white font-bold py-4 rounded-btn hover:bg-primary-hover transition-colors flex items-center justify-center gap-2 shadow-lg text-base"
            >
              <span>حجز هذه الخدمة الآن</span>
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </div>
        </div>

        {/* الميزات المشمولة */}
        <div className="bg-white p-8 rounded-card border border-neutral-border shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-neutral-text flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            <span>ماذا تشمل هذه الخدمة؟</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {service.includes.map((item, idx) => (
              <div key={idx} className="flex items-center gap-3 bg-neutral-surface p-3.5 rounded-xl border border-neutral-border">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span className="text-xs sm:text-sm font-semibold text-neutral-text">{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* آراء وتقييمات العملاء الحقيقية */}
        <div className="bg-white p-8 rounded-card border border-neutral-border shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-neutral-border pb-4">
            <h2 className="text-lg font-bold text-neutral-text flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              <span>تقييمات العملاء ({totalReviews})</span>
            </h2>
            <div className="flex items-center gap-1 text-sm font-black text-neutral-text">
              <Star className="w-4 h-4 fill-amber-400 stroke-amber-400" />
              <span>{avgRating} / 5.0</span>
            </div>
          </div>

          {reviews.length === 0 ? (
            <p className="text-xs text-neutral-muted text-center py-6">
              لا توجد تقييمات مسجلة لهذه الخدمة بعد. كن أول من يجرب الخدمة ويشارك انطباعه!
            </p>
          ) : (
            <div className="space-y-4">
              {reviews.map((rev, idx) => (
                <div key={idx} className="bg-neutral-surface p-4 rounded-xl border border-neutral-border space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 dir-ltr">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-3.5 h-3.5 ${
                            star <= rev.rating
                              ? "fill-amber-400 text-amber-400"
                              : "fill-neutral-border text-neutral-border"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-[10px] text-neutral-muted">
                      {new Date(rev.created_at).toLocaleDateString("ar-JO")}
                    </span>
                  </div>
                  {rev.comment && (
                    <p className="text-xs text-neutral-text leading-relaxed font-medium">
                      "{rev.comment}"
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}