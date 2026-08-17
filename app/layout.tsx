import type { Metadata } from "next";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import "./globals.css";

export const metadata: Metadata = {
  title: "جسر الأردن | منصة الخدمات والصيانة المركزية",
  description: "حجز وإدارة خدمات الصيانة المنزلية والاحترافية في الأردن",
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
        setAll: () => {},
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
    userRole = profile?.role || user.app_metadata?.role || "USER";
  }

  return (
    <html lang="ar" dir="rtl">
      <body className="min-h-screen bg-gray-50 flex flex-col font-sans antialiased">
        <Navbar userRole={userRole} />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}