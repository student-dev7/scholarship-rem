import { NextResponse } from "next/server";
import type { JassoSettings } from "@/lib/jassoSettingsTypes";
import {
  broadcastPushToAllSubscribers,
  broadcastPushToTokenList,
} from "@/lib/broadcastPushStub";
import { fetchJassoSettingsAdmin } from "@/lib/firestoreSettingsServer";
import { getFirebaseAdminDb } from "@/lib/firebaseAdmin";
import { buildCronReminderBroadcasts } from "@/lib/reminderCronMessages";
import { getTodayJstYmd } from "@/lib/jstDate";
import { verifyAdminBearer } from "@/lib/verifyAdminBearer";

const USERS = "users";
const TOKEN_FIELD = "fcmToken";

export const dynamic = "force-dynamic";

function unauthorized(): NextResponse {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

/**
 * Vercel Cron — JST で「開始3日前・開始当日・終了前日」に該当すれば自動送信。
 * Authorization: Bearer {ADMIN_API_SECRET}。
 */
export async function GET(request: Request) {
  const authOk = verifyAdminBearer(request.headers.get("Authorization"));
  if (!authOk || !process.env.ADMIN_API_SECRET) {
    return unauthorized();
  }

  if (
    !process.env.FIREBASE_SERVICE_ACCOUNT_JSON_BASE64 &&
    !process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  ) {
    console.error("[send-push cron] missing FIREBASE_SERVICE_ACCOUNT_JSON_*");
    return NextResponse.json({ ok: false, error: "server_misconfigured" }, { status: 500 });
  }

  const today = getTodayJstYmd();

  let settings: JassoSettings | null;
  try {
    settings = await fetchJassoSettingsAdmin();
  } catch (e) {
    console.error("[send-push cron] fetchJassoSettingsAdmin", e);
    return NextResponse.json({ ok: false, error: "settings_read_failed" }, { status: 500 });
  }

  if (!settings) {
    return NextResponse.json({ ok: true, message: "No targets today", todayJst: today }, { status: 200 });
  }

  let broadcasts;
  try {
    broadcasts = buildCronReminderBroadcasts(settings, today);
  } catch (e) {
    console.error("[send-push cron] buildCronReminderBroadcasts", e);
    return NextResponse.json({ ok: false, error: "plan_failed" }, { status: 500 });
  }

  if (broadcasts.length === 0) {
    return NextResponse.json({ ok: true, message: "No targets today", todayJst: today }, { status: 200 });
  }

  let tokens: string[];
  try {
    const db = getFirebaseAdminDb();
    const snap = await db.collection(USERS).get();
    tokens = snap.docs
      .map((d) => d.get(TOKEN_FIELD))
      .filter((v): v is string => typeof v === "string" && v.length > 0);
  } catch (e) {
    console.error("[send-push cron] users collection", e);
    return NextResponse.json({ ok: false, error: "users_read_failed" }, { status: 500 });
  }

  if (tokens.length === 0) {
    return NextResponse.json({
      ok: true,
      message: "No targets today",
      todayJst: today,
      plannedBroadcasts: broadcasts.length,
      subscriberTokens: 0,
    });
  }

  const batches: { title?: string; sent: number; failed: number; message: string }[] = [];

  for (const payload of broadcasts) {
    try {
      const r = await broadcastPushToTokenList(payload, tokens);
      batches.push({ title: payload.title, sent: r.sent, failed: r.failed, message: r.message });
    } catch (e) {
      console.error("[send-push cron] broadcastPushToTokenList", payload.title, e);
      try {
        batches.push({
          title: payload.title,
          sent: 0,
          failed: tokens.length,
          message: `exception: ${e instanceof Error ? e.message : String(e)}`,
        });
      } catch {
        /* no-op */
      }
    }
  }

  const totalSent = batches.reduce((a, b) => a + b.sent, 0);
  const totalFailed = batches.reduce((a, b) => a + b.failed, 0);

  return NextResponse.json(
    {
      ok: totalFailed === 0,
      message: `${broadcasts.length} 種類のリマインダーを送信しました（JST ${today}）。`,
      todayJst: today,
      totalSent,
      totalFailed,
      batches,
    },
    { status: 200 }
  );
}

/** 管理者手動: JSON body。Authorization は GET と同様。 */
export async function POST(request: Request) {
  const authOk = verifyAdminBearer(request.headers.get("Authorization"));
  if (!authOk || !process.env.ADMIN_API_SECRET) {
    return unauthorized();
  }

  const payload = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const onlyToken = typeof payload.onlyToken === "string" ? payload.onlyToken : undefined;
  let r;
  try {
    r = await broadcastPushToAllSubscribers(
      {
        title: typeof payload.title === "string" ? payload.title : undefined,
        body: typeof payload.body === "string" ? payload.body : undefined,
        link: typeof payload.link === "string" ? payload.link : undefined,
      },
      onlyToken !== undefined ? { onlyToken } : undefined
    );
  } catch (e) {
    console.error("[send-push POST]", e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }

  return NextResponse.json(r);
}
