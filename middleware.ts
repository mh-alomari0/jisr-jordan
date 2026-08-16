import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { checkRateLimit } from "@/lib/rate-limit";

export async function middleware(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
  const pathname = request.nextUrl.pathname;

  // 1. حماية صفحة وبوابة تسجيل الدخول (5 محاولات لكل دقيقة)
  if (pathname.startsWith("/login") && request.method === "POST") {
    const rateCheck = checkRateLimit(`login_${ip}`, { limit: 5, windowMs: 60 * 1000 });
    if (!rateCheck.success) {
      return new NextResponse(
        JSON.stringify({ error: "تم تجاوز عدد محاولات الدخول المسموحة. يرجى الانتظار دقيقة." }),
        { status: 429, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  // 2. حماية واجهات API والـ Server Actions (30 طلب/دقيقة)
  if (pathname.startsWith("/api")) {
    const rateCheck = checkRateLimit(`api_${ip}`, { limit: 30, windowMs: 60 * 1000 });
    if (!rateCheck.success) {
      return new NextResponse(
        JSON.stringify({ error: "عدد الطلبات مرتفع جداً. يرجى التمهل قليلاً." }),
        { status: 429, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};