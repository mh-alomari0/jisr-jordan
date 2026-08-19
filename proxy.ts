import { NextResponse, type NextRequest } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  const ip = request.headers.get("x-vercel-forwarded-for")?.split(",")[0]
    || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "unknown-network";
  const { pathname } = request.nextUrl;

  // API burst protection. Auth mutations have tighter identity-aware limits in server actions.
  if (pathname.startsWith("/api/")) {
    const rateCheck = await checkRateLimit(`api_${ip}`, { limit: 30, windowMs: 60 * 1000 });
    if (!rateCheck.success) {
      return new NextResponse("Too Many Requests", { status: 429 });
    }
  }

  // 2. تحديث الجلسة وحماية المسارات الحساسة
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/provider/:path*",
    "/bookings/:path*",
    "/profile/:path*",
    "/booking/:path*",
    "/login",
    "/api/:path*",
  ],
};
