import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { Suspense } from "react";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";
import { AppShell } from "@/components/AppShell";
import { FirebaseAnalytics } from "@/components/FirebaseAnalytics";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "奨学金リマインダー",
  description: "JASSO 在籍報告・継続願の期限を思い出す補助アプリ",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "奨学金通知",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <head>
        <meta
          name="google-site-verification"
          content="h7V3_l6etGHSkZPAmd4jHy58A-hSqLQa1QywXSLMOng"
        />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body
        className={`${geistSans.variable} ${geistSans.className} antialiased`}
      >
        <AppShell>{children}</AppShell>
        <Suspense fallback={null}>
          <FirebaseAnalytics />
        </Suspense>
        <Analytics />
      </body>
    </html>
  );
}
