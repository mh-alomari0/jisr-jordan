import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const protectedRoutes = ["/admin", "/bookings", "/profile", "/booking"];
  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route));

  // 1. تحويل الزوار غير المسجلين تلقائياً إلى صفحة التسجيل عند محاولة دخول مسار محمي
  if (isProtectedRoute && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(url);
  }

  // 2. فحص صريح ومضمون لرتبة الأدمن/الـ Staff بقراءة جدول public.users المباشر
  // ينبغي عدم الثق بأي حقل داخل user_metadata لأنه قابل للتعديل من العميل client-side
  if (pathname.startsWith("/admin") && user) {
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    // نستخدم دور الجدول المحمي RLS أولاً، أو app_metadata الذي لا يمكن تعديله من العميل
    const userRole = profile?.role || user.app_metadata?.role;
    const allowedRoles = ["ADMIN", "SUPER_ADMIN", "STAFF"];

    if (!userRole || !allowedRoles.includes(userRole)) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}