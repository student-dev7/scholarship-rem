"use client";

import { doc, onSnapshot, type Unsubscribe } from "firebase/firestore";
import { useEffect, useState } from "react";
import { getFirebaseDb, isFirebaseConfigured } from "@/lib/firebase";
import {
  JASSO_SETTINGS_DEFAULT,
  type JassoSettings,
} from "@/lib/jassoSettingsTypes";

const SETTINGS_COL = "settings";
const SETTINGS_DOC = "app";

/**
 * settings / app: JASSO 共通の在籍・継続願 開始・終了
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
    const unsub: Unsubscribe = onSnapshot(
      ref,
      (snap) => {
        setError(null);
        if (!snap.exists()) {
          setSettings(JASSO_SETTINGS_DEFAULT);
        } else {
          const d = snap.data() as Record<string, unknown>;
          setSettings({
            reportStart: String(d.reportStart ?? ""),
            reportEnd: String(d.reportEnd ?? ""),
            continueStart: String(d.continueStart ?? ""),
            continueEnd: String(d.continueEnd ?? ""),
          });
        }
        setLoading(false);
      },
      (e) => {
        setError(e.message);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  return { settings, loading, error };
}
