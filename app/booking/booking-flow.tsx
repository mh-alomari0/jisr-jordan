"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { SERVICES, JORDAN_CITIES, TIME_SLOTS, Service } from "@/lib/constants";
import { validateJordanPhone, formatJordanPhone } from "@/lib/utils";
import { supabase } from "@/lib/supabase/client";
import { 
  Wrench, Zap, Wind, Hammer, Paintbrush, Sparkles, 
  Check, Calendar, Clock, Phone, AlertCircle, 
  Loader2, CheckCircle2, ArrowRight, ArrowLeft 
} from "lucide-react";

const ICON_MAP: Record<string, React.ReactNode> = {
  Wrench: <Wrench className="w-6 h-6 text-primary" />,
  Zap: <Zap className="w-6 h-6 text-amber-500" />,
  Wind: <Wind className="w-6 h-6 text-sky-500" />,
  Hammer: <Hammer className="w-6 h-6 text-orange-500" />,
  Paintbrush: <Paintbrush className="w-6 h-6 text-emerald-500" />,
  Sparkles: <Sparkles className="w-6 h-6 text-purple-500" />
};

interface DateOption {
  fullDate: string; // YYYY-MM-DD
  dayName: string; // اليوم، غداً، الأحد...
  dayNum: number;  // 16
  monthName: string; // آب
}

export default function BookingFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialServiceId = searchParams.get("service") || "";

  // حالة الخطوة الحالية
  const [step, setStep] = useState(1);

  // حالة نموذج الحجز
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [area, setArea] = useState(JORDAN_CITIES[0]);
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  
  // توليد التواريخ لـ 14 يوم قادم
  const [availableDates, setAvailableDates] = useState<DateOption[]>([]);
  const [bookingDate, setBookingDate] = useState("");
  const [bookingTime, setBookingTime] = useState(TIME_SLOTS[0]);
  
  const [phone, setPhone] = useState("");
  
  // حالات الأخطاء والتحميل والنجاح
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // إعداد الأيام القادمة عند التحميل
  useEffect(() => {
    const dates: DateOption[] = [];
    const today = new Date();

    const daysAr = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
    const monthsAr = ["كانون 2", "شباط", "آذار", "نيسان", "أيار", "حزيران", "تموز", "آب", "أيلول", "تشرين 1", "تشرين 2", "كانون 1"];

    for (let i = 0; i < 14; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);

      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const fullDate = `${yyyy}-${mm}-${dd}`;

      let dayLabel = daysAr[d.getDay()];
      if (i === 0) dayLabel = "اليوم";
      if (i === 1) dayLabel = "غداً";

      dates.push({
        fullDate,
        dayName: dayLabel,
        dayNum: d.getDate(),
        monthName: monthsAr[d.getMonth()],
      });
    }

    setAvailableDates(dates);
    if (dates.length > 0) {
      setBookingDate(dates[0].fullDate);
    }
  }, []);

  // تحديد الخدمة الابتدائية
  useEffect(() => {
    if (initialServiceId) {
      const found = SERVICES.find((s) => s.id === initialServiceId);
      if (found) setSelectedService(found);
    }
  }, [initialServiceId]);

  const handleNextStep = () => {
    setError(null);

    if (step === 1 && !selectedService) {
      setError("يرجى اختيار الخدمة المطلوبة للمتابعة.");
      return;
    }

    if (step === 2 && !address.trim()) {
      setError("يرجى إدخال العنوان التفصيلي للموقع.");
      return;
    }

    if (step === 3 && (!bookingDate || !bookingTime)) {
      setError("يرجى اختيار تاريخ ووقت الموعد المناسب.");
      return;
    }

    setStep((prev) => Math.min(prev + 1, 4));
  };

  const handlePrevStep = () => {
    setError(null);
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanedPhone = formatJordanPhone(phone);
    if (!validateJordanPhone(cleanedPhone)) {
      setError("يرجى إدخال رقم هاتف أردني صحيح يتكون من 10 أرقام ويبدأ بـ 07.");
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        const currentUrl = `/booking?service=${selectedService?.id || ""}`;
        router.push(`/login?redirect=${encodeURIComponent(currentUrl)}`);
        return;
      }

      const { error: dbError } = await supabase.from("bookings").insert({
        customer_id: user.id,
        service_id: selectedService?.id,
        service_title: selectedService?.title,
        area,
        address,
        notes: notes.trim() || null,
        booking_date: bookingDate,
        booking_time: bookingTime,
        phone: cleanedPhone,
        status: "pending",
      });

      if (dbError) {
        console.error("Database Insert Error:", dbError);
        setError("تعذر حفظ الطلب الآن. حاول مرة أخرى.");
        setLoading(false);
        return;
      }

      setIsSuccess(true);
      setLoading(false);
    } catch (err) {
      console.error("Booking Submission Exception:", err);
      setError("حدث خطأ غير متوقع أثناء إرسال الحجز.");
      setLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="bg-white p-8 sm:p-12 rounded-card border border-neutral-border shadow-xl text-center max-w-2xl mx-auto space-y-6">
        <div className="w-20 h-20 bg-emerald-100 text-status-success rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-12 h-12" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-black text-neutral-text">تم تأكيد حجزك بنجاح!</h1>
          <p className="text-neutral-muted text-sm sm:text-base">
            شكراً لثقتك بـ "جسر". تم استلام طلبك وجاري تنسيق الفني المختص للتواصل معك في الموعد المحدد.
          </p>
        </div>

        <div className="bg-neutral-surface p-6 rounded-xl border border-neutral-border text-right space-y-2 text-sm font-medium">
          <div className="flex justify-between border-b border-neutral-border pb-2">
            <span className="text-neutral-muted">الخدمة:</span>
            <span className="font-bold text-neutral-text">{selectedService?.title}</span>
          </div>
          <div className="flex justify-between border-b border-neutral-border pb-2">
            <span className="text-neutral-muted">الموقع:</span>
            <span className="font-bold text-neutral-text">{area} — {address}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-muted">الموعد:</span>
            <span className="font-bold text-neutral-text">{bookingDate} | {bookingTime}</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          <Link
            href="/bookings"
            className="bg-primary text-white font-bold px-6 py-3.5 rounded-btn hover:bg-primary-hover transition-colors shadow-md text-center"
          >
            عرض حجوزاتي
          </Link>
          <Link
            href="/services"
            className="bg-neutral-surface border border-neutral-border text-neutral-text font-bold px-6 py-3.5 rounded-btn hover:bg-neutral-border transition-colors text-center"
          >
            استعراض خدمات أخرى
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-card border border-neutral-border shadow-xl p-6 sm:p-10 space-y-8">
      
      {/* شريط التقدم */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          {[
            { num: 1, label: "الخدمة" },
            { num: 2, label: "الموقع" },
            { num: 3, label: "الموعد" },
            { num: 4, label: "التواصل والملخص" },
          ].map((s) => (
            <div key={s.num} className="flex flex-col items-center gap-1.5 flex-1">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${
                  step > s.num
                    ? "bg-status-success text-white"
                    : step === s.num
                    ? "bg-primary text-white ring-4 ring-primary-light"
                    : "bg-neutral-surface border border-neutral-border text-neutral-muted"
                }`}
              >
                {step > s.num ? <Check className="w-5 h-5" /> : s.num}
              </div>
              <span className={`text-xs font-semibold hidden sm:inline ${step === s.num ? "text-primary" : "text-neutral-muted"}`}>
                {s.label}
              </span>
            </div>
          ))}
        </div>

        <div className="w-full bg-neutral-surface h-2 rounded-full overflow-hidden border border-neutral-border">
          <div
            className="bg-primary h-full transition-all duration-300"
            style={{ width: `${((step - 1) / 3) * 100}%` }}
          />
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-lg flex items-center gap-3 text-sm font-medium">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* الخطوة 1 */}
      {step === 1 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-neutral-text">اختر الخدمة المطلوبة</h2>
            <p className="text-xs text-neutral-muted mt-1">اختر نوع الصيانة التي ترغب بها لمتابعة تفاصيل الحجز.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {SERVICES.map((srv) => {
              const isSelected = selectedService?.id === srv.id;
              return (
                <div
                  key={srv.id}
                  onClick={() => setSelectedService(srv)}
                  className={`p-5 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                    isSelected
                      ? "border-primary bg-primary-light/30 shadow-sm"
                      : "border-neutral-border bg-neutral-surface hover:border-neutral-border/80"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center border border-neutral-border shrink-0">
                      {ICON_MAP[srv.iconName] || <Wrench className="w-6 h-6 text-primary" />}
                    </div>
                    <div>
                      <h3 className="font-bold text-neutral-text text-base">{srv.title}</h3>
                      <span className="text-xs text-neutral-muted">تبدأ من {srv.startingPrice} د.أ</span>
                    </div>
                  </div>
                  {isSelected && <Check className="w-6 h-6 text-primary shrink-0" />}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* الخطوة 2 */}
      {step === 2 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-neutral-text">موقع و تفاصيل السكن</h2>
            <p className="text-xs text-neutral-muted mt-1">حدد المحافظة والعنوان الدقيق ليصل الفني في الموعد المحدد.</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-neutral-text mb-2">المحافظة / المنطقة</label>
              <select
                value={area}
                onChange={(e) => setArea(e.target.value)}
                className="w-full py-3 px-4 bg-neutral-surface border border-neutral-border rounded-btn font-medium text-sm focus:outline-none focus:border-primary"
              >
                {JORDAN_CITIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-neutral-text mb-2">العنوان التفصيلي *</label>
              <input
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="اسم الشارع، رقم العمارة، الطابق، الشقة..."
                className="w-full py-3 px-4 bg-neutral-surface border border-neutral-border rounded-btn font-medium text-sm focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-neutral-text mb-2">ملاحظات إضافية للفني (اختياري)</label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="أية تفاصيل تخص الموعد أو مكان المشكلة..."
                className="w-full py-3 px-4 bg-neutral-surface border border-neutral-border rounded-btn font-medium text-sm focus:outline-none focus:border-primary resize-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* الخطوة 3 المحدثة: التواريخ بـ Scroll أفقِي، والأوقات بـ Scroll عمودي */}
      {step === 3 && (
        <div className="space-y-8">
          <div>
            <h2 className="text-xl font-bold text-neutral-text">حدد التاريخ والوقت الأنسب</h2>
            <p className="text-xs text-neutral-muted mt-1">اسحب الأيام للأفق واقتنص الفاصل الزمني المفضل لديك.</p>
          </div>

          {/* 1. شريط تمرير أفقِي للتواريخ */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-neutral-text flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              <span>اختر يوم الزيارة (مرر أفقياً)</span>
            </label>

            <div className="flex gap-3 overflow-x-auto pb-3 pt-1 px-1 scrollbar-thin scrollbar-thumb-neutral-border">
              {availableDates.map((item) => {
                const isSelected = bookingDate === item.fullDate;
                return (
                  <button
                    key={item.fullDate}
                    type="button"
                    onClick={() => setBookingDate(item.fullDate)}
                    className={`shrink-0 w-24 p-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-1 ${
                      isSelected
                        ? "bg-primary text-white border-primary shadow-md scale-105"
                        : "bg-neutral-surface border-neutral-border text-neutral-text hover:border-primary/50"
                    }`}
                  >
                    <span className={`text-xs font-bold ${isSelected ? "text-primary-light" : "text-neutral-muted"}`}>
                      {item.dayName}
                    </span>
                    <span className="text-2xl font-black">
                      {item.dayNum}
                    </span>
                    <span className="text-[11px] font-medium">
                      {item.monthName}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. شريط تمرير عمودي للأوقات (كل 30 دقيقة) */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-neutral-text flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              <span>اختر الموعد الدقيق (مرر عمودياً)</span>
            </label>

            <div className="max-h-60 overflow-y-auto p-2 bg-neutral-surface rounded-xl border border-neutral-border">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                {TIME_SLOTS.map((slot) => {
                  const isSelected = bookingTime === slot;
                  return (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setBookingTime(slot)}
                      className={`py-2.5 px-3 text-xs font-bold rounded-xl border transition-all ${
                        isSelected
                          ? "bg-primary text-white border-primary shadow-sm"
                          : "bg-white border-neutral-border text-neutral-text hover:bg-neutral-border/50"
                      }`}
                    >
                      {slot}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* الخطوة 4 */}
      {step === 4 && (
        <form onSubmit={handleSubmitBooking} className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-neutral-text">بيانات التواصل ومراجعة الطلب</h2>
            <p className="text-xs text-neutral-muted mt-1">أدخل رقم هاتفك للتواصل ومراجعة تفاصيل طلبك الأخيرة.</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-neutral-text mb-2 flex items-center gap-2">
              <Phone className="w-4 h-4 text-primary" />
              <span>رقم الهاتف الأردني *</span>
            </label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="07XXXXXXXX"
              className="w-full py-3 px-4 bg-neutral-surface border border-neutral-border rounded-btn font-medium text-sm focus:outline-none focus:border-primary tracking-widest text-left"
              dir="ltr"
            />
          </div>

          <div className="bg-neutral-surface p-5 rounded-xl border border-neutral-border space-y-3 text-sm">
            <h3 className="font-bold text-neutral-text text-base border-b border-neutral-border pb-2">ملخص الحجز</h3>
            <div className="flex justify-between">
              <span className="text-neutral-muted">الخدمة:</span>
              <span className="font-bold text-neutral-text">{selectedService?.title}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-muted">الموقع:</span>
              <span className="font-bold text-neutral-text">{area} — {address}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-muted">الموعد:</span>
              <span className="font-bold text-neutral-text">{bookingDate} الساعة {bookingTime}</span>
            </div>
            {notes && (
              <div className="flex justify-between border-t border-neutral-border pt-2 text-xs">
                <span className="text-neutral-muted">ملاحظات:</span>
                <span className="font-medium text-neutral-text">{notes}</span>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white font-bold py-4 rounded-btn hover:bg-primary-hover transition-colors flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 text-base"
          >
            {loading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <span>تأكيد الحجز النهائي</span>
            )}
          </button>
        </form>
      )}

      {/* أزرار التنقل */}
      {step < 4 && (
        <div className="flex items-center justify-between pt-6 border-t border-neutral-border">
          {step > 1 ? (
            <button
              type="button"
              onClick={handlePrevStep}
              className="flex items-center gap-2 text-neutral-muted hover:text-neutral-text font-bold text-sm px-4 py-2.5 rounded-btn border border-neutral-border"
            >
              <ArrowRight className="w-4 h-4" />
              <span>السابق</span>
            </button>
          ) : <div />}

          <button
            type="button"
            onClick={handleNextStep}
            className="flex items-center gap-2 bg-primary text-white font-bold text-sm px-6 py-2.5 rounded-btn hover:bg-primary-hover transition-colors shadow-md"
          >
            <span>التالي</span>
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>
      )}

    </div>
  );
}