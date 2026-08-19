import Link from "next/link";
import {
  ArrowLeft,
  Banknote,
  BriefcaseBusiness,
  CalendarCheck2,
  FileQuestion,
  MessageCircle,
  Plus,
  Sparkles,
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

export const metadata = { title: "مساحة مقدم الخدمة" };

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

  const metrics = [
    {
      label: "خدمات منشورة",
      value: publishedCount,
      href: "/provider/listings",
      icon: BriefcaseBusiness,
    },
    {
      label: "طلبات سعر",
      value: openQuotes,
      href: "/provider/quotes",
      icon: FileQuestion,
    },
    {
      label: "شغل جاري",
      value: activeWork,
      href: "#work",
      icon: CalendarCheck2,
    },
    {
      label: "خدمات مكتملة",
      value: completedWork,
      href: "#work",
      icon: Sparkles,
    },
  ];

  return (
    <main className="mx-auto max-w-6xl space-y-10 px-4 py-8 sm:px-6 sm:py-12">
      <section className="relative overflow-hidden rounded-[2.25rem] bg-[#0b817a] p-6 text-white shadow-[0_24px_65px_rgba(13,90,84,0.16)] sm:p-9 lg:p-10">
        <div className="pointer-events-none absolute -left-20 -top-24 h-72 w-72 rounded-full border-[28px] border-white/10" />
        <div className="pointer-events-none absolute -bottom-32 left-[46%] h-64 w-64 rounded-full bg-[#ffc985]/15" />

        <div className="relative grid gap-8 lg:grid-cols-[1.15fr_.85fr] lg:items-end">
          <div>
            <p className="text-[10px] font-bold text-[#c9eee8]">
              صباح الشغل 👋
            </p>

            <h1 className="mt-3 max-w-xl text-4xl font-bold leading-[1.15] tracking-[-.06em] sm:text-6xl">
              كل شغلك،
              <br />
              <span className="text-[#ffc985]">قدامك وواضح.</span>
            </h1>

            <p className="mt-4 max-w-lg text-sm leading-7 text-[#ddf4f0]">
              تابع طلبات العملاء، خدماتك، عروض الأسعار، والعمولات
              من مساحة واحدة مصممة للشغل اليومي.
            </p>

            <div className="mt-7 flex flex-wrap gap-2">
              <Link
                href="/provider/listings"
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-5 text-xs font-bold text-[#0b817a] transition hover:-translate-y-0.5"
              >
                <Plus size={15} />
                أضف خدمة
              </Link>

              <Link
                href="/messages"
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/25 bg-white/10 px-5 text-xs font-bold transition hover:bg-white/15"
              >
                <MessageCircle size={15} />
                الرسائل
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {metrics.map(({ label, value, href, icon: Icon }) => (
              <Link
                key={label}
                href={href}
                className="rounded-3xl border border-white/15 bg-white/10 p-4 backdrop-blur transition hover:bg-white/15"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white/10 text-[#c9eee8]">
                  <Icon size={17} />
                </span>
                <strong className="mt-5 block text-2xl font-bold">
                  {value}
                </strong>
                <span className="mt-1 block text-[10px] text-[#d8efeb]">
                  {label}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.35fr_.65fr]">
        <div className="rounded-[2rem] border border-theme bg-surface p-5 shadow-soft sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold text-brand">
                المطلوب منك الآن
              </p>
              <h2 className="mt-1 text-2xl font-bold tracking-[-.04em]">
                الشغل الجاري
              </h2>
              <p className="mt-1 text-xs text-muted">
                الطلبات المعيّنة لك وقيد التنفيذ.
              </p>
            </div>

            <span className="rounded-full bg-surface-muted px-3 py-1.5 text-[10px] font-bold text-muted">
              {activeWork} نشط
            </span>
          </div>

          <div id="work" className="mt-5">
            <ProviderBookingsClient initialBookings={bookings} />
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-[2rem] border border-theme bg-[#f8e0d6] p-5 text-[#743b35] shadow-soft sm:p-6">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/55">
              <WalletCards size={18} />
            </span>

            <p className="mt-6 text-[10px] font-bold opacity-70">
              التزامات العمولة
            </p>
            <strong className="mt-1 block text-3xl font-bold">
              {due.toFixed(2)} د.أ
            </strong>
            <p className="mt-2 text-[11px] leading-6 opacity-75">
              المبلغ المعلق أو المستحق حسب الأعمال المسجلة في جسر.
            </p>

            <a
              href="#commissions"
              className="mt-5 inline-flex items-center gap-1 text-xs font-bold"
            >
              التفاصيل
              <ArrowLeft size={14} />
            </a>
          </div>

          <Link
            href="/provider/quotes"
            className="block rounded-[2rem] border border-theme bg-surface p-5 shadow-soft transition hover:-translate-y-0.5"
          >
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[rgb(var(--primary-soft))] text-brand">
              <FileQuestion size={18} />
            </span>
            <p className="mt-6 text-[10px] font-bold text-brand">
              فرص جديدة
            </p>
            <h3 className="mt-1 text-lg font-bold">
              {openQuotes
                ? `${openQuotes} طلب سعر بانتظارك`
                : "ما في طلبات سعر مفتوحة"}
            </h3>
            <p className="mt-2 text-[11px] leading-6 text-muted">
              رد على طلبات العملاء من مساحة عروض الأسعار.
            </p>
          </Link>
        </aside>
      </section>

      <section id="commissions" className="border-t border-theme pt-8">
        <div className="mb-5">
          <p className="text-[10px] font-bold text-brand">
            الحسابات
          </p>
          <h2 className="mt-1 text-2xl font-bold tracking-[-.04em]">
            العمولة المستحقة لجسر
          </h2>
          <p className="mt-2 max-w-2xl text-xs leading-6 text-muted">
            العمولة محفوظة كلقطة وقت الاتفاق، لذلك لا تتغير على
            الحجز القديم إذا تغيرت قواعد العمولة لاحقاً.
          </p>
        </div>

        {(commissions || []).length > 0 ? (
          <div className="overflow-hidden rounded-[1.75rem] border border-theme bg-surface">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[660px] text-xs">
                <thead className="bg-surface-muted text-right text-muted">
                  <tr>
                    <th className="px-4 py-3">المبلغ المتفق</th>
                    <th className="px-4 py-3">النسبة</th>
                    <th className="px-4 py-3">عمولة جسر</th>
                    <th className="px-4 py-3">الصافي</th>
                    <th className="px-4 py-3">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {(commissions || []).slice(0, 20).map((item) => (
                    <tr key={item.id} className="border-t border-theme">
                      <td className="px-4 py-4 font-bold">
                        {Number(item.gross_amount).toFixed(2)} د.أ
                      </td>
                      <td className="px-4 py-4">
                        {Number(item.rate_percent).toFixed(2)}%
                      </td>
                      <td className="px-4 py-4 font-bold text-brand">
                        {Number(item.commission_amount).toFixed(2)} د.أ
                      </td>
                      <td className="px-4 py-4">
                        {(
                          Number(item.gross_amount) -
                          Number(item.commission_amount)
                        ).toFixed(2)}{" "}
                        د.أ
                      </td>
                      <td className="px-4 py-4">
                        {item.status}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="rounded-[1.75rem] border border-dashed border-[rgb(var(--primary)/0.26)] bg-[rgb(var(--primary)/0.025)] p-8 text-center">
            <Banknote className="mx-auto h-6 w-6 text-brand" />
            <h3 className="mt-3 text-sm font-bold">
              ما عليك عمولات معلقة حالياً
            </h3>
            <p className="mt-1 text-[11px] text-muted">
              أي التزام جديد رح يظهر هون بشكل واضح.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
