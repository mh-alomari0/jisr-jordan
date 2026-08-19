import Link from "next/link";
import { Banknote, BriefcaseBusiness, FileQuestion, ListChecks } from "lucide-react";
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
    .select("commission_amount, status").eq("provider_id", user.id).in("status", ["PENDING", "DUE", "DISPUTED"]).limit(100) : { data: [] };
  const bookings = bookingsResult.bookings || [];
  const listings = listingsResult.listings || [];
  const quotes = quotesResult.requests || [];
  const due = (commissions || []).reduce((sum, item) => sum + Number(item.commission_amount || 0), 0);
  const cards = [
    { label: "عروض منشورة", value: listings.filter((item) => item.status === "PUBLISHED").length, href: "/provider/listings", icon: BriefcaseBusiness },
    { label: "طلبات سعر مفتوحة", value: quotes.filter((item) => ["REQUESTED", "QUOTED"].includes(item.status)).length, href: "/provider/quotes", icon: FileQuestion },
    { label: "أعمال جارية", value: bookings.filter((item) => ["ASSIGNED", "IN_PROGRESS"].includes(item.status)).length, href: "#work", icon: ListChecks },
    { label: "عمولات معلقة", value: due.toFixed(2) + " د.أ", href: "#commissions", icon: Banknote },
  ];
  return (
    <div className="mx-auto max-w-6xl space-y-7 p-3 sm:p-6">
      <header><h1 className="text-2xl font-black">مساحة مقدم الخدمة</h1><p className="mt-1 text-sm text-muted">إدارة عروضك وطلبات العملاء والعمل الجاري من مكان واحد.</p></header>
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="ملخص الأعمال">
        {cards.map(({ label, value, href, icon: Icon }) => <Link key={label} href={href} className="surface-card p-4 transition hover:-translate-y-0.5 hover:border-[rgb(var(--primary)/0.5)]"><Icon className="h-5 w-5 text-brand" /><strong className="mt-3 block text-xl">{value}</strong><span className="text-[11px] text-muted">{label}</span></Link>)}
      </section>
      <section id="work"><div className="mb-4"><h2 className="text-xl font-black">الطلبات الموكلة إليك</h2><p className="mt-1 text-xs text-muted">ابدأ وأنهِ الطلبات فقط وفق دورة الحالة المسموحة.</p></div><ProviderBookingsClient initialBookings={bookings} /></section>
      <section id="commissions" className="surface-card p-5"><h2 className="font-black">التزامات العمولة</h2><p className="mt-2 text-xs leading-6 text-muted">تظهر العمولة من لقطة المبلغ المتفق عليه، وتصبح مستحقة بعد إكمال الخدمة. التسوية تديرها الإدارة ضمن سجل تدقيق.</p><strong className="mt-3 block text-lg text-brand">{due.toFixed(2)} د.أ معلقة أو مستحقة</strong></section>
    </div>
  );
}
