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
      <header className="border-b border-theme pb-5">
        <p className="text-[10px] font-bold text-brand">
          اقتصاد المنصة
        </p>
        <h1 className="mt-1 text-2xl font-bold sm:text-3xl">
          العمولات
        </h1>
        <p className="mt-2 max-w-2xl text-xs leading-6 text-muted sm:text-sm">
          راجع قواعد العمولة والالتزامات الحالية. اللقطات المالية القديمة تظل محفوظة حتى ما تتغير معاملات سابقة بأثر رجعي.
        </p>
        {result.success && (
          <p className="mt-3 text-[10px] text-muted">
            {result.role === "SUPER_ADMIN"
              ? "عندك صلاحية تعديل قواعد العمولة"
              : "عندك صلاحية مراجعة العمولات"}
          </p>
        )}
      </header>

      {result.success ? (
        <section>
          <AdminCommissionsClient
            rules={result.rules as never}
            obligations={result.obligations as never}
            categories={categories.categories || []}
            isSuperAdmin={result.role === "SUPER_ADMIN"}
          />
        </section>
      ) : (
        <div
          role="alert"
          className="border-b border-theme py-8 text-sm text-[rgb(var(--danger))]"
        >
          {result.error}
        </div>
      )}
    </main>
  );
}
