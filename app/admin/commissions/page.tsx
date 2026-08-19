import { getMarketplaceCategoriesAction } from "@/lib/actions/marketplace-discovery";
import { getAdminCommissionsAction } from "@/lib/actions/marketplace-admin";
import AdminCommissionsClient from "./_components/admin-commissions-client";

export const metadata = { title: "العمولات" };
export default async function AdminCommissionsPage() {
  const [result, categories] = await Promise.all([getAdminCommissionsAction(), getMarketplaceCategoriesAction()]);
  return <div className="mx-auto max-w-6xl p-3 sm:p-6"><header className="mb-6"><h1 className="text-2xl font-black">العمولات</h1><p className="mt-1 text-sm text-muted">قواعد قابلة للتدقيق ولقطات مالية لا تتغير بأثر رجعي.</p></header>{result.success ? <AdminCommissionsClient rules={result.rules as never} obligations={result.obligations as never} categories={categories.categories || []} isSuperAdmin={result.role === "SUPER_ADMIN"} /> : <div role="alert" className="surface-card p-8">{result.error}</div>}</div>;
}

