import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Authorization: Bearer … を ADMIN_API_SECRET とタイミング攻撃に強い形で比較する。
 * Vercel Cron は CRON_SECRET を Bearer に載せるため、その値を ADMIN_API_SECRET と同一に設定してください。
 */
export function verifyAdminBearer(authHeader: string | null): boolean {
  const secret = process.env.ADMIN_API_SECRET ?? "";
  if (!secret) return false;
  const raw = authHeader?.trim();
  if (!raw) return false;
  const upper = raw.startsWith("Bearer ") ? raw.slice(7).trim() : "";
  if (!upper) return false;

  const hp = createHash("sha256").update(upper, "utf8").digest();
  const hs = createHash("sha256").update(secret, "utf8").digest();
  try {
    return hp.length === hs.length && timingSafeEqual(hp, hs);
  } catch {
    return false;
  }
}
