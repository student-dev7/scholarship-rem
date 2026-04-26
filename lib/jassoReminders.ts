import type { JassoSettings } from "./jassoSettingsTypes";

const MS_DAY = 86_400_000;

/**
 * 期限日から offsetDays 日前した「表示用の期限日」相当の日付群を、
 * 7日前・1日前通知の雛形として返す。実際の送信は FCM/ローカル通知のジョブと結合。
 */
function parseYmd(ymd: string): Date | null {
  if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
  const d = new Date(ymd + "T00:00:00");
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * ダッシュボード用: 7日前・1日前に当たるかどうか (当日の比較)。
 * offsetDays: 正の数で大学独自の前倒し (例: 5 = 5 日前の時点を「期限扱い」に近づける調整) → 日付に減算。
 */
export function getPendingReminderScaffold(
  settings: JassoSettings,
  now: Date = new Date(),
  offsetDays: number = 0
): { label: string; wouldFireToday: boolean; eventDate: Date; note: string }[] {
  const out: {
    label: string;
    wouldFireToday: boolean;
    eventDate: Date;
    note: string;
  }[] = [];

  const events: { label: string; end: string }[] = [
    { label: "在籍報告（JASSO共通 終了日）", end: settings.reportEnd },
    { label: "継続願（JASSO共通 終了日）", end: settings.continueEnd },
  ];

  for (const ev of events) {
    const end = parseYmd(ev.end);
    if (!end) continue;
    const adjusted = new Date(
      end.getTime() - offsetDays * MS_DAY
    );
    const d7 = new Date(adjusted.getTime() - 7 * MS_DAY);
    const d1 = new Date(adjusted.getTime() - 1 * MS_DAY);
    out.push(
      {
        label: `${ev.label} ・ 7 日前通知`,
        wouldFireToday: isSameDay(d7, now),
        eventDate: d7,
        note: "7 日前にプッシュ/ローカル通知（雛形）",
      },
      {
        label: `${ev.label} ・ 前日通知`,
        wouldFireToday: isSameDay(d1, now),
        eventDate: d1,
        note: "1 日前にプッシュ/ローカル通知（雛形）",
      }
    );
  }
  return out;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
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

/**
 * 将来: Cloud Scheduler またはクライアントの periodic sync で
 * ここに渡した日付の朝に FCM/ローカル通知を飛ばす、という拡張ポイント。
 */
export function buildReminderWindowSummary(
  settings: JassoSettings
): { title: string; from: string; to: string }[] {
  return [
    { title: "在籍報告 入力期間 (JASSO)", from: settings.reportStart, to: settings.reportEnd },
    { title: "継続願 入力期間 (JASSO)", from: settings.continueStart, to: settings.continueEnd },
  ];
}
