import Link from "next/link";
import {
  ArrowLeft,
  Banknote,
  BriefcaseBusiness,
  CalendarCheck2,
  FileQuestion,
  MessageCircle,
  Plus,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import { getProviderBookingsAction } from "@/lib/actions/provider-bookings";
import { getProviderListingsAction } from "@/lib/actions/provider-listings";
import { getProviderQuoteRequestsAction } from "@/lib/actions/marketplace-transactions";
import {
  createServerSupabaseClient,
  getAuthenticatedUser,
} from "@/lib/supabase/server";
import ProviderBookingsClient from "./_components/provider-bookings-client";

export const metadata = { title: "مساحة مقدم الخدمة | جسر الأردن" };

export default async function ProviderDashboardPage() {
  const [bookingsResult, listingsResult, quotesResult] = await Promise.all([
    getProviderBookingsAction(),
    getProviderListingsAction(),
    getProviderQuoteRequestsAction(),
  ]);

  if (!bookingsResult.success) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="surface-card p-8 text-center text-sm text-[rgb(var(--danger))]">
          {bookingsResult.error}
        </div>
      </main>
    );
  }

  const supabase = await createServerSupabaseClient();
  const user = await getAuthenticatedUser(supabase);

  const { data: commissions } = user
    ? await supabase
        .from("commission_ledger")
        .select(
          "id, booking_id, gross_amount, rate_percent, commission_amount, currency, status, due_at, created_at",
        )
        .eq("provider_id", user.id)
        .in("status", ["PENDING", "DUE", "DISPUTED"])
        .order("created_at", { ascending: false })
        .limit(100)
    : { data: [] };

  const bookings = bookingsResult.bookings || [];
  const listings = listingsResult.listings || [];
  const quotes = quotesResult.requests || [];

  const publishedCount = listings.filter(
    (item) => item.status === "PUBLISHED",
  ).length;

  const openQuotes = quotes.filter((item) =>
    ["REQUESTED", "QUOTED"].includes(item.status),
  ).length;

  const activeWork = bookings.filter((item) =>
    ["ASSIGNED", "IN_PROGRESS"].includes(item.status),
  ).length;

  const completedWork = bookings.filter(
    (item) => item.status === "COMPLETED",
  ).length;

  const due = (commissions || []).reduce(
    (sum, item) => sum + Number(item.commission_amount || 0),
    0,
  );

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-4 py-6 sm:px-6 sm:py-10">
      {/* 💼 Header & Stats Hero */}
      <section className="relative overflow-hidden rounded-[2.4rem] bg-gradient-to-br from-[#065053] via-[#087f79] to-[#0ba59d] p-6 text-white shadow-lift sm:p-9">
        <div className="pointer-events-none absolute -left-20 -top-24 h-72 w-72 rounded-full border-[28px] border-white/10" />
        <div className="pointer-events-none absolute -bottom-32 left-[46%] h-64 w-64 rounded-full bg-[#ffc985]/15 blur-xl" />

        <div className="relative grid gap-8 lg:grid-cols-[1.15fr_.85fr] lg:items-end">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-black text-[#a6f0e7] backdrop-blur-md">
              <Sparkles size={12} /> مساحة الشغل والإنجاز
            </span>

            <h1 className="mt-4 text-3xl font-black leading-tight sm:text-5xl">
              أهلاً بعودتك 👋
              <br />
              <span className="text-[#ffc985]">كل شغلك بمكان واحد.</span>
            </h1>

            <p className="mt-3 max-w-lg text-xs leading-6 text-[#d9f3ee] sm:text-sm">
              تابع طلبات الزبائن، العروض المقدمة، والتزامات العمولات بكل وضوح وأمان.
            </p>

            <div className="mt-6 flex flex-wrap gap-2.5">
              <Link
                href="/provider/listings"
                className="brand-button !min-h-[42px] !rounded-xl !bg-white !text-[#087f79] !shadow-lg"
              >
                <Plus size={16} /> أضف خدمة جديدة
              </Link>

              <Link
                href="/messages"
                className="secondary-button !min-h-[42px] !rounded-xl !border-white/20 !bg-white/10 !text-white hover:!bg-white/20"
              >
                <MessageCircle size={16} /> المحادثات
              </Link>
            </div>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "خدمات منشورة", val: publishedCount, icon: BriefcaseBusiness, href: "/provider/listings" },
              { label: "عروض أسعار مفتوحة", val: openQuotes, icon: FileQuestion, href: "/provider/quotes" },
              { label: "طلبات قيد التنفيذ", val: activeWork, icon: CalendarCheck2, href: "#work" },
              { label: "خدمات مكتملة", val: completedWork, icon: TrendingUp, href: "#work" },
            ].map((m) => {
              const Icon = m.icon;
              return (
                <Link
                  key={m.label}
                  href={m.href}
                  className="rounded-3xl border border-white/15 bg-white/10 p-4 backdrop-blur-md transition-all hover:bg-white/20 active:scale-95"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white/15 text-[#c9eee8]">
                    <Icon size={18} />
                  </span>
                  <strong className="mt-3 block text-2xl font-black">{m.val}</strong>
                  <span className="text-[10px] text-[#d8efeb] font-bold">{m.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Active Work Section */}
      <section className="grid gap-6 lg:grid-cols-[1.3fr_.7fr]">
        <div className="surface-card p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-theme pb-4">
            <div>
              <p className="text-[10px] font-black text-brand">المهام العاجلة</p>
              <h2 className="text-xl font-black">الطلبات الجارية</h2>
            </div>
            <span className="status-pill bg-[rgb(var(--primary-soft))] text-brand font-black">
              {activeWork} نشط
            </span>
          </div>

          <div id="work">
            <ProviderBookingsClient initialBookings={bookings} />
          </div>
        </div>

        {/* Commissions & Quotes Side Cards */}
        <aside className="space-y-4">
          {/* 💰 Wallet / Commission Card */}
          <div className="surface-card p-5 sm:p-6 bg-gradient-to-br from-[#f8ede6] to-[#f4ded3] text-[#743b35]">
            <div className="flex items-center justify-between">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/60 shadow-sm">
                <WalletCards size={20} className="text-[#96473e]" />
              </span>
              <span className="status-pill bg-white/60 text-[#743b35] font-black">
                عمولات مستحقة
              </span>
            </div>

            <p className="mt-4 text-[10px] font-bold opacity-75">المبلغ المطلوب سداده</p>
            <strong className="mt-1 block text-3xl font-black text-[#96473e]">
              {due.toFixed(2)} د.أ
            </strong>
            <p className="mt-2 text-xs leading-5 opacity-80">
              يتم احتساب العمولة تلقائياً عند إتمام الحجوزات داخل المنصة.
            </p>

            <a
              href="#commissions"
              className="mt-4 inline-flex items-center gap-1 text-xs font-black text-[#96473e] hover:underline"
            >
              عرض سجل العمولات <ArrowLeft size={13} />
            </a>
          </div>

          {/* Quotes Shortcut */}
          <Link
            href="/provider/quotes"
            className="surface-card block p-5 transition-transform hover:-translate-y-1 active:scale-[0.98]"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[rgb(var(--primary-soft))] text-brand">
                <FileQuestion size={18} />
              </span>
              <div>
                <strong className="block text-sm font-black">طلبات عروض الأسعار</strong>
                <span className="text-[10px] text-muted font-bold">
                  {openQuotes ? `${openQuotes} طلب بانتظار تسعيرك` : "لا توجد طلبات جديدة"}
                </span>
              </div>
            </div>
          </Link>
        </aside>
      </section>

      {/* Commissions History Ledger */}
      <section id="commissions" className="surface-card p-5 sm:p-6 space-y-4">
        <div>
          <p className="text-[10px] font-black text-brand">سجل العمليات</p>
          <h2 className="text-xl font-black">تفاصيل عمولات منصة جسر</h2>
        </div>

        {(commissions || []).length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-surface-muted text-muted font-bold">
                <tr>
                  <th className="p-3 rounded-s-xl">قيمة الحجز</th>
                  <th className="p-3">نسبة العمولة</th>
                  <th className="p-3">عمولة جسر</th>
                  <th className="p-3">صافي ربحك</th>
                  <th className="p-3 rounded-e-xl">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme">
                {(commissions || []).slice(0, 15).map((item) => (
                  <tr key={item.id} className="hover:bg-surface-muted/50">
                    <td className="p-3 font-bold">{Number(item.gross_amount).toFixed(2)} د.أ</td>
                    <td className="p-3">{Number(item.rate_percent).toFixed(1)}%</td>
                    <td className="p-3 font-black text-brand">{Number(item.commission_amount).toFixed(2)} د.أ</td>
                    <td className="p-3 font-black text-[rgb(var(--success))]">
                      {(Number(item.gross_amount) - Number(item.commission_amount)).toFixed(2)} د.أ
                    </td>
                    <td className="p-3">
                      <span className="status-pill bg-surface-muted text-muted font-bold">
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center space-y-2 border border-dashed border-theme rounded-2xl">
            <Banknote className="mx-auto h-7 w-7 text-brand" />
            <p className="text-xs font-bold">لا توجد أي عمولات معلقة حالياً ✓</p>
          </div>
        )}
      </section>
    </main>
  );
}