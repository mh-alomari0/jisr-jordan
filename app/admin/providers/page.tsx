import {
  ShieldCheck,
  UserCheck,
  UsersRound,
} from "lucide-react";
import { getAdminProvidersAction } from "@/lib/actions/admin-providers";
import AdminProvidersClient from "./_components/admin-providers-client";
import { AdminPagination } from "@/components/admin-pagination";

export const metadata = {
  title: "إدارة مقدمي الخدمة | جسر الأردن",
};

export default async function AdminProvidersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(
    1,
    Number.parseInt(params.page || "1", 10) || 1,
  );

  const result = await getAdminProvidersAction(page);

  if (!result.success) {
    return (
      <div className="rounded-[1.8rem] border border-theme bg-surface p-8 text-center text-sm text-[rgb(var(--danger))]">
        {result.error || "تعذر تحميل قائمة مقدمي الخدمة"}
      </div>
    );
  }

  const providers = result.providers || [];

  return (
    <main className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] bg-[#0b817a] p-6 text-white sm:p-8">
        <div className="absolute -left-16 -top-20 h-52 w-52 rounded-full border-[22px] border-white/10" />
        <div className="relative">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
            <UsersRound size={20} />
          </span>

          <p className="mt-6 text-[10px] font-bold text-[#c9eee8]">
            الثقة أولاً
          </p>

          <h1 className="mt-1 text-3xl font-bold tracking-[-.05em] sm:text-5xl">
            راجع مقدمي الخدمة
            <span className="text-[#ffc985]"> قبل ما يمثلوا جسر.</span>
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-7 text-[#d9f2ee]">
            راجع طلبات الانضمام، بيانات الحساب، المستندات وحالة الاعتماد
            قبل السماح لمقدم الخدمة بالنشر واستقبال العملاء.
          </p>
        </div>
      </section>

      <section>
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold text-brand">
              المراجعة والاعتماد
            </p>
            <h2 className="mt-1 text-2xl font-bold">
              مقدمو الخدمة
            </h2>
            <p className="mt-1 text-xs text-muted">
              {providers.length} حساب في هذه الصفحة
            </p>
          </div>

          <div className="flex flex-wrap gap-2 text-[9px] text-muted">
            <span className="inline-flex items-center gap-1 rounded-full bg-surface px-3 py-2 shadow-soft">
              <ShieldCheck size={13} className="text-brand" />
              تحقق قبل الاعتماد
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-surface px-3 py-2 shadow-soft">
              <UserCheck size={13} className="text-[rgb(var(--success))]" />
              قرار إداري موثق
            </span>
          </div>
        </div>

        <div className="rounded-[1.8rem] border border-theme bg-surface p-3 shadow-soft sm:p-5">
          <AdminProvidersClient providers={providers} />
        </div>

        <div className="mt-5">
          <AdminPagination
            path="/admin/providers"
            page={result.page || page}
            hasMore={Boolean(result.hasMore)}
          />
        </div>
      </section>
    </main>
  );
}
