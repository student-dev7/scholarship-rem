import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";

let adminApp: App | null = null;

type ServiceAccountShape = {
  project_id: string;
  client_email: string;
  private_key: string;
};

const BEGIN_RSA = "-----BEGIN RSA PRIVATE KEY-----";
const END_RSA = "-----END RSA PRIVATE KEY-----";
const BEGIN_EC = "-----BEGIN EC PRIVATE KEY-----";
const END_EC = "-----END EC PRIVATE KEY-----";
const BEGIN_PKCS8 = "-----BEGIN PRIVATE KEY-----";
const END_PKCS8 = "-----END PRIVATE KEY-----";

/**
 * Vercel / .env では JSON 内の \\n が失われたり、PEM が1行に潰れたりして Invalid PEM になることがある。
 * マーカー間の Base64 だけ空白除去し、64 文字折り返しで標準 PEM に整える。
 */
function normalizeFirebasePrivateKeyPem(raw: string): string {
  let key = raw.replace(/\\n/g, "\n").trim().replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  const pairs: { begin: string; end: string }[] = [
    { begin: BEGIN_PKCS8, end: END_PKCS8 },
    { begin: BEGIN_RSA, end: END_RSA },
    { begin: BEGIN_EC, end: END_EC },
  ];
  for (const { begin, end } of pairs) {
    if (!key.includes(begin) || !key.includes(end)) continue;
    const i0 = key.indexOf(begin) + begin.length;
    const i1 = key.indexOf(end);
    const middle = key.slice(i0, i1).replace(/\s+/g, "");
    if (middle.length < 32) return key;
    const lines: string[] = [];
    for (let i = 0; i < middle.length; i += 64) {
      lines.push(middle.slice(i, i + 64));
    }
    return `${begin}\n${lines.join("\n")}\n${end}\n`;
  }
  return key;
}

function decodeServiceAccountUtf8(rawBase64: string | undefined, rawJson: string | undefined): string {
  if (rawBase64) {
    // 貼り付けで混ざる改行・空白は Base64 解読を壊す（JSON.parse が途中で切れた文字列になる）
    const oneLine = rawBase64.replace(/\s+/g, "").trim();
    return Buffer.from(oneLine, "base64").toString("utf8").replace(/^\uFEFF/, "").trim();
  }
  if (rawJson) {
    return rawJson.replace(/^\uFEFF/, "").trim();
  }
  return "";
}

function parseServiceAccount(): ServiceAccountShape {
  const rawBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_JSON_BASE64;
  const rawJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const source = decodeServiceAccountUtf8(rawBase64, rawJson);
  if (!source) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_JSON_BASE64 or FIREBASE_SERVICE_ACCOUNT_JSON is required."
    );
  }
  let parsed: Partial<ServiceAccountShape>;
  try {
    parsed = JSON.parse(source) as Partial<ServiceAccountShape>;
  } catch (e) {
    if (e instanceof SyntaxError) {
      throw new Error(
        "Invalid JSON in FIREBASE_SERVICE_ACCOUNT_JSON or decoded FIREBASE_SERVICE_ACCOUNT_JSON_BASE64 " +
          "(truncation, unclosed private_key string, bad base64, or copy-paste cut off). " +
          "Re-encode the full JSON file as one line of base64 with no line breaks in the env value. " +
          e.message
      );
    }
    throw e;
  }
  if (!parsed.project_id || !parsed.client_email || !parsed.private_key) {
    throw new Error("Invalid Firebase service account JSON.");
  }
  return {
    project_id: parsed.project_id,
    client_email: parsed.client_email,
    private_key: normalizeFirebasePrivateKeyPem(parsed.private_key),
  };
}

export function getFirebaseAdminApp(): App {
  if (adminApp) return adminApp;
  if (getApps().length > 0) {
    adminApp = getApps()[0]!;
    return adminApp;
  }
  const svc = parseServiceAccount();
  adminApp = initializeApp({
    credential: cert({
      projectId: svc.project_id,
      clientEmail: svc.client_email,
      privateKey: svc.private_key,
    }),
  });
  return adminApp;
}

export function getFirebaseAdminDb() {
  return getFirestore(getFirebaseAdminApp());
}

export function getFirebaseAdminMessaging() {
  return getMessaging(getFirebaseAdminApp());
}
