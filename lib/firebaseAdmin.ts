import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";

let adminApp: App | null = null;

type ServiceAccountShape = {
  project_id: string;
  client_email: string;
  private_key: string;
};

function parseServiceAccount(): ServiceAccountShape {
  const rawBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_JSON_BASE64;
  const rawJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const source = rawBase64
    ? Buffer.from(rawBase64, "base64").toString("utf8")
    : rawJson;
  if (!source) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_JSON_BASE64 or FIREBASE_SERVICE_ACCOUNT_JSON is required."
    );
  }
  const parsed = JSON.parse(source) as Partial<ServiceAccountShape>;
  if (!parsed.project_id || !parsed.client_email || !parsed.private_key) {
    throw new Error("Invalid Firebase service account JSON.");
  }
  return {
    project_id: parsed.project_id,
    client_email: parsed.client_email,
    private_key: parsed.private_key.replace(/\\n/g, "\n"),
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
