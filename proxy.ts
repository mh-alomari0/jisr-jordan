import {
  NextResponse,
  type NextRequest,
} from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  const ip =
    request.headers
      .get("x-vercel-forwarded-for")
      ?.split(",")[0] ||
    request.headers
      .get("x-forwarded-for")
      ?.split(",")[0]
      ?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown-network";

  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/")) {
    const rateCheck = await checkRateLimit(
      `api_${ip}`,
      {
        limit: 30,
        windowMs: 60 * 1000,
      },
    );

    if (!rateCheck.success) {
      return new NextResponse(
        "Too Many Requests",
        { status: 429 },
      );
    }
  }

  // Supabase session refresh happens here, before Server Components render.
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Run the proxy for application requests so Supabase can refresh
     * auth cookies before Server Components render.
     *
     * Exclude Next.js static/image assets and common public static files.
     */
    "/((?!_next/static|_next/image|favicon.ico|icon-192.png|icon-512.png|manifest.json|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|woff|woff2|ttf)$).*)",
  ],
};
