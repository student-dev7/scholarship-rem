"use client";

import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { getToken, onMessage, type MessagePayload } from "firebase/messaging";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  getFirebaseDb,
  getFirebaseMessaging,
  isFirebaseConfigured,
} from "@/lib/firebase";
import { getOrCreateDeviceId } from "./useLocalData";

const USERS = "users";

type NotificationState = {
  permission: NotificationPermission | "unsupported";
  fcmToken: string | null;
  lastError: string | null;
};

/**
 * FCM トークン取得と Firestore users への保存（奨学生番号等の個人データは入れない）。
 * VAPID: NEXT_PUBLIC_FIREBASE_VAPID_KEY
 */
export function useNotifications() {
  const [state, setState] = useState<NotificationState>({
    permission: "unsupported",
    fcmToken: null,
    lastError: null,
  });
  const onForegroundRef = useRef<(p: MessagePayload) => void>(() => {});

  const persistToken = useCallback(
    async (token: string) => {
      const db = getFirebaseDb();
      if (!db) return;
      const deviceId = getOrCreateDeviceId();
      const userRef = doc(db, USERS, deviceId);
      const existing = await getDoc(userRef);
      const body = {
        fcmToken: token,
        updatedAt: serverTimestamp(),
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
      };
      if (existing.exists()) {
        await updateDoc(userRef, body);
      } else {
        await setDoc(userRef, { ...body, deviceId, createdAt: serverTimestamp() });
      }
    },
    []
  );

  const requestAndRegister = useCallback(async () => {
    if (!isFirebaseConfigured()) {
      setState((s) => ({ ...s, lastError: "Firebase 未設定" }));
      return;
    }
    if (typeof window === "undefined" || !("Notification" in window)) {
      setState((s) => ({ ...s, permission: "unsupported" }));
      return;
    }
    setState((s) => ({ ...s, lastError: null }));
    const perm = await Notification.requestPermission();
    setState((s) => ({ ...s, permission: perm === "granted" ? "granted" : perm }));

    if (perm !== "granted") {
      return;
    }

    const vapid = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
    if (!vapid) {
      setState((s) => ({
        ...s,
        lastError: "NEXT_PUBLIC_FIREBASE_VAPID_KEY が未設定です",
      }));
      return;
    }

    const messaging = await getFirebaseMessaging();
    if (!messaging) {
      setState((s) => ({ ...s, lastError: "FCM 非対応 (ブラウザ) か設定不足" }));
      return;
    }
    try {
      let reg = await navigator.serviceWorker.getRegistration();
      if (!reg) {
        try {
          reg = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
        } catch {
          // 既存 (例: PWA) の other SW
        }
      }
      if (reg) {
        try {
          await reg.update();
        } catch {
          // no-op
        }
      }
      const token = await getToken(messaging, {
        vapidKey: vapid,
        serviceWorkerRegistration: reg,
      });
      if (token) {
        await persistToken(token);
        setState((s) => ({ ...s, fcmToken: token, lastError: null }));
      }
    } catch (e) {
      const err = e instanceof Error ? e.message : String(e);
      setState((s) => ({ ...s, lastError: err }));
    }
  }, [persistToken]);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    setState((s) => ({ ...s, permission: Notification.permission as NotificationPermission }));
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured()) return;
    let alive = true;
    let off: (() => void) | null = null;
    void (async () => {
      const messaging = await getFirebaseMessaging();
      if (!messaging || !alive) return;
      off = onMessage(messaging, (payload) => {
        onForegroundRef.current(payload);
        if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
          const t = payload.notification?.title ?? "奨学金リマインダー";
          const b = payload.notification?.body ?? "";
          if (b) {
            // eslint-disable-next-line no-new
            new Notification(t, { body: b, icon: "/icons/icon-192x192.png" });
          }
        }
      });
    })();
    return () => {
      alive = false;
      off?.();
    };
  }, []);

  const setOnForeground = useCallback((cb: (p: MessagePayload) => void) => {
    onForegroundRef.current = cb;
  }, []);

  return { ...state, requestAndRegister, setOnForeground };
}
