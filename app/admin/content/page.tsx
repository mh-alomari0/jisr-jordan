import Link from "next/link";
import {
  Eye,
  Flag,
  Images,
  ShieldAlert,
} from "lucide-react";
import {
  getAdminContentReportsAction,
  getAdminProviderContentAction,
} from "@/lib/actions/marketplace-admin";
import AdminContentClient from "./_components/admin-content-client";

export const metadata = {
  title: "مراجعة محتوى المزودين",
};

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

const states = [
  ["ALL", "الكل"],
  ["PENDING_REVIEW", "بانتظار المراجعة"],
  ["PUBLISHED", "منشور"],
  ["DEACTIVATED", "موقوف"],
  ["REJECTED", "مرفوض"],
] as const;

export default async function AdminContentPage({
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
    Number(one(params.page) || 1),
  );

  const [result, reports] = await Promise.all([
    getAdminProviderContentAction(page, status),
    getAdminContentReportsAction(1, "OPEN"),
  ]);

  return (
    <main className="space-y-7">
      <section className="relative overflow-hidden rounded-[2rem] bg-[#102d2c] p-6 text-white sm:p-8">
        <div className="absolute -left-16 -top-20 h-52 w-52 rounded-full border-[22px] border-white/10" />
        <div className="relative">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
            <ShieldAlert size={20} />
          </span>

          <p className="mt-6 text-[10px] font-bold text-[#a9dcd6]">
            الثقة والمراجعة
          </p>

          <h1 className="mt-1 text-3xl font-bold tracking-[-.05em] sm:text-5xl">
            راقب المحتوى،
            <span className="text-[#ffc985]"> بدون كسر الخصوصية.</span>
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-7 text-white/70">
            البلاغات والمحتوى المهني يخضعان للمراجعة، لكن البلاغ لا يمنح
            الإدارة وصولاً تلقائياً لنص المحادثات الخاصة.
          </p>
        </div>
      </section>

      {reports.success && (
        <section>
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[rgb(var(--danger)/0.1)] text-[rgb(var(--danger))]">
              <Flag size={17} />
            </span>
            <div>
              <p className="text-[9px] font-bold text-[rgb(var(--danger))]">
                تحتاج انتباه
              </p>
              <h2 className="text-lg font-bold">
                البلاغات المفتوحة
              </h2>
            </div>
          </div>

          <div className="rounded-[1.8rem] border border-theme bg-surface p-3 shadow-soft sm:p-5">
            <AdminContentClient
              posts={[]}
              reports={reports.reports as never}
              reportsOnly
            />
          </div>
        </section>
      )}

      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold text-brand">
              المحتوى المهني
            </p>
            <h2 className="mt-1 text-2xl font-bold">
              المنشورات والأعمال
            </h2>
          </div>

          <div className="flex gap-2 text-[9px] text-muted">
            <span className="inline-flex items-center gap-1 rounded-full bg-surface px-3 py-2 shadow-soft">
              <Images size={12} className="text-brand" />
              صور وأعمال
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-surface px-3 py-2 shadow-soft">
              <Eye size={12} className="text-[rgb(var(--success))]" />
              مراجعة بشرية
            </span>
          </div>
        </div>

        <nav className="hide-scrollbar mb-5 flex gap-2 overflow-x-auto pb-1">
          {states.map(([value, label]) => (
            <Link
              key={value}
              href={
                value === "ALL"
                  ? "/admin/content"
                  : `/admin/content?status=${value}`
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
            <AdminContentClient
              posts={result.posts as never}
            />
          </div>
        ) : (
          <div
            role="alert"
            className="rounded-[1.8rem] border border-theme bg-surface p-8 text-sm text-[rgb(var(--danger))]"
          >
            {result.error}
          </div>
        )}
      </section>
    </main>
  );
}
