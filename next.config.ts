import type { NextConfig } from "next";
import withPWA from "@ducanh2912/next-pwa";

const withPwa = withPWA({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development",
  workboxOptions: {
    disableDevLogs: true,
    // PWA の sw.js に FCM ハンドラを同梱（バックグラウンド通知用）
    importScripts: ["/firebase-messaging-sw.js"],
  },
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
};

export default withPwa(nextConfig);
