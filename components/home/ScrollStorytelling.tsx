"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { Wrench, CalendarCheck, ShieldCheck } from "lucide-react";

export default function ScrollStorytelling() {
  const containerRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  // التحولات البصرية المعتمدة على السكرول
  const rotation = useTransform(scrollYProgress, [0, 0.5, 1], [0, 180, 360]);
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [1, 1.25, 1]);
  const strokeDash = useTransform(scrollYProgress, [0, 1], [300, 0]);

  const step1Opacity = useTransform(scrollYProgress, [0, 0.25, 0.35], [1, 1, 0]);
  const step2Opacity = useTransform(scrollYProgress, [0.35, 0.5, 0.7], [0, 1, 0]);
  const step3Opacity = useTransform(scrollYProgress, [0.7, 0.85, 1], [0, 1, 1]);

  return (
    <section ref={containerRef} className="relative h-[250vh] bg-neutral-surface">
      <div className="sticky top-0 h-screen flex flex-col items-center justify-center overflow-hidden px-4">
        
        {/* عنوان القسم */}
        <div className="text-center max-w-xl mx-auto mb-8 z-10">
          <span className="text-secondary text-sm font-bold bg-orange-100 px-4 py-1.5 rounded-full inline-block mb-2">
            تجربة سهلة ومضمونة
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-neutral-text">كيف تعمل منصة جسر؟</h2>
        </div>

        {/* المنطقة المركزية للرسم التفاعلي SVG */}
        <div className="relative w-64 h-64 sm:w-80 sm:h-80 flex items-center justify-center my-6">
          
          {/* دائرة خلفية مع حركات متجهة SVG */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 200 200">
            <circle
              cx="100"
              cy="100"
              r="85"
              fill="none"
              stroke="#E2E8F0"
              strokeWidth="10"
            />
            {!shouldReduceMotion && (
              <motion.circle
                cx="100"
                cy="100"
                r="85"
                fill="none"
                stroke="#0284C7"
                strokeWidth="10"
                strokeDasharray="534"
                style={{ strokeDashoffset: strokeDash }}
                strokeLinecap="round"
              />
            )}
          </svg>

          {/* عنصر الأداة المتحرك المربوط بالسكرول */}
          <motion.div
            style={{
              rotate: shouldReduceMotion ? 0 : rotation,
              scale: shouldReduceMotion ? 1 : scale,
            }}
            className="w-28 h-28 sm:w-36 sm:h-36 bg-primary rounded-3xl flex items-center justify-center text-white shadow-2xl z-10"
          >
            <Wrench className="w-16 h-16 sm:w-20 sm:h-20" />
          </motion.div>
        </div>

        {/* النصوص المتتابعة مع التمرير */}
        <div className="relative w-full max-w-md h-32 flex items-center justify-center text-center">
          
          {/* المرحلة 1 */}
          <motion.div
            style={{ opacity: shouldReduceMotion ? 1 : step1Opacity }}
            className="absolute inset-0 flex flex-col items-center justify-center bg-white p-6 rounded-card border border-neutral-border shadow-lg"
          >
            <div className="flex items-center gap-2 text-primary font-bold text-lg mb-1">
              <span className="w-7 h-7 bg-primary-light rounded-full flex items-center justify-center text-sm">1</span>
              <span>اختر الخدمة والموقع</span>
            </div>
            <p className="text-neutral-muted text-sm">حدد نوع الصيانة المطلوب، عنوانك في الأردن، والموعد الأنسب لك.</p>
          </motion.div>

          {/* المرحلة 2 */}
          <motion.div
            style={{ opacity: shouldReduceMotion ? 1 : step2Opacity }}
            className="absolute inset-0 flex flex-col items-center justify-center bg-white p-6 rounded-card border border-neutral-border shadow-lg"
          >
            <div className="flex items-center gap-2 text-secondary font-bold text-lg mb-1">
              <CalendarCheck className="w-5 h-5 text-secondary" />
              <span>تأكيد الموعد الفوري</span>
            </div>
            <p className="text-neutral-muted text-sm">يتلقى الطلب الفني المعتمد والمناسب في منطقتك ويتم تأكيد الموعد تلقائيًا.</p>
          </motion.div>

          {/* المرحلة 3 */}
          <motion.div
            style={{ opacity: shouldReduceMotion ? 1 : step3Opacity }}
            className="absolute inset-0 flex flex-col items-center justify-center bg-white p-6 rounded-card border border-neutral-border shadow-lg"
          >
            <div className="flex items-center gap-2 text-status-success font-bold text-lg mb-1">
              <ShieldCheck className="w-5 h-5 text-status-success" />
              <span>تنفيذ الخدمة مع الضمان</span>
            </div>
            <p className="text-neutral-muted text-sm">يحضر الفني في الوقت المحدد وينفذ العمل بإتقان مع ضمان شامل للمنصة.</p>
          </motion.div>

        </div>

      </div>
    </section>
  );
}