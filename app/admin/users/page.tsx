import { getAdminUsersAction } from "@/lib/actions/admin-users";
import AdminUsersClient from "./_components/admin-users-client";
import { AdminPagination } from "@/components/admin-pagination";

export const metadata = {
  title: "إدارة المستخدمين والصلاحيات | لوحة التحكم",
};

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(
    1,
    Number.parseInt(params.page || "1", 10) || 1,
  );

  const result = await getAdminUsersAction(page);

  if (!result.success) {
    return (
      <div className="border-b border-[rgb(var(--danger)/0.2)] bg-[rgb(var(--danger)/0.05)] px-4 py-5 text-sm text-[rgb(var(--danger))]">
        {result.error || "تعذر تحميل قائمة المستخدمين"}
      </div>
    );
  }

  const users = result.users || [];

  return (
    <main className="space-y-7">
      <header className="border-b border-theme pb-5">
        <p className="text-[10px] font-bold text-brand">الحسابات والصلاحيات</p>
        <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-[-.045em] sm:text-4xl">
              المستخدمون
            </h1>
            <p className="mt-2 max-w-2xl text-xs leading-6 text-muted sm:text-sm">
              راجع الحسابات وعدّل الأدوار عند الحاجة. اعتماد مقدم الخدمة يظل مسارًا منفصلًا عن صلاحية الحساب.
            </p>
          </div>
          <p className="text-xs font-bold text-muted">
            {users.length} حساب في هذه الصفحة
          </p>
        </div>
      </header>

      <section>
        <AdminUsersClient initialUsers={users} />

        <div className="mt-5">
          <AdminPagination
            path="/admin/users"
            page={result.page || page}
            hasMore={Boolean(result.hasMore)}
          />
        </div>
      </section>
    </main>
  );
}
