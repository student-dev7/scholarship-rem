"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { getFirebaseApp } from "@/lib/firebase";

export function FirebaseAnalytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    let active = true;

    void (async () => {
      if (typeof window === "undefined") return;
      if (!process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID) return;

      const app = getFirebaseApp();
      if (!app) return;

      try {
        const { getAnalytics, isSupported, logEvent } = await import(
          "firebase/analytics"
        );
        const supported = await isSupported();
        if (!supported || !active) return;

        const analytics = getAnalytics(app);
        const query = searchParams?.toString();
        const pagePath = query ? `${pathname}?${query}` : pathname;

        logEvent(analytics, "page_view", {
          page_location: window.location.href,
          page_path: pagePath,
          page_title: document.title,
        });
      } catch {
        // Firebase Analytics is optional in unsupported environments.
      }
    })();

    return () => {
      active = false;
    };
  }, [pathname, searchParams]);

  return null;
}
