import type { Metadata } from "next";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { Cairo } from "next/font/google";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { getPublicAppOrigin } from "@/lib/app-url";
import "./globals.css";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-cairo",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(getPublicAppOrigin()),
  title: "جسر الأردن | خدمات منزلية موثوقة",
  description: "احجز وتابع خدمات الصيانة والتنظيف المنزلية في الأردن بخطوات واضحة ودفع نقدي عند إكمال الخدمة.",
  applicationName: "جسر الأردن",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
  openGraph: {
    type: "website",
    locale: "ar_JO",
    siteName: "جسر الأردن",
    title: "جسر الأردن | خدمات منزلية موثوقة",
    description: "منصة عربية لحجز ومتابعة خدمات الصيانة والتنظيف المنزلية في الأردن.",
    url: "/",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  let userRole: string | null = null;

  if (user) {
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();
    userRole = profile?.role || "CUSTOMER";
  }

  return (
    <html lang="ar" dir="rtl" className={cairo.variable}>
      <body className="min-h-screen bg-gray-50 flex flex-col font-cairo antialiased">
        <Navbar userRole={userRole} isAuthenticated={!!user} />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
