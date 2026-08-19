"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Heart, LoaderCircle } from "lucide-react";
import { createCODPaymentAction } from "@/lib/actions/cod-payment";
import { toggleMarketplaceFavoriteAction } from "@/lib/actions/marketplace-favorites";
import { createListingBookingAction, requestListingQuoteAction } from "@/lib/actions/marketplace-transactions";
import type { DeliveryType, PricingModel } from "@/lib/marketplace";

export default function ListingActionsClient({
  listingId,
  deliveryType,
  pricingModel,
}: {
  listingId: string;
  deliveryType: DeliveryType;
  pricingModel: PricingModel;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [saved, setSaved] = useState(false);
  const direct = pricingModel === "FIXED";
  const remote = deliveryType === "REMOTE";
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Amman" }).format(new Date());

  const save = async () => {
    const result = await toggleMarketplaceFavoriteAction({ type: "LISTING", id: listingId });
    if (result.success) setSaved(result.saved);
    else setMessage(result.error || "تعذر تحديث المفضلة");
  };

  const submit = async (formData: FormData) => {
    setPending(true);
    setMessage("");
    if (direct) {
      const booking = await createListingBookingAction({
        listingId,
        bookingDate: String(formData.get("bookingDate")),
        startTime: String(formData.get("startTime")),
        endTime: String(formData.get("endTime")),
        phone: String(formData.get("phone")),
        address: remote ? "خدمة عن بُعد" : String(formData.get("address")),
        notes: String(formData.get("notes") || ""),
        idempotencyKey: crypto.randomUUID().replaceAll("-", ""),
      });
      if (!booking.success || !booking.bookingId) {
        setMessage(booking.error || "تعذر إنشاء الحجز");
        setPending(false);
        return;
      }
      const payment = await createCODPaymentAction(booking.bookingId);
      if (!payment.success) {
        setMessage("تم إنشاء الحجز، لكن تعذر اعتماد الدفع النقدي الآن. يمكنك اختياره من صفحة الحجز.");
        router.push("/bookings/" + booking.bookingId);
        return;
      }
      router.push("/bookings/" + booking.bookingId);
      return;
    }

    const budgetRaw = String(formData.get("budget") || "").trim();
    const quote = await requestListingQuoteAction({
      listingId,
      requirements: String(formData.get("requirements")),
      budget: budgetRaw ? Number(budgetRaw) : null,
      targetDate: String(formData.get("targetDate") || "") || null,
      idempotencyKey: crypto.randomUUID().replaceAll("-", ""),
    });
    if (!quote.success) {
      setMessage(quote.error || "تعذر إرسال الطلب");
      setPending(false);
      return;
    }
    router.push("/quotes");
  };

  return (
    <div className="surface-card p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-black">{direct ? "احجز هذه الخدمة" : "اطلب عرض سعر"}</h2>
          <p className="mt-1 text-[11px] leading-5 text-muted">
            {direct ? "سيُنشأ الحجز مع الدفع النقدي بعد إنجاز الخدمة." : "لن تظهر بيانات الاتصال الكاملة قبل قبول العرض وإنشاء الطلب."}
          </p>
        </div>
        <button type="button" onClick={save} aria-pressed={saved} aria-label={saved ? "إزالة من المفضلة" : "حفظ في المفضلة"}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-theme hover:bg-surface-muted">
          <Heart className={saved ? "h-5 w-5 fill-current text-brand" : "h-5 w-5"} />
        </button>
      </div>

      <form action={submit} className="mt-5 space-y-4">
        {direct ? (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="text-xs font-bold">التاريخ
                <input name="bookingDate" type="date" min={today} required className="form-field mt-1.5" />
              </label>
              <label className="text-xs font-bold">من
                <input name="startTime" type="time" defaultValue="09:00" required className="form-field mt-1.5" />
              </label>
              <label className="text-xs font-bold">إلى
                <input name="endTime" type="time" defaultValue="10:00" required className="form-field mt-1.5" />
              </label>
            </div>
            <label className="block text-xs font-bold">رقم الهاتف
              <input name="phone" inputMode="tel" dir="ltr" placeholder="0791234567" required pattern="(077|078|079)[0-9]{7}" className="form-field mt-1.5 text-right" />
            </label>
            {!remote && <label className="block text-xs font-bold">عنوان تنفيذ الخدمة
              <input name="address" minLength={5} maxLength={500} required placeholder="المحافظة، المنطقة، الشارع، وصف مختصر" className="form-field mt-1.5" />
            </label>}
            <label className="block text-xs font-bold">ملاحظات اختيارية
              <textarea name="notes" maxLength={1000} rows={3} className="form-field mt-1.5" />
            </label>
          </>
        ) : (
          <>
            <label className="block text-xs font-bold">اشرح ما تحتاجه
              <textarea name="requirements" minLength={20} maxLength={4000} required rows={6}
                placeholder="اذكر النتيجة المطلوبة والنطاق وأي تفاصيل تساعد مقدم الخدمة على التسعير..." className="form-field mt-1.5" />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-bold">ميزانية تقديرية (اختياري)
                <input name="budget" type="number" min="1" max="1000000" step="0.01" className="form-field mt-1.5" />
              </label>
              <label className="text-xs font-bold">التاريخ المستهدف (اختياري)
                <input name="targetDate" type="date" min={today} className="form-field mt-1.5" />
              </label>
            </div>
          </>
        )}
        {message && <p role="alert" aria-live="assertive" className="rounded-xl bg-[rgb(var(--danger)/0.1)] p-3 text-xs text-[rgb(var(--danger))]">{message}</p>}
        <button type="submit" disabled={pending} className="brand-button w-full">
          {pending && <LoaderCircle className="me-2 h-4 w-4 animate-spin" aria-hidden="true" />}
          {pending ? "جارٍ الإرسال..." : direct ? "تأكيد الحجز والدفع نقداً" : "إرسال طلب عرض السعر"}
        </button>
      </form>
    </div>
  );
}

