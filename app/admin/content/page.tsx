import Link from "next/link";
import { getAdminProviderContentAction } from "@/lib/actions/marketplace-admin";
import AdminContentClient from "./_components/admin-content-client";

export const metadata = { title: "مراجعة محتوى المزودين" };
function one(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] : value; }
export default async function AdminContentPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams; const status = one(params.status); const page = Math.max(1, Number(one(params.page) || 1));
  const result = await getAdminProviderContentAction(page, status);
  return <div className="mx-auto max-w-6xl p-3 sm:p-6"><header className="mb-5"><h1 className="text-2xl font-black">مراجعة المحتوى المهني</h1><p className="mt-1 text-sm text-muted">إشراف بشري أساسي على المحتوى؛ لا توجد ادعاءات باعتدال آلي.</p></header><nav className="mb-5 flex gap-2 overflow-x-auto">{["ALL", "PENDING_REVIEW", "PUBLISHED", "DEACTIVATED", "REJECTED"].map((item) => <Link key={item} href={item === "ALL" ? "/admin/content" : "/admin/content?status=" + item} className={(status || "ALL") === item ? "brand-button !min-h-9 shrink-0 !rounded-full !px-4 !py-1" : "secondary-button !min-h-9 shrink-0 !rounded-full !px-4 !py-1"}>{item}</Link>)}</nav>{result.success ? <AdminContentClient posts={result.posts as never} /> : <div role="alert" className="surface-card p-8">{result.error}</div>}</div>;
}

