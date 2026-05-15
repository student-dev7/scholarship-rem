"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { useNotifications } from "@/hooks/useNotifications";
import { getOrCreateDeviceId } from "@/hooks/useLocalData";
import { Bell, X } from "lucide-react";
import { LegalInlineBlock } from "@/components/Footer";

function NotificationHowToModal({
  open,
  onClose,
  titleId,
}: {
  open: boolean;
  onClose: () => void;
  titleId: string;
}) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="閉じる"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 flex max-h-[min(90vh,36rem)] w-full max-w-lg flex-col rounded-t-2xl bg-white shadow-xl sm:rounded-2xl"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-4 py-3">
          <h2 id={titleId} className="text-base font-semibold text-gray-900">
            スマホで通知を受け取る手順
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-600 hover:bg-gray-100"
            aria-label="閉じる"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-4 py-3 text-sm leading-relaxed text-gray-800">
          <section className="space-y-2">
            <h3 className="font-medium text-gray-900">iPhone (iOS) の場合</h3>
            <p className="text-gray-700">
              iOS 16.4以降、Web通知を受け取るには「ホーム画面への追加」が必須です。
            </p>
            <ol className="list-decimal space-y-1.5 pl-5 text-gray-700">
              <li>Safariで本サイトを開く（Chrome等では追加できない場合があります）。</li>
              <li>画面下部にある「共有ボタン」（四角から矢印が上に出ているアイコン）をタップ。</li>
              <li>メニューを下にスクロールし、「ホーム画面に追加」をタップ。</li>
              <li>右上の「追加」をタップ。</li>
              <li>
                ホーム画面にできたアイコンからアプリを起動し、再度「通知を有効化」ボタンを押して許可してください。
              </li>
            </ol>
          </section>
          <section className="mt-5 space-y-2 border-t border-gray-100 pt-5">
            <h3 className="font-medium text-gray-900">Android の場合</h3>
            <ol className="list-decimal space-y-1.5 pl-5 text-gray-700">
              <li>Chromeで本サイトを開く。</li>
              <li>アドレスバー右横の「︙」（三点リーダー）をタップ。</li>
              <li>「アプリをインストール」または「ホーム画面に追加」をタップ。</li>
              <li>確認画面が出るので「インストール」または「追加」を選択。</li>
              <li>ホーム画面のアイコンからアプリを起動すると、通知設定が有効になります。</li>
            </ol>
          </section>
        </div>
        <div className="shrink-0 border-t border-gray-100 p-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg bg-gray-900 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}

export default function NotificationSettingsPage() {
  const modalTitleId = useId();
  const { permission, fcmToken, lastError, requestAndRegister } = useNotifications();
  const [howToOpen, setHowToOpen] = useState(false);
  const [serverTestLoading, setServerTestLoading] = useState(false);
  const [serverTestMsg, setServerTestMsg] = useState<string | null>(null);

  const openHowTo = useCallback(() => setHowToOpen(true), []);
  const closeHowTo = useCallback(() => setHowToOpen(false), []);

  const runServerPushTest = useCallback(async () => {
    setServerTestMsg(null);
    const token = fcmToken?.trim();
    if (!token) {
      setServerTestMsg("先に「通知を有効化」でトークンを取得してください。");
      return;
    }
    const deviceId = getOrCreateDeviceId();
    if (!deviceId || deviceId === "anon") {
      setServerTestMsg("端末IDを保存できませんでした（ストレージを確認してください）。");
      return;
    }
    setServerTestLoading(true);
    try {
      const res = await fetch("/api/push-test-self", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId, fcmToken: token }),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      setServerTestMsg(data.message ?? (res.ok ? "リクエストを送信しました。" : `エラー (${res.status})`));
    } catch (e) {
      setServerTestMsg(e instanceof Error ? e.message : "通信に失敗しました。");
    } finally {
      setServerTestLoading(false);
    }
  }, [fcmToken]);

  const permissionLabel =
    permission === "granted"
      ? "許可済み"
      : permission === "default"
        ? "まだ選んでいません"
        : permission === "denied"
          ? "拒否されています（ブラウザの設定から許可できます）"
          : "この環境では通知を使えません";

  return (
    <div className="mx-auto w-full max-w-md space-y-4">
      <NotificationHowToModal open={howToOpen} onClose={closeHowTo} titleId={modalTitleId} />

      <h1 className="flex items-center gap-2 text-lg font-semibold text-gray-800">
        <Bell className="h-5 w-5 text-blue-500" />
        通知設定
      </h1>
      <p className="text-sm text-gray-600">
        許可していただくと、このアプリから期限のお知らせが届きます。内容は入力期限のリマインダーです。
      </p>

      <div className="space-y-3 rounded-lg border border-gray-100 bg-white p-4 shadow-sm text-sm text-gray-800">
        <p>
          <span className="text-gray-500">通知の状態:</span> {permissionLabel}
        </p>
        {lastError && (
          <p className="text-amber-800">
            うまくいかなかったとき: {lastError}
          </p>
        )}
        <button
          type="button"
          onClick={() => void requestAndRegister()}
          className="w-full rounded-lg bg-blue-500 py-2.5 text-sm font-medium text-white hover:bg-blue-600"
        >
          通知を有効化
        </button>
        <button
          type="button"
          onClick={openHowTo}
          className="w-full rounded-lg border border-gray-200 bg-white py-2.5 text-sm font-medium text-gray-800 hover:bg-gray-50"
        >
          スマホでの設定手順を見る
        </button>
        {fcmToken && (
          <>
            <p className="text-xs text-gray-500">
              この端末では通知の登録ができています。
            </p>
            <button
              type="button"
              disabled={serverTestLoading || permission !== "granted"}
              onClick={() => void runServerPushTest()}
              className="w-full rounded-lg border border-blue-200 bg-blue-50 py-2.5 text-sm font-medium text-blue-800 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {serverTestLoading ? "送信中…" : "サーバー経由でテスト通知"}
            </button>
            <p className="text-xs text-gray-500">
              Firebase サーバーからこの端末へ1件送ります。PWAを閉じた状態や別タブでもトレイに出るか確認できます。
            </p>
            {serverTestMsg && (
              <p className="text-xs text-gray-700" role="status">
                {serverTestMsg}
              </p>
            )}
          </>
        )}
      </div>

      <LegalInlineBlock />
    </div>
  );
}
