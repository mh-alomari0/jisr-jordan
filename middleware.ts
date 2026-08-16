import { NextResponse, type NextRequest } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";

export async function middleware(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") || "127.0.0.1";

  if (request.nextUrl.pathname.startsWith("/login")) {
    const rateCheck = await checkRateLimit(`login_${ip}`, { limit: 5, windowMs: 60 * 1000 });
    if (!rateCheck.success) {
      return new NextResponse("Too Many Requests", { status: 429 });
    }
  }

  if (request.nextUrl.pathname.startsWith("/api/")) {
    const rateCheck = await checkRateLimit(`api_${ip}`, { limit: 30, windowMs: 60 * 1000 });
    if (!rateCheck.success) {
      return new NextResponse("Too Many Requests", { status: 429 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/api/:path*"],
};