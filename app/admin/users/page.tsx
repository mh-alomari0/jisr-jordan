import { getAdminUsersAction } from "@/lib/actions/admin-users";
import AdminUsersClient from "./_components/admin-users-client";
import { AdminPagination } from "@/components/admin-pagination";

export const metadata = {
  title: "إدارة المستخدمين والصلاحيات | لوحة التحكم",
};

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(params.page || "1", 10) || 1);
  const result = await getAdminUsersAction(page);

  if (!result.success) {
    return (
      <div className="p-8 text-center text-red-600 bg-white border rounded-xl dir-rtl">
        <p>{result.error || "تعذر تحميل قائمة المستخدمين"}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6 dir-rtl">
      <div className="border-b pb-4">
        <h1 className="text-2xl font-bold">إدارة المستخدمين والصلاحيات</h1>
        <p className="text-gray-600 text-sm">استعراض حسابات المسجلين وتعديل رتب الحسابات (عميل / مزود / أدمن)</p>
      </div>

      <AdminUsersClient initialUsers={result.users || []} />
      <AdminPagination path="/admin/users" page={result.page || page} hasMore={Boolean(result.hasMore)} />
    </div>
  );
}
