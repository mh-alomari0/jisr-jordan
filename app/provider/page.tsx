import Link from "next/link";
import { Banknote, BriefcaseBusiness, FileQuestion, ListChecks, MessageCircle } from "lucide-react";
import { getProviderBookingsAction } from "@/lib/actions/provider-bookings";
import { getProviderListingsAction } from "@/lib/actions/provider-listings";
import { getProviderQuoteRequestsAction } from "@/lib/actions/marketplace-transactions";
import { createServerSupabaseClient, getAuthenticatedUser } from "@/lib/supabase/server";
import ProviderBookingsClient from "./_components/provider-bookings-client";

export const metadata = { title: "مساحة مقدم الخدمة" };

export default async function ProviderDashboardPage() {
  const [bookingsResult, listingsResult, quotesResult] = await Promise.all([
    getProviderBookingsAction(), getProviderListingsAction(), getProviderQuoteRequestsAction(),
  ]);
  if (!bookingsResult.success) return <div className="surface-card p-8 text-center text-[rgb(var(--danger))]">{bookingsResult.error}</div>;
  const supabase = await createServerSupabaseClient();
  const user = await getAuthenticatedUser(supabase);
  const { data: commissions } = user ? await supabase.from("commission_ledger")
    .select("id, booking_id, gross_amount, rate_percent, commission_amount, currency, status, due_at, created_at").eq("provider_id", user.id).in("status", ["PENDING", "DUE", "DISPUTED"]).order("created_at", { ascending: false }).limit(100) : { data: [] };
  const bookings = bookingsResult.bookings || [];
  const listings = listingsResult.listings || [];
  const quotes = quotesResult.requests || [];
  const due = (commissions || []).reduce((sum, item) => sum + Number(item.commission_amount || 0), 0);
  const cards = [
    { label: "عروض منشورة", value: listings.filter((item) => item.status === "PUBLISHED").length, href: "/provider/listings", icon: BriefcaseBusiness },
    { label: "طلبات سعر مفتوحة", value: quotes.filter((item) => ["REQUESTED", "QUOTED"].includes(item.status)).length, href: "/provider/quotes", icon: FileQuestion },
    { label: "أعمال جارية", value: bookings.filter((item) => ["ASSIGNED", "IN_PROGRESS"].includes(item.status)).length, href: "#work", icon: ListChecks },
    { label: "عمولات معلقة", value: due.toFixed(2) + " د.أ", href: "#commissions", icon: Banknote },
    { label: "رسائل العملاء", value: "فتح", href: "/messages", icon: MessageCircle },
  ];
  return (
    <div className="mx-auto max-w-6xl space-y-7 p-3 sm:p-6">
      <header><h1 className="text-2xl font-black">مساحة مقدم الخدمة</h1><p className="mt-1 text-sm text-muted">إدارة عروضك وطلبات العملاء والعمل الجاري من مكان واحد.</p></header>
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5" aria-label="ملخص الأعمال">
        {cards.map(({ label, value, href, icon: Icon }) => <Link key={label} href={href} className="surface-card p-4 transition hover:-translate-y-0.5 hover:border-[rgb(var(--primary)/0.5)]"><Icon className="h-5 w-5 text-brand" /><strong className="mt-3 block text-xl">{value}</strong><span className="text-[11px] text-muted">{label}</span></Link>)}
      </section>
      <section id="work"><div className="mb-4"><h2 className="text-xl font-black">الطلبات الموكلة إليك</h2><p className="mt-1 text-xs text-muted">ابدأ وأنهِ الطلبات فقط وفق دورة الحالة المسموحة.</p></div><ProviderBookingsClient initialBookings={bookings} /></section>
      <section id="commissions" className="border-t border-theme pt-5"><h2 className="font-black">التزامات العمولة</h2><p className="mt-2 text-xs leading-6 text-muted">يدفع العميل لك وفق ترتيب الخدمة. عمولة جسر المستحقة عليك محفوظة كلقطة عند الاتفاق ولا تتغير إذا تغيرت القواعد لاحقاً. التسوية الحالية يدوية وموثقة إدارياً.</p><strong className="mt-3 block text-lg text-brand">{due.toFixed(2)} د.أ معلقة أو مستحقة</strong>{(commissions || []).length > 0 && <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[520px] text-xs"><thead><tr className="border-b border-theme text-right text-muted"><th className="py-2">المبلغ المتفق</th><th>النسبة</th><th>عمولة جسر</th><th>صافي اقتصادي</th><th>الحالة</th></tr></thead><tbody>{(commissions || []).slice(0, 20).map((item) => <tr key={item.id} className="border-b border-theme"><td className="py-3">{Number(item.gross_amount).toFixed(2)} د.أ</td><td>{Number(item.rate_percent).toFixed(2)}%</td><td className="font-black text-brand">{Number(item.commission_amount).toFixed(2)} د.أ</td><td>{(Number(item.gross_amount) - Number(item.commission_amount)).toFixed(2)} د.أ</td><td>{item.status}</td></tr>)}</tbody></table></div>}</section>
    </div>
  );
}
