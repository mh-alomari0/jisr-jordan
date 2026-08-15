import { supabase } from "@/lib/supabase/client";
import { Star, Quote, MessageSquare } from "lucide-react";

export default async function Testimonials() {
  // جلب أحدث التقييمات الممتازة (4 نجوم فما فوق)
  const { data: reviews } = await supabase
    .from("reviews")
    .select("id, rating, comment, created_at, bookings(service_title)")
    .gte("rating", 4)
    .not("comment", "is", null)
    .order("created_at", { ascending: false })
    .limit(3);

  if (!reviews || reviews.length === 0) return null;

  return (
    <section className="py-16 bg-white border-y border-neutral-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="text-xs font-bold text-primary bg-primary-light/50 px-3 py-1 rounded-full inline-block">
            ثقة تجعلنا نعتز
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-neutral-text">ماذا يقول عملاؤنا عن جسر؟</h2>
          <p className="text-neutral-muted text-xs sm:text-sm">
            آراء وانطباعات حقيقية مسجلة من عملاء خاضوا تجربة الصيانة معنا.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {reviews.map((rev: any) => (
            <div
              key={rev.id}
              className="bg-neutral-surface p-6 rounded-card border border-neutral-border shadow-sm flex flex-col justify-between space-y-4 relative"
            >
              <Quote className="w-8 h-8 text-primary/10 absolute left-4 top-4 rotate-180" />

              <div className="space-y-3 relative z-10">
                <div className="flex items-center gap-1 dir-ltr">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-4 h-4 ${
                        star <= rev.rating
                          ? "fill-amber-400 text-amber-400"
                          : "fill-neutral-border text-neutral-border"
                      }`}
                    />
                  ))}
                </div>

                <p className="text-xs sm:text-sm font-medium text-neutral-text leading-relaxed italic">
                  "{rev.comment}"
                </p>
              </div>

              <div className="pt-4 border-t border-neutral-border/60 flex items-center justify-between text-[11px] text-neutral-muted">
                <span className="font-bold text-primary">
                  {rev.bookings?.service_title || "خدمة صيانة"}
                </span>
                <span>{new Date(rev.created_at).toLocaleDateString("ar-JO")}</span>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}