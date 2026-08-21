import {
  Banknote,
  History,
  ShieldCheck,
} from "lucide-react";
import { getMarketplaceCategoriesAction } from "@/lib/actions/marketplace-discovery";
import { getAdminCommissionsAction } from "@/lib/actions/marketplace-admin";
import AdminCommissionsClient from "./_components/admin-commissions-client";

export const metadata = { title: "العمولات" };

export default async function AdminCommissionsPage() {
  const [result, categories] = await Promise.all([
    getAdminCommissionsAction(),
    getMarketplaceCategoriesAction({ normalizeDrift: false }),
  ]);

  return (
    <main className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] bg-[#f8e0d6] p-6 text-[#743b35] sm:p-8">
        <div className="absolute -left-16 -top-20 h-52 w-52 rounded-full border-[22px] border-white/35" />
        <div className="relative">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/45">
            <Banknote size={20} />
          </span>
          <p className="mt-6 text-[10px] font-bold opacity-70">
            اقتصاد المنصة
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-[-.05em] sm:text-5xl">
            العمولة تنحسب
            <span className="text-[#0b817a]"> مرة، وتنحفظ.</span>
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 opacity-75">
            أدِر قواعد العمولة والتزاماتها مع الحفاظ على اللقطات المالية
            القديمة حتى لا تتغير المعاملات السابقة بأثر رجعي.
          </p>
        </div>
      </section>

      <section>
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold text-brand">
              القواعد والالتزامات
            </p>
            <h2 className="mt-1 text-2xl font-bold">
              إدارة العمولات
            </h2>
          </div>

          <div className="flex gap-2 text-[9px] text-muted">
            <span className="inline-flex items-center gap-1 rounded-full bg-surface px-3 py-2 shadow-soft">
              <History size={12} className="text-brand" />
              بدون أثر رجعي
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-surface px-3 py-2 shadow-soft">
              <ShieldCheck size={12} className="text-[rgb(var(--success))]" />
              {result.success && result.role === "SUPER_ADMIN"
                ? "صلاحية Super Admin"
                : "صلاحية مراجعة"}
            </span>
          </div>
        </div>

        {result.success ? (
          <div className="rounded-[1.8rem] border border-theme bg-surface p-3 shadow-soft sm:p-5">
            <AdminCommissionsClient
              rules={result.rules as never}
              obligations={result.obligations as never}
              categories={categories.categories || []}
              isSuperAdmin={result.role === "SUPER_ADMIN"}
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
