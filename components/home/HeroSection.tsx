import Link from "next/link";
import { ArrowLeft, ShieldCheck, Clock, CheckCircle2 } from "lucide-react";

export default function HeroSection() {
  return (
    <section className="relative bg-gradient-to-b from-primary-light/40 to-neutral-surface py-20 lg:py-28 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        
        {/* المحتوى النصي */}
        <div className="flex flex-col items-start gap-6">
          <div className="inline-flex items-center gap-2 bg-white border border-primary/20 px-4 py-2 rounded-full text-xs font-bold text-primary shadow-sm">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <span>المنصة الأولى المعتمدة للصيانة المنزلية في الأردن</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-neutral-text leading-[1.35] sm:leading-[1.35] lg:leading-[1.35]">
            صيانة بيتك أصبحت <br />
            <span className="text-primary">أسهل، أسرع، وأكثر أمانًا</span>
          </h1>

          <p className="text-lg text-neutral-muted leading-relaxed max-w-xl">
            احجز أفضل الفنيين المعتمدين للسباكة، الكهرباء، التكييف والنجارة في الأردن بضغطة زر واحدة، وبأسعار شفافة وضمان كامل.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto pt-2">
            <Link
              href="/services"
              className="flex items-center justify-center gap-3 bg-primary text-white font-bold text-lg px-8 py-4 rounded-btn hover:bg-primary-hover shadow-lg transition-all"
            >
              <span>استعرض الخدمات واحجز الآن</span>
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-6 pt-6 border-t border-neutral-border w-full">
            <div>
              <span className="text-2xl font-black text-neutral-text block">+1000</span>
              <span className="text-xs text-neutral-muted">طلب صيانة مكتمل</span>
            </div>
            <div>
              <span className="text-2xl font-black text-neutral-text block">100%</span>
              <span className="text-xs text-neutral-muted">فنيون معتمدون</span>
            </div>
            <div>
              <span className="text-2xl font-black text-neutral-text block">24/7</span>
              <span className="text-xs text-neutral-muted">دعم وإرجاع</span>
            </div>
          </div>
        </div>

        {/* بطاقة بصرية توضيحية */}
        <div className="relative flex justify-center">
          <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl border border-neutral-border relative z-10">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-secondary/10 text-secondary rounded-xl flex items-center justify-center font-bold">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-neutral-text text-lg">حجز سريع خلال 60 ثانية</h3>
                <p className="text-xs text-neutral-muted">بدون مكالمات طويلة أو انتظار</p>
              </div>
            </div>

            <div className="space-y-3">
              {["فنيون محترفون ومفحوصون أمنيًا", "شفافية كاملة في التسعير قبل البدأ", "ضمان جودة على جميع الأعمال المنفذة"].map((item, idx) => (
                <div key={idx} className="flex items-start gap-3 bg-neutral-surface p-3 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-status-success shrink-0 mt-0.5" />
                  <span className="text-sm font-medium text-neutral-text">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}