"use server";

import { broadcastPushToAllSubscribers } from "@/lib/broadcastPushStub";

/**
 * 管理画面の「一斉プッシュ（雛形）」 — クライアントに秘密を渡さない。
 * 本番は Firebase セッションの検証や管理者ロールの DB チェックを併用してください。
 */
export async function runPushBroadcastFromAdmin(): Promise<{
  ok: boolean;
  data?: { success: boolean; attempted: number; message: string };
  error?: string;
}> {
  const r = await broadcastPushToAllSubscribers();
  return { ok: true, data: { success: r.success, attempted: r.attempted, message: r.message } };
}
