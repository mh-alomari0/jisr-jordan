import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import AdminServicesClient from "./_components/admin-services-client";

export const metadata = {
  title: "إدارة الخدمات | لوحة التحكم",
};

export default async function AdminServicesPage() {
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

  const { data: services } = await supabase
    .from("services")
    .select("id, title, description, price, category, is_active")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="container mx-auto p-6 space-y-6 dir-rtl">
      <div className="border-b pb-4">
        <h1 className="text-2xl font-bold">إدارة الخدمات والأسعار</h1>
        <p className="text-gray-600 text-sm">إضافة خدمات جديدة، تعديل حالة التفعيل، والتحكم بالأسعار</p>
      </div>

      <AdminServicesClient initialServices={services || []} />
    </div>
  );
}
