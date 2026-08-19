import {
  Boxes,
  Database,
  SlidersHorizontal,
} from "lucide-react";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import AdminServicesClient from "./_components/admin-services-client";
import { AdminPagination } from "@/components/admin-pagination";

export const metadata = {
  title: "إدارة الخدمات | لوحة التحكم",
};

export default async function AdminServicesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(
    1,
    Number.parseInt(params.page || "1", 10) || 1,
  );

  const pageSize = 25;
  const from = (page - 1) * pageSize;
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    },
  );

  const { data: services } = await supabase
    .from("services")
    .select(
      "id, title, description, price, category, is_active",
    )
    .order("created_at", { ascending: false })
    .range(from, from + pageSize);

  const hasMore =
    (services || []).length > pageSize;

  const visible = (services || []).slice(
    0,
    pageSize,
  );

  return (
    <main className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] bg-[#f8e0d6] p-6 text-[#743b35] sm:p-8">
        <div className="absolute -left-16 -top-20 h-52 w-52 rounded-full border-[22px] border-white/35" />

        <div className="relative">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/45">
            <Boxes size={20} />
          </span>

          <p className="mt-6 text-[10px] font-bold opacity-70">
            دليل الخدمات
          </p>

          <h1 className="mt-1 text-3xl font-bold tracking-[-.05em] sm:text-5xl">
            الخدمة الأساسية
            <span className="text-[#0b817a]"> مصدرها واحد.</span>
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-7 opacity-75">
            إدارة تعريفات الخدمات الأساسية وحالة التفعيل والبيانات القديمة
            التي يعتمد عليها الكتالوج وعلاقات مقدم الخدمة.
          </p>
        </div>
      </section>

      <section>
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold text-brand">
              الكتالوج المركزي
            </p>

            <h2 className="mt-1 text-2xl font-bold">
              الخدمات الأساسية
            </h2>

            <p className="mt-1 text-xs text-muted">
              {visible.length} خدمة في هذه الصفحة
            </p>
          </div>

          <div className="flex gap-2 text-[9px] text-muted">
            <span className="inline-flex items-center gap-1 rounded-full bg-surface px-3 py-2 shadow-soft">
              <Database size={12} className="text-brand" />
              من قاعدة البيانات
            </span>

            <span className="inline-flex items-center gap-1 rounded-full bg-surface px-3 py-2 shadow-soft">
              <SlidersHorizontal size={12} className="text-[rgb(var(--warning))]" />
              تفعيل وأسعار قديمة
            </span>
          </div>
        </div>

        <div className="rounded-[1.8rem] border border-theme bg-surface p-3 shadow-soft sm:p-5">
          <AdminServicesClient
            initialServices={visible}
          />
        </div>

        <div className="mt-5">
          <AdminPagination
            path="/admin/services"
            page={page}
            hasMore={hasMore}
          />
        </div>
      </section>
    </main>
  );
}
