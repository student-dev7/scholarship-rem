import { getFirebaseAdminDb } from "./firebaseAdmin";
import type { JassoSettings } from "./jassoSettingsTypes";

const COL = "settings";
const DOC = "app";

export async function fetchJassoSettingsAdmin(): Promise<JassoSettings | null> {
  const db = getFirebaseAdminDb();
  const snap = await db.collection(COL).doc(DOC).get();
  if (!snap.exists) return null;
  const d = snap.data();
  if (!d) return null;
  const s = (k: string) => (typeof d[k] === "string" ? (d[k] as string) : "");
  return {
    reportStart: s("reportStart"),
    reportEnd: s("reportEnd"),
    continueStart: s("continueStart"),
    continueEnd: s("continueEnd"),
  };
}
