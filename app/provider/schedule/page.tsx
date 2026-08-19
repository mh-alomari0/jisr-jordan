import { CalendarDays } from "lucide-react";
import { getProviderScheduleAction } from "@/lib/actions/provider-schedule";
import ProviderScheduleClient from "./_components/provider-schedule-client";

export const metadata = {
  title: "جدولي | مساحة مقدم الخدمة",
};

export default async function ProviderSchedulePage() {
  const result = await getProviderScheduleAction();

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <section className="relative overflow-hidden rounded-[2rem] bg-[#0b817a] p-6 text-white sm:p-8">
        <div className="absolute -left-16 -top-20 h-52 w-52 rounded-full border-[22px] border-white/10" />
        <div className="relative">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
            <CalendarDays size={20} />
          </span>
          <p className="mt-6 text-[10px] font-bold text-[#c9eee8]">
            أوقات عملك
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-[-.05em] sm:text-5xl">
            خلّي العميل يعرف
            <span className="text-[#ffc985]"> متى أنت متاح.</span>
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[#d9f2ee]">
            فعّل الأيام التي تعمل فيها وحدد ساعات البداية والنهاية لكل يوم.
          </p>
        </div>
      </section>

      <div className="mt-8">
        <ProviderScheduleClient
          initialSchedule={result.schedule || []}
        />
      </div>
    </main>
  );
}
