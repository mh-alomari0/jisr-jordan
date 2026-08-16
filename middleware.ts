import { NextResponse, type NextRequest } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
  const { pathname } = request.nextUrl;

  // 1. تحديد معدل الطلبات (Rate Limiting) لصفحة الدخول والـ APIs
  if (pathname.startsWith("/login")) {
    const rateCheck = await checkRateLimit(`login_${ip}`, { limit: 5, windowMs: 60 * 1000 });
    if (!rateCheck.success) {
      return new NextResponse("Too Many Requests", { status: 429 });
    }
  }

  if (pathname.startsWith("/api/")) {
    const rateCheck = await checkRateLimit(`api_${ip}`, { limit: 30, windowMs: 60 * 1000 });
    if (!rateCheck.success) {
      return new NextResponse("Too Many Requests", { status: 429 });
    }
  }

  // 2. تحديث الجلسة وحماية المسارات الحساسة (Auth Guard)
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/bookings/:path*",
    "/profile/:path*",
    "/booking/:path*",
    "/login",
    "/api/:path*",
  ],
};