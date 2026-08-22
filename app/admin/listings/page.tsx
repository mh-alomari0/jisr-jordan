import Link from "next/link";
import { getAdminMarketplaceListingsAction } from "@/lib/actions/marketplace-admin";
import AdminListingsClient from "./_components/admin-listings-client";

export const metadata = {
  title: "مراجعة عروض الخدمات",
};

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

const statusOptions = [
  ["ALL", "الكل"],
  ["PENDING_REVIEW", "بانتظار المراجعة"],
  ["PUBLISHED", "منشور"],
  ["PAUSED", "موقوف"],
  ["REJECTED", "مرفوض"],
] as const;

export default async function AdminListingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const status = one(params.status);
  const page = Math.max(
    1,
    Number.parseInt(one(params.page) || "1", 10) || 1,
  );

  const result = await getAdminMarketplaceListingsAction(page, status);

  return (
    <main className="space-y-7">
      <header className="border-b border-theme pb-5">
        <p className="text-[10px] font-bold text-brand">مراجعة السوق</p>
        <h1 className="mt-1 text-3xl font-bold tracking-[-.045em] sm:text-4xl">
          عروض الخدمات
        </h1>
        <p className="mt-2 max-w-2xl text-xs leading-6 text-muted sm:text-sm">
          راجع العنوان والوصف والسعر والمحتوى قبل النشر، وأوقف أي عرض يحتاج متابعة بدون حذف سجله.
        </p>
      </header>

      <section>
        <nav
          aria-label="تصفية عروض الخدمات"
          className="hide-scrollbar mb-5 flex gap-5 overflow-x-auto border-b border-theme"
        >
          {statusOptions.map(([value, label]) => {
            const active = (status || "ALL") === value;

            return (
              <Link
                key={value}
                href={
                  value === "ALL"
                    ? "/admin/listings"
                    : `/admin/listings?status=${value}`
                }
                className={`shrink-0 border-b-2 px-1 pb-3 text-xs font-bold transition ${
                  active
                    ? "border-[rgb(var(--primary))] text-brand"
                    : "border-transparent text-muted hover:text-[rgb(var(--text-main))]"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        {result.success ? (
          <AdminListingsClient listings={result.listings as never} />
        ) : (
          <div
            role="alert"
            className="border-b border-[rgb(var(--danger)/0.2)] bg-[rgb(var(--danger)/0.05)] px-4 py-5 text-sm text-[rgb(var(--danger))]"
          >
            {result.error}
          </div>
        )}

        <div className="mt-6 flex justify-center gap-2">
          {page > 1 && (
            <Link
              href={
                `/admin/listings?page=${page - 1}` +
                (status ? `&status=${status}` : "")
              }
              className="secondary-button"
            >
              السابق
            </Link>
          )}

          {result.hasMore && (
            <Link
              href={
                `/admin/listings?page=${page + 1}` +
                (status ? `&status=${status}` : "")
              }
              className="secondary-button"
            >
              التالي
            </Link>
          )}
        </div>
      </section>
    </main>
  );
}
