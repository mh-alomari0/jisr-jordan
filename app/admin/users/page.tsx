import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import AdminUsersClient, { UserManagementItem } from "./_components/admin-users-client";

export const metadata = {
  title: "إدارة المستخدمين والصلاحيات | لوحة التحكم",
};

export default async function AdminUsersPage() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  );

  const { data: users } = await supabase
    .from("users")
    .select("id, email, role, created_at")
    .order("created_at", { ascending: false });

  const typedUsers = (users || []) as unknown as UserManagementItem[];

  return (
    <div className="container mx-auto p-6 space-y-6 dir-rtl">
      <div className="border-b pb-4">
        <h1 className="text-2xl font-bold">إدارة المستخدمين والصلاحيات</h1>
        <p className="text-gray-600 text-sm">تعديل رتب المستخدمين وترقيتهم لمزودي خدمة أو مدراء</p>
      </div>

      <AdminUsersClient initialUsers={typedUsers} />
    </div>
  );
}