"use client";

import React, { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, Check, Clock3, Loader2, MapPin, Phone, ReceiptText } from "lucide-react";
import { createBookingAction } from "@/lib/actions/create-booking";
import { TIME_SLOTS } from "@/lib/constants";

interface ServiceOption { id: string; title: string; price: number; }
interface BookingFlowProps { services: ServiceOption[]; }

function slotTo24h(slot: string): string {
  const match = slot.match(/(\d{1,2}):(\d{2})\s*(صباحًا|مساءً)/);
  if (!match) return slot;
  let hour = parseInt(match[1], 10);
  const minute = match[2];
  const period = match[3];
  if (period === "مساءً" && hour !== 12) hour += 12;
  if (period === "صباحًا" && hour === 12) hour = 0;
  return `${String(hour).padStart(2, "0")}:${minute}`;
}

function FieldHeading({ icon: Icon, title, copy }: { icon: typeof CalendarDays; title: string; copy?: string; }) {
  return (
    <div className="mb-3 flex items-start gap-3">
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[rgb(var(--primary-soft))] text-brand"><Icon size={17} /></span>
      <div><p className="text-sm font-black">{title}</p>{copy && <p className="mt-0.5 text-[10px] leading-5 text-muted">{copy}</p>}</div>
    </div>
  );
}

export default function BookingFlow({ services }: BookingFlowProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedId = searchParams.get("serviceId");
  const [selectedServiceId, setSelectedServiceId] = useState(preselectedId || "");
  const [bookingDate, setBookingDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const availableDates = useMemo(() => {
    const today = new Date();
    const dates: { value: string; label: string }[] = [];
    for (let index = 0; index < 14; index += 1) {
      const date = new Date(today);
      date.setDate(today.getDate() + index);
      dates.push({ value: date.toISOString().split("T")[0], label: date.toLocaleDateString("ar-JO", { weekday: "short", day: "numeric", month: "short" }) });
    }
    return dates;
  }, []);

  const selectedService = services.find((service) => service.id === selectedServiceId);
  const phoneIsValid = /^(077|078|079)\d{7}$/.test(phone);
  const addressIsValid = address.trim().length >= 5;
  const canSubmit = Boolean(selectedServiceId && bookingDate && selectedSlot && phoneIsValid && addressIsValid);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setError("");
    const startTime = slotTo24h(selectedSlot);
    const [startHour, startMinute] = startTime.split(":").map(Number);
    const endMinutes = startHour * 60 + startMinute + 60;
    const endTime = `${String(Math.floor(endMinutes / 60)).padStart(2, "0")}:${String(endMinutes % 60).padStart(2, "0")}`;
    const result = await createBookingAction({ serviceId: selectedServiceId, bookingDate, startTime, endTime, phone, address, notes: notes || undefined, idempotencyKey: `bk_${Date.now()}_${Math.random().toString(36).slice(2, 12)}` });
    if (result.success && result.data) { router.push(`/booking/success?id=${result.data.bookingId}`); return; }
    setError(result.error || "ما قدرنا نثبت الحجز. جرّب مرة ثانية.");
    setSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-7">
      <section className="border-b border-theme pb-6">
        <p className="text-[10px] font-bold text-brand">طلب جديد</p>
        <h1 className="mt-1 text-2xl font-black tracking-[-.04em] sm:text-3xl">خلّينا نرتبها وحدة وحدة.</h1>
        <p className="mt-2 max-w-xl text-xs leading-6 text-muted">اختار الخدمة والوقت، واحكيلنا وين بدك إياها. ما في خطوات مخفية ولا تفاصيل زيادة.</p>
      </section>

      <section>
        <FieldHeading icon={ReceiptText} title="شو الخدمة اللي بدك إياها؟" copy="إذا دخلت من صفحة خدمة، رح تكون محددة من قبل." />
        <div className="grid gap-2.5 sm:grid-cols-2">
          {services.map((service) => {
            const selected = selectedServiceId === service.id;
            return <button key={service.id} type="button" onClick={() => setSelectedServiceId(service.id)} className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3.5 text-right transition active:scale-[0.98] ${selected ? "border-[rgb(var(--primary))] bg-[rgb(var(--primary-soft))]" : "border-theme bg-surface hover:border-[rgb(var(--border-strong))]"}`}><div className="min-w-0"><p className="line-clamp-2 text-sm font-black">{service.title}</p><p className="mt-1 text-[10px] text-muted">السعر المتوقع {service.price} د.أ</p></div><span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${selected ? "border-[rgb(var(--primary))] bg-[rgb(var(--primary))] text-white" : "border-theme text-transparent"}`}><Check size={14} /></span></button>;
          })}
        </div>
      </section>

      <section>
        <FieldHeading icon={CalendarDays} title="أي يوم بناسبك؟" copy="قدامك أول أسبوعين عشان تختار براحتك." />
        <div className="mobile-snap-row -mx-4 px-4 pb-1 sm:mx-0 sm:px-0">{availableDates.map((date) => { const selected = bookingDate === date.value; return <button key={date.value} type="button" onClick={() => setBookingDate(date.value)} className={`min-w-[104px] rounded-xl border px-3 py-2.5 text-center text-[11px] font-bold transition active:scale-95 ${selected ? "border-[rgb(var(--primary))] bg-[rgb(var(--primary))] text-white" : "border-theme bg-surface text-muted"}`}>{date.label}</button>; })}</div>
      </section>

      <section>
        <FieldHeading icon={Clock3} title="وأي وقت؟" copy="اختار أقرب وقت مناسب إلك." />
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">{TIME_SLOTS.map((slot) => { const selected = selectedSlot === slot; return <button key={slot} type="button" onClick={() => setSelectedSlot(slot)} className={`rounded-xl border px-2 py-2.5 text-[11px] font-bold transition active:scale-95 ${selected ? "border-[rgb(var(--primary))] bg-[rgb(var(--primary))] text-white" : "border-theme bg-surface text-muted"}`}>{slot}</button>; })}</div>
      </section>

      <section className="grid gap-5 sm:grid-cols-2">
        <div><FieldHeading icon={Phone} title="رقم للتواصل" /><input id="booking-phone" type="tel" dir="ltr" inputMode="tel" autoComplete="tel" placeholder="0791234567" value={phone} onChange={(event) => setPhone(event.target.value.replace(/\s/g, ""))} className="form-field text-left" />{phone && !phoneIsValid && <p className="mt-1.5 text-[10px] text-[rgb(var(--danger))]">استخدم رقم أردني يبدأ بـ 077 أو 078 أو 079.</p>}</div>
        <div><FieldHeading icon={MapPin} title="وين الخدمة؟" /><input id="booking-address" type="text" autoComplete="street-address" placeholder="المدينة، الحي، الشارع..." value={address} onChange={(event) => setAddress(event.target.value)} className="form-field" />{address && !addressIsValid && <p className="mt-1.5 text-[10px] text-[rgb(var(--danger))]">زيد شوية تفاصيل حتى نعرف المكان صح.</p>}</div>
      </section>

      <section><label htmlFor="booking-notes" className="block text-sm font-black">في إشي لازم يعرفه مقدم الخدمة؟</label><p className="mt-1 text-[10px] text-muted">اختياري — اكتب بس التفاصيل اللي بتفرق.</p><textarea id="booking-notes" rows={3} maxLength={500} placeholder="مثلاً: التسريب تحت المجلى، أو يفضّل الاتصال قبل الوصول..." value={notes} onChange={(event) => setNotes(event.target.value)} className="form-field mt-3 resize-none py-3" /><p className="mt-1 text-left text-[9px] text-muted">{notes.length}/500</p></section>

      {selectedService && <section className="flex items-center justify-between gap-4 border-y border-theme py-4"><div><p className="text-[10px] text-muted">المبلغ المتوقع</p><p className="mt-0.5 text-xs font-bold text-muted">السعر النهائي يعتمد على تفاصيل الخدمة.</p></div><p className="shrink-0 text-xl font-black">{selectedService.price} د.أ</p></section>}
      {error && <div role="alert" className="rounded-xl border border-[rgb(var(--danger)/0.25)] bg-[rgb(var(--danger)/0.06)] px-4 py-3 text-xs leading-6 text-[rgb(var(--danger))]">{error}</div>}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-[10px] leading-5 text-muted">لما تضغط تأكيد، بننشئ الطلب وبنوديك لتفاصيله.</p><button type="submit" disabled={!canSubmit || submitting} className="brand-button min-w-[180px]">{submitting && <Loader2 className="h-4 w-4 animate-spin" />}{submitting ? "بنثبت طلبك..." : "تأكيد الطلب"}</button></div>
    </form>
  );
}
