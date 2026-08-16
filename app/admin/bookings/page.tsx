import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import AdminBookingsClient, { AdminBookingItem } from "./_components/admin-bookings-client";

export const metadata = {
  title: "إدارة الحجوزات | لوحة التحكم",
};

export default async function AdminBookingsPage() {
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

  const { data: bookings } = await supabase
    .from("bookings")
    .select("*, services(title, price)")
    .order("created_at", { ascending: false });

  const typedBookings = (bookings || []) as unknown as AdminBookingItem[];

  return (
    <div className="container mx-auto p-6 space-y-6 dir-rtl">
      <div className="border-b pb-4">
        <h1 className="text-2xl font-bold">إدارة وتتبع الحجوزات الشاملة</h1>
        <p className="text-gray-600 text-sm">استعراض كافة الحجوزات، الفلترة حسب الحالة، وإمكانية إلغاء الطلبات المعلقة</p>
      </div>

      <AdminBookingsClient initialBookings={typedBookings} />
    </div>
  );
}