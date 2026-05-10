import type { JassoSettings } from "./jassoSettingsTypes";

/** ダッシュボード用（自動通知と同じ「開始3日前・開始日・終了前日」／設定の前倒し日数を反映） */
export { getThreePhaseReminderScaffold as getPendingReminderScaffold } from "./reminderCronMessages";

/**
 * 入力期間（開始/終了）のウィンドウ表示用。
 */
export function buildReminderWindowSummary(
  settings: JassoSettings
): { title: string; from: string; to: string }[] {
  return [
    { title: "在籍報告 入力期間", from: settings.reportStart, to: settings.reportEnd },
    { title: "継続願 入力期間", from: settings.continueStart, to: settings.continueEnd },
  ];
}

/**
 * 毎月 11 日 振込予定 (表示用) — 今日を過ぎた当月初旬なら来月 11 日を返す。
 */
export function nextTransferDay(now: Date = new Date()): Date {
  let y = now.getFullYear();
  let m = now.getMonth();
  if (now.getDate() > 11) m += 1;
  if (m > 11) {
    m = 0;
    y += 1;
  }
  return new Date(y, m, 11, 0, 0, 0, 0);
}
