import Link from "next/link";
import { getAdminMarketplaceListingsAction } from "@/lib/actions/marketplace-admin";
import AdminListingsClient from "./_components/admin-listings-client";

export const metadata = { title: "مراجعة عروض الخدمات" };

function one(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] : value; }
export default async function AdminListingsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const status = one(params.status);
  const page = Math.max(1, Number.parseInt(one(params.page) || "1", 10) || 1);
  const result = await getAdminMarketplaceListingsAction(page, status);
  return <div className="mx-auto max-w-6xl p-3 sm:p-6"><header className="mb-5"><h1 className="text-2xl font-black">عروض مقدمي الخدمة</h1><p className="mt-1 text-sm text-muted">مراجعة العروض الحساسة وإيقاف المحتوى غير الملائم دون حذف السجل.</p></header><nav className="mb-5 flex gap-2 overflow-x-auto">{["ALL", "PENDING_REVIEW", "PUBLISHED", "PAUSED", "REJECTED"].map((item) => <Link key={item} href={item === "ALL" ? "/admin/listings" : "/admin/listings?status=" + item} className={(status || "ALL") === item ? "brand-button !min-h-9 shrink-0 !rounded-full !px-4 !py-1" : "secondary-button !min-h-9 shrink-0 !rounded-full !px-4 !py-1"}>{item}</Link>)}</nav>{result.success ? <AdminListingsClient listings={result.listings as never} /> : <div role="alert" className="surface-card p-8 text-center">{result.error}</div>}<div className="mt-5 flex justify-center gap-2">{page > 1 && <Link href={"/admin/listings?page=" + (page - 1) + (status ? "&status=" + status : "")} className="secondary-button">السابق</Link>}{result.hasMore && <Link href={"/admin/listings?page=" + (page + 1) + (status ? "&status=" + status : "")} className="secondary-button">التالي</Link>}</div></div>;
}

