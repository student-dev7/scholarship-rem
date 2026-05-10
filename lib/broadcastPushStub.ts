import { getFirebaseAdminDb, getFirebaseAdminMessaging } from "./firebaseAdmin";

const USERS = "users";
const TOKEN_FIELD = "fcmToken";

export type BroadcastInput = {
  title?: string;
  body?: string;
  link?: string;
};

export type BroadcastResult = {
  success: boolean;
  attempted: number;
  sent: number;
  failed: number;
  message: string;
};

function chunk<T>(list: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

export type BroadcastOptions = {
  /** 指定時は Firestore を見ず、このトークンだけに送る（端末デバッグ用） */
  onlyToken?: string;
};

function maskToken(t: string): string {
  if (t.length <= 20) return `[len:${t.length}]`;
  return `${t.slice(0, 12)}…${t.slice(-8)}`;
}

function buildWebPayload(title: string, body: string, link: string) {
  return {
    notification: { title, body },
    data: { link },
    webpush: {
      fcmOptions: { link },
      notification: {
        title,
        body,
        icon: "/icons/icon-192x192.png",
      },
    },
  };
}

/**
 * 取得済みトークン一覧へ送信。各レスポンスを try で囲み、失敗時はマスクしたトークンを console.error。
 */
export async function broadcastPushToTokenList(
  input: BroadcastInput,
  tokens: string[]
): Promise<BroadcastResult> {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON_BASE64 && !process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    return {
      success: false,
      attempted: 0,
      sent: 0,
      failed: 0,
      message:
        "サーバー環境変数 FIREBASE_SERVICE_ACCOUNT_JSON_BASE64 (または FIREBASE_SERVICE_ACCOUNT_JSON) が未設定です。",
    };
  }

  const title = input.title?.trim() || "奨学金リマインダー";
  const body = input.body?.trim() || "JASSO 入力期間の確認をお願いします。";
  const link = input.link?.trim() || "/";

  if (tokens.length === 0) {
    return {
      success: true,
      attempted: 0,
      sent: 0,
      failed: 0,
      message: "送信対象トークンがありません。先に通知設定でFCM登録してください。",
    };
  }

  const messaging = getFirebaseAdminMessaging();
  const base = buildWebPayload(title, body, link);
  let sent = 0;
  let failed = 0;

  for (const part of chunk(tokens, 500)) {
    const messages = part.map((token) => ({ token, ...base }));
    try {
      const batchResult = await messaging.sendEach(messages);
      batchResult.responses.forEach((resp, idx) => {
        const tok = part[idx]!;
        try {
          if (resp.success) {
            sent += 1;
          } else {
            failed += 1;
            console.error(
              "[FCM fail]",
              maskToken(tok),
              resp.error?.code ?? "unknown",
              resp.error?.message ?? ""
            );
          }
        } catch (inner) {
          failed += 1;
          console.error("[FCM fail handler]", maskToken(tok), inner);
        }
      });
    } catch (batchErr) {
      console.error("[FCM sendEach batch]", batchErr);
      for (const tok of part) {
        try {
          failed += 1;
          console.error("[FCM batch exception token]", maskToken(tok));
        } catch {
          /* no-op */
        }
      }
    }
  }

  return {
    success: failed === 0,
    attempted: tokens.length,
    sent,
    failed,
    message: `送信完了: ${sent}/${tokens.length} 件成功${failed > 0 ? `（失敗 ${failed} 件）` : ""}`,
  };
}

export async function broadcastPushToAllSubscribers(
  input: BroadcastInput = {},
  options?: BroadcastOptions
): Promise<BroadcastResult> {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON_BASE64 && !process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    return {
      success: false,
      attempted: 0,
      sent: 0,
      failed: 0,
      message:
        "サーバー環境変数 FIREBASE_SERVICE_ACCOUNT_JSON_BASE64 (または FIREBASE_SERVICE_ACCOUNT_JSON) が未設定です。",
    };
  }

  const db = getFirebaseAdminDb();
  const singleSpecified = options?.onlyToken;
  let tokens: string[];
  if (singleSpecified !== undefined) {
    const t = singleSpecified.trim();
    if (!t) {
      return {
        success: false,
        attempted: 0,
        sent: 0,
        failed: 0,
        message: "onlyToken が空です。",
      };
    }
    tokens = [t];
  } else {
    const snap = await db.collection(USERS).get();
    tokens = snap.docs
      .map((d) => d.get(TOKEN_FIELD))
      .filter((v): v is string => typeof v === "string" && v.length > 0);
  }

  return broadcastPushToTokenList(input, tokens);
}
