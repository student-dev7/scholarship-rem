import type { Timestamp } from "firebase/firestore";

/** Firestore: settings コレクションの 1 ドキュメント (例: app) */
export type JassoSettings = {
  /** 在籍報告 開始日 (YYYY-MM-DD) */
  reportStart: string;
  /** 在籍報告 終了日 (YYYY-MM-DD) */
  reportEnd: string;
  /** 継続願 開始日 */
  continueStart: string;
  /** 継続願 終了日 */
  continueEnd: string;
  updatedAt?: Timestamp;
};

export const JASSO_SETTINGS_DEFAULT: JassoSettings = {
  reportStart: "2026-04-14",
  reportEnd: "2026-04-22",
  continueStart: "2026-12-16",
  continueEnd: "2027-01-18",
};
