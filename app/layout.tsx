import type { Metadata, Viewport } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import RegisterSW from "@/components/common/RegisterSW";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-cairo",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#0284c7",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: {
    default: "جسر | JISR - منصة خدمات الصيانة المنزلية في الأردن",
    template: "%s | جسر - JISR Jordan",
  },
  description: "المنصة الأولى لحجز ومتابعة خدمات الصيانة المنزلية والمكتبية الموثوقة في الأردن بضغطة زر.",
  manifest: "/manifest.json",
  metadataBase: new URL("https://jisr-jordan.vercel.app"),
  keywords: ["صيانة منزلية", "سباكة", "كهرباء", "تكييف", "الأردن", "عمان", "خدمات منزلية"],
  authors: [{ name: "Jisr Jordan Engineering Team" }],
  openGraph: {
    title: "جسر | JISR - خدمات الصيانة المنزلية في الأردن",
    description: "احجز أفضل فنيي الصيانة المعتمدين في الأردن بسهولة وأمان.",
    url: "https://jisr-jordan.vercel.app",
    siteName: "جسر الأردن",
    locale: "ar_JO",
    type: "website",
  },
  icons: {
    icon: "/icon-192.png",
    shortcut: "/icon-192.png",
    apple: "/icon-192.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "جسر",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className={cairo.variable}>
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className="font-sans antialiased min-h-screen flex flex-col selection:bg-sky-500 selection:text-white">
        <RegisterSW />
        <Header />
        <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}