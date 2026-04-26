"use client";

import { useNotifications } from "@/hooks/useNotifications";
import { Bell } from "lucide-react";
import { LegalInlineBlock } from "@/components/Footer";

export default function NotificationSettingsPage() {
  const { permission, fcmToken, lastError, requestAndRegister } = useNotifications();

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
        {lastError && <p className="text-red-600">エラー: {lastError}</p>}
        <button
          type="button"
          onClick={() => void requestAndRegister()}
          className="w-full rounded-lg bg-blue-500 py-2.5 text-sm font-medium text-white hover:bg-blue-600"
        >
          通知を有効化（FCM 登録）
        </button>
        {fcmToken && (
          <p className="break-all text-xs text-gray-500">
            端末上で取得したトークン（抜粋）: {fcmToken.slice(0, 24)}…
          </p>
        )}
      </div>
      <LegalInlineBlock />
    </div>
  );
}
