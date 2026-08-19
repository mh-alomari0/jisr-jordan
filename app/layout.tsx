import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import MobileBottomNav from "@/components/mobile-bottom-nav";
import PwaRegistration from "@/components/pwa-registration";
import { getPublicAppOrigin } from "@/lib/app-url";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import "./globals.css";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-cairo",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(getPublicAppOrigin()),
  title: {
    default: "جسر الأردن | سوق الخدمات والمهارات",
    template: "%s | جسر الأردن",
  },
  description:
    "اكتشف مقدمي خدمات معتمدين في الأردن، قارن عروض الخدمات، احجز مباشرة أو اطلب عرض سعر بأمان.",
  applicationName: "جسر الأردن",
  manifest: "/manifest.json",
  icons: {
    icon: [
      {
        url: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        url: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
    apple: [
      {
        url: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
    ],
  },
  openGraph: {
    type: "website",
    locale: "ar_JO",
    siteName: "جسر الأردن",
    title: "جسر الأردن | سوق الخدمات والمهارات",
    description:
      "منصة عربية لاكتشاف وحجز الخدمات المحلية والرقمية وطلب عروض الأسعار في الأردن.",
    url: "/",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let userRole: string | null = null;

  if (user) {
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    userRole = profile?.role || "CUSTOMER";
  }

  return (
    <html
      lang="ar"
      dir="rtl"
      data-scroll-behavior="smooth"
      className={cairo.variable}
      suppressHydrationWarning
    >
      <body className="flex min-h-screen flex-col font-cairo antialiased">
        <PwaRegistration />

        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var m=localStorage.getItem('jisr-theme')||'system';var d=m==='dark'||(m==='system'&&matchMedia('(prefers-color-scheme: dark)').matches)?'dark':'light';document.documentElement.dataset.theme=d;document.documentElement.style.colorScheme=d}catch(e){document.documentElement.dataset.theme='light'}})()",
          }}
        />

        <a
          href="#main-content"
          className="fixed start-3 top-2 z-[100] -translate-y-20 rounded-lg bg-[rgb(var(--primary))] px-4 py-2 text-sm font-bold text-white transition focus:translate-y-0"
        >
          انتقل إلى المحتوى
        </a>

        <Navbar
          userRole={userRole}
          isAuthenticated={Boolean(user)}
        />

        <main id="main-content" className="flex-1">
          {children}
        </main>

        <Footer />

        <MobileBottomNav userRole={userRole} />
      </body>
    </html>
  );
}
