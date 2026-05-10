"use client";

import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { getFirebaseDb, isFirebaseConfigured } from "@/lib/firebase";
import {
  JASSO_SETTINGS_DEFAULT,
  type JassoSettings,
} from "@/lib/jassoSettingsTypes";

const SETTINGS_COL = "settings";
const SETTINGS_DOC = "app";

function applySnap(
  d: Record<string, unknown> | undefined
): JassoSettings {
  if (!d) return JASSO_SETTINGS_DEFAULT;
  return {
    reportStart: String(d.reportStart ?? ""),
    reportEnd: String(d.reportEnd ?? ""),
    continueStart: String(d.continueStart ?? ""),
    continueEnd: String(d.continueEnd ?? ""),
  };
}

function isBenignFirestoreError(msg: string): boolean {
  if (/missing or insufficient permissions/i.test(msg)) return true;
  // SDK 内部エラー（開発時のリスナー競合等）。既定値で続行し画面には出さない
  if (/internal assertion failed/i.test(msg)) return true;
  return false;
}

/**
 * settings / app: JASSO 共通の在籍・継続願 開始・終了
 * （onSnapshot は Strict Mode 下で Firestore 内部 assert と噛み合うことがあるため getDoc + 再取得に変更）
 */
export function useJassoSettings() {
  const [settings, setSettings] = useState<JassoSettings>(JASSO_SETTINGS_DEFAULT);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setLoading(false);
      setError("Firebase が未設定です。環境変数を確認してください。");
      return;
    }
    const db = getFirebaseDb();
    if (!db) {
      setLoading(false);
      return;
    }
    const ref = doc(db, SETTINGS_COL, SETTINGS_DOC);
    let cancelled = false;

    async function fetchSettings(showSpinner: boolean) {
      if (showSpinner) setLoading(true);
      try {
        const snap = await getDoc(ref);
        if (cancelled) return;
        setError(null);
        if (!snap.exists()) {
          setSettings(JASSO_SETTINGS_DEFAULT);
        } else {
          setSettings(applySnap(snap.data() as Record<string, unknown>));
        }
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : String(e);
        if (isBenignFirestoreError(msg)) {
          setError(null);
          setSettings(JASSO_SETTINGS_DEFAULT);
        } else {
          setError(msg);
        }
      } finally {
        if (!cancelled && showSpinner) setLoading(false);
      }
    }

    void fetchSettings(true);

    const onVisible = () => {
      if (document.visibilityState === "visible") void fetchSettings(false);
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return { settings, loading, error };
}
