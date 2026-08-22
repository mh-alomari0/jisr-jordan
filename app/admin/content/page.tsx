import Link from "next/link";
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
  const page = Math.max(1, Number(one(params.page) || 1));

  const [result, reports] = await Promise.all([
    getAdminProviderContentAction(page, status),
    getAdminContentReportsAction(1, "OPEN"),
  ]);

  return (
    <main className="space-y-8">
      <header className="border-b border-theme pb-5">
        <p className="text-[10px] font-bold text-brand">
          الثقة والمراجعة
        </p>
        <h1 className="mt-1 text-2xl font-bold sm:text-3xl">
          مراجعة المحتوى
        </h1>
        <p className="mt-2 max-w-2xl text-xs leading-6 text-muted sm:text-sm">
          راجع البلاغات والأعمال المنشورة بدون ما تتوسع صلاحيات الإدارة للمحادثات الخاصة أو بيانات ما إلها علاقة بالمراجعة.
        </p>
      </header>

      {reports.success && (
        <section className="border-b border-theme pb-7">
          <div className="mb-4">
            <p className="text-[10px] font-bold text-[rgb(var(--danger))]">
              تحتاج انتباه
            </p>
            <h2 className="mt-1 text-lg font-bold">
              البلاغات المفتوحة
            </h2>
          </div>

          <AdminContentClient
            posts={[]}
            reports={reports.reports as never}
            reportsOnly
          />
        </section>
      )}

      <section>
        <div className="mb-4">
          <p className="text-[10px] font-bold text-brand">
            المحتوى المهني
          </p>
          <h2 className="mt-1 text-xl font-bold">
            المنشورات والأعمال
          </h2>
        </div>

        <nav
          aria-label="تصفية المحتوى"
          className="hide-scrollbar mb-5 flex gap-5 overflow-x-auto border-b border-theme"
        >
          {states.map(([value, label]) => {
            const active = (status || "ALL") === value;

            return (
              <Link
                key={value}
                href={
                  value === "ALL"
                    ? "/admin/content"
                    : `/admin/content?status=${value}`
                }
                className={
                  active
                    ? "shrink-0 border-b-2 border-[rgb(var(--primary))] px-1 pb-2 text-[10px] font-bold text-brand"
                    : "shrink-0 border-b-2 border-transparent px-1 pb-2 text-[10px] font-bold text-muted transition hover:text-[rgb(var(--text-main))]"
                }
              >
                {label}
              </Link>
            );
          })}
        </nav>

        {result.success ? (
          <AdminContentClient posts={result.posts as never} />
        ) : (
          <div
            role="alert"
            className="border-b border-theme py-8 text-sm text-[rgb(var(--danger))]"
          >
            {result.error}
          </div>
        )}
      </section>
    </main>
  );
}
