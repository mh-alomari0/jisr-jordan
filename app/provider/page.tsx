import Link from "next/link";
import {
  ArrowLeft,
  Banknote,
  BriefcaseBusiness,
  CalendarCheck2,
  FileQuestion,
  MessageCircle,
  Plus,
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

const commissionStatusLabel: Record<string, string> = {
  PENDING: "قيد المتابعة",
  DUE: "مستحقة",
  DISPUTED: "تحت المراجعة",
};

export default async function ProviderDashboardPage() {
  const [bookingsResult, listingsResult, quotesResult] = await Promise.all([
    getProviderBookingsAction(),
    getProviderListingsAction(),
    getProviderQuoteRequestsAction(),
  ]);

  if (!bookingsResult.success) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="border-y border-theme py-10 text-center text-sm text-[rgb(var(--danger))]">
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
      icon: BriefcaseBusiness,
      href: "/provider/listings",
    },
    {
      label: "عروض بحاجة رد",
      value: openQuotes,
      icon: FileQuestion,
      href: "/provider/quotes",
    },
    {
      label: "شغل جاري",
      value: activeWork,
      icon: CalendarCheck2,
      href: "#work",
    },
    {
      label: "شغل مكتمل",
      value: completedWork,
      icon: TrendingUp,
      href: "#work",
    },
  ];

  return (
    <main className="mx-auto max-w-6xl px-4 py-7 sm:px-6 sm:py-10">
      <header className="border-b border-theme pb-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold text-brand">مساحة شغلك</p>
            <h1 className="mt-1 text-3xl font-black tracking-[-.04em] sm:text-4xl">
              شو عندك اليوم؟
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-7 text-muted">
              الطلبات، عروض الأسعار، خدماتك وعمولات جسر — كلهم هون.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link href="/provider/listings" className="brand-button !min-h-11">
              <Plus size={16} />
              أضف خدمة
            </Link>
            <Link href="/messages" className="secondary-button !min-h-11">
              <MessageCircle size={16} />
              الرسائل
            </Link>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 border-y border-theme sm:grid-cols-4">
          {metrics.map((metric, index) => {
            const Icon = metric.icon;

            return (
              <Link
                key={metric.label}
                href={metric.href}
                className={`flex items-center gap-3 px-2 py-4 transition hover:bg-surface-muted sm:px-4 ${
                  index % 2 === 0 ? "border-e border-theme" : ""
                } ${index < 2 ? "border-b border-theme sm:border-b-0" : ""} ${
                  index > 0 ? "sm:border-s sm:border-theme" : ""
                }`}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[rgb(var(--primary-soft))] text-brand">
                  <Icon size={17} />
                </span>
                <span className="min-w-0">
                  <strong className="block text-xl font-black">{metric.value}</strong>
                  <span className="block truncate text-[10px] font-bold text-muted sm:text-xs">
                    {metric.label}
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      </header>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <section id="work" className="min-w-0">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-brand">الطلبات</p>
              <h2 className="mt-1 text-2xl font-black">الشغل الجاري</h2>
            </div>
            <span className="text-xs font-bold text-muted">
              {activeWork} نشط
            </span>
          </div>

          <ProviderBookingsClient initialBookings={bookings} />
        </section>

        <aside className="space-y-6">
          <section className="border-t-2 border-[rgb(var(--accent-peach))] pt-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold text-muted">عمولات مستحقة</p>
                <strong className="mt-1 block text-2xl font-black">
                  {due.toFixed(2)} د.أ
                </strong>
              </div>
              <WalletCards size={21} className="text-[rgb(var(--accent-peach))]" />
            </div>
            <p className="mt-2 text-xs leading-6 text-muted">
              بتنحسب العمولة بعد إتمام الحجز داخل جسر.
            </p>
            <a
              href="#commissions"
              className="mt-3 inline-flex items-center gap-1 text-xs font-black text-brand"
            >
              شوف التفاصيل <ArrowLeft size={13} />
            </a>
          </section>

          <section className="border-t border-theme pt-4">
            <Link
              href="/provider/quotes"
              className="group flex items-center justify-between gap-3 py-1"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[rgb(var(--primary-soft))] text-brand">
                  <FileQuestion size={17} />
                </span>
                <div>
                  <strong className="block text-sm">عروض الأسعار</strong>
                  <span className="text-[10px] text-muted">
                    {openQuotes
                      ? `${openQuotes} بحاجة لمتابعة`
                      : "ما في طلبات جديدة"}
                  </span>
                </div>
              </div>
              <ArrowLeft
                size={15}
                className="text-muted transition group-hover:-translate-x-0.5"
              />
            </Link>
          </section>
        </aside>
      </div>

      <section id="commissions" className="mt-10 border-t border-theme pt-7">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-brand">الحسابات</p>
            <h2 className="mt-1 text-2xl font-black">العمولات</h2>
          </div>
          <p className="text-[10px] text-muted">آخر 15 عملية</p>
        </div>

        {(commissions || []).length > 0 ? (
          <div className="overflow-x-auto border-y border-theme">
            <table className="w-full min-w-[620px] text-right text-xs">
              <thead className="text-muted">
                <tr className="border-b border-theme">
                  <th className="px-3 py-3 font-bold">قيمة الحجز</th>
                  <th className="px-3 py-3 font-bold">النسبة</th>
                  <th className="px-3 py-3 font-bold">عمولة جسر</th>
                  <th className="px-3 py-3 font-bold">صافي ربحك</th>
                  <th className="px-3 py-3 font-bold">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme">
                {(commissions || []).slice(0, 15).map((item) => (
                  <tr key={item.id} className="hover:bg-surface-muted">
                    <td className="px-3 py-3 font-bold">
                      {Number(item.gross_amount).toFixed(2)} د.أ
                    </td>
                    <td className="px-3 py-3">
                      {Number(item.rate_percent).toFixed(1)}%
                    </td>
                    <td className="px-3 py-3 font-bold text-brand">
                      {Number(item.commission_amount).toFixed(2)} د.أ
                    </td>
                    <td className="px-3 py-3 font-black">
                      {(
                        Number(item.gross_amount) -
                        Number(item.commission_amount)
                      ).toFixed(2)}{" "}
                      د.أ
                    </td>
                    <td className="px-3 py-3 text-muted">
                      {commissionStatusLabel[item.status] || item.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="border-y border-theme py-10 text-center">
            <Banknote className="mx-auto h-6 w-6 text-muted" />
            <p className="mt-3 text-sm font-bold">ما عليك عمولات معلقة</p>
            <p className="mt-1 text-xs text-muted">حسابك مرتب لحد الآن.</p>
          </div>
        )}
      </section>
    </main>
  );
}
