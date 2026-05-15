import { NextResponse } from "next/server";
import { broadcastPushToAllSubscribers } from "@/lib/broadcastPushStub";
import { getFirebaseAdminDb } from "@/lib/firebaseAdmin";

const USERS = "users";
const TOKEN_FIELD = "fcmToken";

export const dynamic = "force-dynamic";

/**
 * 同一端末の Firestore 登録と一致する場合のみ、サーバーから FCM テスト送信する。
 * （任意トークンへの送信を防ぐ）
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  const o = body as { deviceId?: unknown; fcmToken?: unknown };
  const deviceId = typeof o.deviceId === "string" ? o.deviceId.trim() : "";
  const fcmToken = typeof o.fcmToken === "string" ? o.fcmToken.trim() : "";

  if (!deviceId || !fcmToken) {
    return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });
  }
  if (deviceId === "anon" || deviceId.length > 200 || fcmToken.length > 4096) {
    return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  }

  if (
    !process.env.FIREBASE_SERVICE_ACCOUNT_JSON_BASE64 &&
    !process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  ) {
    return NextResponse.json(
      {
        ok: false,
        message: "サーバーに Firebase 管理用の環境変数が未設定です。",
      },
      { status: 500 }
    );
  }

  const db = getFirebaseAdminDb();
  const snap = await db.collection(USERS).doc(deviceId).get();
  if (!snap.exists) {
    return NextResponse.json(
      {
        ok: false,
        message: "この端末はまだ登録されていません。「通知を有効化」を先に押してください。",
      },
      { status: 403 }
    );
  }
  const stored = snap.get(TOKEN_FIELD);
  if (typeof stored !== "string" || stored !== fcmToken) {
    return NextResponse.json(
      {
        ok: false,
        message: "トークンが一致しません。もう一度「通知を有効化」を押してから試してください。",
      },
      { status: 403 }
    );
  }

  const r = await broadcastPushToAllSubscribers(
    {
      title: "動作確認（サーバー経由）",
      body: "PWA やバックグラウンドでも通知トレイに出れば、サーバー経由の配信は成功です。",
      link: "/notification-settings",
    },
    { onlyToken: fcmToken }
  );

  return NextResponse.json({
    ok: r.success,
    sent: r.sent,
    failed: r.failed,
    attempted: r.attempted,
    message: r.message,
  });
}
