"use client";

import { useCallback, useState } from "react";
import { useNotifications } from "@/hooks/useNotifications";
import { Bell, Copy, Check } from "lucide-react";
import { LegalInlineBlock } from "@/components/Footer";

export default function NotificationSettingsPage() {
  const { permission, fcmToken, lastError, requestAndRegister } = useNotifications();
  const [copyOk, setCopyOk] = useState(false);
  const [localMsg, setLocalMsg] = useState<string | null>(null);

  const vapidConfigured = Boolean(
    process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY &&
      process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY.length > 0
  );

  const copyToken = useCallback(async () => {
    setLocalMsg(null);
    if (!fcmToken) {
      setLocalMsg("先に FCM 登録してください。");
      return;
    }
    try {
      await navigator.clipboard.writeText(fcmToken);
      setCopyOk(true);
      window.setTimeout(() => setCopyOk(false), 2000);
    } catch {
      setLocalMsg("コピーできませんでした（HTTPS または localhost で試してください）。");
    }
  }, [fcmToken]);

  const testLocalWindow = useCallback(() => {
    setLocalMsg(null);
    if (typeof window === "undefined" || !("Notification" in window)) {
      setLocalMsg("この環境では通知 API が使えません。");
      return;
    }
    if (Notification.permission !== "granted") {
      setLocalMsg("先に通知を許可してから試してください（上の「通知を有効化」）。");
      return;
    }
    new Notification("ローカルテスト（ウィンドウ）", {
      body: "Firebase を経由しません。この端末の通知許可だけを確認できます。",
      icon: "/icons/icon-192x192.png",
    });
    setLocalMsg("表示されましたか？ アプリ前面のときのみ表示される環境があります。");
  }, []);

  const testServiceWorkerNotify = useCallback(async () => {
    setLocalMsg(null);
    if (typeof window === "undefined" || !("Notification" in window)) {
      setLocalMsg("非対応です。");
      return;
    }
    if (Notification.permission !== "granted") {
      setLocalMsg("先に通知を許可してください。");
      return;
    }
    try {
      const reg =
        (await navigator.serviceWorker?.getRegistration()) ||
        (await navigator.serviceWorker?.register?.("/firebase-messaging-sw.js"));
      if (!reg) {
        setLocalMsg("Service Worker を取得できませんでした。");
        return;
      }
      await reg.showNotification("ローカルテスト（SW）", {
        body: "サービスワーカーからのテストです。バックグラウンド表示の近い動きを確認できます。",
        icon: "/icons/icon-192x192.png",
      });
      setLocalMsg("バナーが出れば SW 経路は概ね有効です。");
    } catch (e) {
      setLocalMsg(e instanceof Error ? e.message : "Service Worker テストに失敗しました。");
    }
  }, []);

  const secure =
    typeof window !== "undefined" && typeof window.isSecureContext === "boolean"
      ? window.isSecureContext
      : null;

  return (
    <div className="mx-auto w-full max-w-md space-y-4">
      <h1 className="flex items-center gap-2 text-lg font-semibold text-gray-800">
        <Bell className="h-5 w-5 text-blue-500" />
        通知設定
      </h1>
      <p className="text-sm text-gray-600">
        ブラウザの通知を許可し、FCM トークンを本アプリ専用の識別子（端末内で生成）と紐づけて保存します。奨学生番号等の秘匿データは
        送信しません（Vault は LocalStorage のみ）。
      </p>
      <div className="space-y-3 rounded-lg border border-gray-100 bg-white p-4 shadow-sm text-sm text-gray-800">
        <p>通知の許可状態: {permission === "granted" ? "許可" : permission === "default" ? "未選択" : "拒否/非対応"}</p>
        <p className="text-xs text-gray-500">
          ビルド時 VAPID 設定: {vapidConfigured ? "あり" : "なし（NEXT_PUBLIC_FIREBASE_VAPID_KEY）"}
          {secure !== null ? ` / 安全なコンテキスト: ${secure ? "はい" : "いいえ"}` : ""}
        </p>
        {lastError && <p className="text-red-600">エラー: {lastError}</p>}
        <button
          type="button"
          onClick={() => void requestAndRegister()}
          className="w-full rounded-lg bg-blue-500 py-2.5 text-sm font-medium text-white hover:bg-blue-600"
        >
          通知を有効化（FCM 登録）
        </button>
        {fcmToken && (
          <div className="space-y-2">
            <p className="break-all text-xs text-gray-500">
              端末上で取得したトークン（抜粋）: {fcmToken.slice(0, 24)}…
            </p>
            <button
              type="button"
              onClick={() => void copyToken()}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              {copyOk ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              FCM トークンをコピー（管理画面の単体テスト用）
            </button>
          </div>
        )}
      </div>

      <div className="space-y-3 rounded-lg border border-amber-100 bg-amber-50/60 p-4 text-sm text-gray-800">
        <h2 className="text-sm font-medium text-amber-900">デバッグ（スマホで届くか確認）</h2>
        <ol className="list-decimal space-y-1 pl-4 text-xs text-gray-700">
          <li>まず「ローカル通知テスト」で OS のバナーが出るか確認（FCM 不要）。</li>
          <li>FCM 経路は「通知を有効化」後、トークンをコピーして管理画面の「1 台だけテスト」に貼る。</li>
          <li>ホーム画面に追加した PWA でも、HTTPS 必須・iOS の Web Push は制限が強いです。</li>
        </ol>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => void testLocalWindow()}
            className="w-full rounded-lg bg-amber-600 py-2.5 text-sm font-medium text-white hover:bg-amber-700"
          >
            ローカル通知テスト（ウィンドウ）
          </button>
          <button
            type="button"
            onClick={() => void testServiceWorkerNotify()}
            className="w-full rounded-lg border border-amber-300 bg-white py-2.5 text-sm font-medium text-amber-900 hover:bg-amber-50"
          >
            ローカル通知テスト（サービスワーカー）
          </button>
        </div>
        {localMsg && <p className="text-xs text-gray-600">{localMsg}</p>}
      </div>

      <LegalInlineBlock />
    </div>
  );
}
