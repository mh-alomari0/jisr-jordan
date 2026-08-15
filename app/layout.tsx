import type { Metadata } from "next";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import WhatsAppWidget from "@/components/common/WhatsAppWidget";
import "./globals.css";

export const metadata: Metadata = {
  title: "جسر | JISR — المنصة المعتمدة للصيانة المنزلية في الأردن",
  description: "احجز أفضل الفنيين المعتمدين للسباكة، الكهرباء، التكييف والنجارة في الأردن بضغطة زر واحدة.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body className="min-h-screen flex flex-col bg-neutral-surface text-neutral-text font-sans antialiased selection:bg-primary-light selection:text-primary">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        <WhatsAppWidget />
      </body>
    </html>
  );
}