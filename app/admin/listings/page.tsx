import Link from "next/link";
import {
  ClipboardCheck,
  Eye,
  PauseCircle,
  ShieldAlert,
  Store,
} from "lucide-react";
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
  searchParams: Promise<
    Record<string, string | string[] | undefined>
  >;
}) {
  const params = await searchParams;
  const status = one(params.status);
  const page = Math.max(
    1,
    Number.parseInt(one(params.page) || "1", 10) || 1,
  );

  const result = await getAdminMarketplaceListingsAction(
    page,
    status,
  );

  return (
    <main className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] bg-[#102d2c] p-6 text-white sm:p-8">
        <div className="absolute -left-16 -top-20 h-52 w-52 rounded-full border-[22px] border-white/10" />
        <div className="relative">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
            <ClipboardCheck size={20} />
          </span>

          <p className="mt-6 text-[10px] font-bold text-[#a9dcd6]">
            مراجعة المحتوى التجاري
          </p>

          <h1 className="mt-1 text-3xl font-bold tracking-[-.05em] sm:text-5xl">
            كل عرض ينشر،
            <span className="text-[#ffc985]"> لازم يستحق الظهور.</span>
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-7 text-white/70">
            راجع عناوين الخدمات، الأوصاف، الأسعار والمحتوى الحساس،
            وأوقف العرض عند الحاجة بدون حذف السجل التشغيلي.
          </p>
        </div>
      </section>

      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold text-brand">
              عروض السوق
            </p>
            <h2 className="mt-1 text-2xl font-bold">
              قائمة المراجعة
            </h2>
          </div>

          <div className="flex gap-2 text-[9px] text-muted">
            <span className="inline-flex items-center gap-1 rounded-full bg-surface px-3 py-2 shadow-soft">
              <Eye size={12} className="text-brand" />
              مراجعة قبل الظهور
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-surface px-3 py-2 shadow-soft">
              <ShieldAlert size={12} className="text-[rgb(var(--warning))]" />
              محتوى حساس
            </span>
          </div>
        </div>

        <nav
          aria-label="تصفية عروض الخدمات"
          className="hide-scrollbar mb-5 flex gap-2 overflow-x-auto pb-1"
        >
          {statusOptions.map(([value, label]) => (
            <Link
              key={value}
              href={
                value === "ALL"
                  ? "/admin/listings"
                  : `/admin/listings?status=${value}`
              }
              className={
                (status || "ALL") === value
                  ? "brand-button !min-h-9 shrink-0 !rounded-full !px-4 !py-1 text-[10px]"
                  : "secondary-button !min-h-9 shrink-0 !rounded-full !px-4 !py-1 text-[10px]"
              }
            >
              {label}
            </Link>
          ))}
        </nav>

        {result.success ? (
          <div className="rounded-[1.8rem] border border-theme bg-surface p-3 shadow-soft sm:p-5">
            <AdminListingsClient
              listings={result.listings as never}
            />
          </div>
        ) : (
          <div
            role="alert"
            className="rounded-[1.8rem] border border-theme bg-surface p-8 text-center text-sm text-[rgb(var(--danger))]"
          >
            {result.error}
          </div>
        )}

        <div className="mt-5 flex justify-center gap-2">
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
