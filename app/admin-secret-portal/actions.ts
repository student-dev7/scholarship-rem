"use server";

import { broadcastPushToAllSubscribers } from "@/lib/broadcastPushStub";

function pack(r: Awaited<ReturnType<typeof broadcastPushToAllSubscribers>>) {
  return {
    ok: true as const,
    data: {
      success: r.success,
      attempted: r.attempted,
      sent: r.sent,
      failed: r.failed,
      message: r.message,
    },
  };
}

/**
 * 管理画面の「一斉プッシュ（雛形）」 — クライアントに秘密を渡さない。
 * 本番は Firebase セッションの検証や管理者ロールの DB チェックを併用してください。
 */
export async function runPushBroadcastFromAdmin(): Promise<{
  ok: boolean;
  data?: { success: boolean; attempted: number; sent: number; failed: number; message: string };
  error?: string;
}> {
  const r = await broadcastPushToAllSubscribers();
  return pack(r);
}

/** 1 台だけ FCM テスト（通知設定でコピーしたトークンを貼る） */
export async function runPushTestToTokenFromAdmin(fcmToken: string): Promise<{
  ok: boolean;
  data?: { success: boolean; attempted: number; sent: number; failed: number; message: string };
  error?: string;
}> {
  const r = await broadcastPushToAllSubscribers(
    {
      title: "デバッグ通知",
      body: "サーバー経由のテストです。バックグラウンドならトレイにも表示されます。",
      link: "/notification-settings",
    },
    { onlyToken: fcmToken.trim() }
  );
  return pack(r);
}
