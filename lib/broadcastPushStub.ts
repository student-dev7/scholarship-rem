/**
 * FCM HTTP v1 で全ユーザへ一斉配信 — 本番は firebase-admin などで実装し、
 * ここに Firestore users のトークン列挙 + messages:send のループを接続してください。
 */
export type BroadcastResult = {
  success: boolean;
  attempted: number;
  message: string;
};

export async function broadcastPushToAllSubscribers(): Promise<BroadcastResult> {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON_BASE64) {
    return {
      success: true,
      attempted: 0,
      message:
        "雛形: サーバーに FIREBASE_SERVICE_ACCOUNT_JSON_BASE64 を設定し、users コレクションの fcmToken を一斉配信に利用してください。",
    };
  }
  return {
    success: true,
    attempted: 0,
    message: "雛形: サービスアカウント検出 — FCM 送信の実装を拡張してください。",
  };
}
