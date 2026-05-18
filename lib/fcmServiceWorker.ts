/**
 * FCM 用 Service Worker を解決する。
 * 本番 PWA (sw.js) と firebase-messaging-sw の競合を避け、
 * Workbox SW に importScripts 済みの場合も同じ registration を使う。
 */
export async function getFcmServiceWorkerRegistration(): Promise<
  ServiceWorkerRegistration | undefined
> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return undefined;
  }

  const scriptHasFcm = (reg: ServiceWorkerRegistration) => {
    const url =
      reg.active?.scriptURL ??
      reg.installing?.scriptURL ??
      reg.waiting?.scriptURL ??
      "";
    return url.includes("firebase-messaging-sw") || url.includes("/sw.js");
  };

  const existing = await navigator.serviceWorker.getRegistrations();
  const fcmReady = existing.find(scriptHasFcm);
  if (fcmReady) {
    await waitForActiveWorker(fcmReady);
    return fcmReady;
  }

  try {
    const reg = await navigator.serviceWorker.register("/firebase-messaging-sw.js", {
      scope: "/",
    });
    await waitForActiveWorker(reg);
    return reg;
  } catch {
    const fallback = existing[0];
    if (fallback) {
      await waitForActiveWorker(fallback);
      return fallback;
    }
    return undefined;
  }
}

async function waitForActiveWorker(reg: ServiceWorkerRegistration): Promise<void> {
  if (reg.active) return;
  await new Promise<void>((resolve) => {
    const sw = reg.installing ?? reg.waiting;
    if (!sw) {
      resolve();
      return;
    }
    const onState = () => {
      if (sw.state === "activated") {
        sw.removeEventListener("statechange", onState);
        resolve();
      }
    };
    sw.addEventListener("statechange", onState);
    onState();
  });
  await navigator.serviceWorker.ready;
}

export function isStandalonePwa(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}
