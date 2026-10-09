import type { JassoSettings } from "./jassoSettingsTypes";
import { addCalendarDaysYmd, getTodayJstYmd } from "./jstDate";

/** ダッシュボード用（自動通知と同じ「開始当日・終了前日」／設定の前倒し日数を反映） */
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

export type TaskScheduleStatus = "past" | "active" | "upcoming" | "unset";

export type TaskScheduleRow = {
  title: string;
  shortTitle: string;
  status: TaskScheduleStatus;
  from: string;
  to: string;
  /** 通知: 入力開始当日 (YYYY-MM-DD) */
  notifyStartYmd: string | null;
  /** 通知: 締切前日 (YYYY-MM-DD) */
  notifyDayBeforeEndYmd: string | null;
};

export type NextDeadlineHighlight =
  | {
      taskTitle: string;
      headline: string;
      subline: string;
      daysRemaining: number;
      targetYmd: string;
    }
  | { kind: "none"; message: string };

function ymdToUtcNoonMs(ymd: string): number {
  const [y, m, d] = ymd.split("-").map(Number);
  return Date.UTC(y, m - 1, d, 12, 0, 0, 0);
}

function diffCalendarDays(fromYmd: string, toYmd: string): number {
  return Math.round((ymdToUtcNoonMs(toYmd) - ymdToUtcNoonMs(fromYmd)) / 86_400_000);
}

function taskStatus(from: string, to: string, todayJst: string): TaskScheduleStatus {
  const fromOk = Boolean(from && /^\d{4}-\d{2}-\d{2}$/.test(from));
  const toOk = Boolean(to && /^\d{4}-\d{2}-\d{2}$/.test(to));
  if (!fromOk && !toOk) return "unset";
  if (toOk && todayJst > to) return "past";
  if (fromOk && todayJst < from) return "upcoming";
  if (fromOk && toOk && todayJst >= from && todayJst <= to) return "active";
  if (fromOk && !toOk && todayJst >= from) return "active";
  return "unset";
}

const TASK_DEFS = [
  { title: "在学届（在籍報告）", shortTitle: "在籍報告", fromKey: "reportStart", toKey: "reportEnd" },
  { title: "継続願", shortTitle: "継続願", fromKey: "continueStart", toKey: "continueEnd" },
] as const;

/** ダッシュボード: 期間・通知日・受付状態を1行ずつ */
export function buildTaskScheduleRows(
  settings: JassoSettings,
  now: Date = new Date()
): TaskScheduleRow[] {
  const todayJst = getTodayJstYmd(now);

  return TASK_DEFS.map((def) => {
    const from = (settings[def.fromKey] ?? "").trim();
    const to = (settings[def.toKey] ?? "").trim();
    const fromOk = /^\d{4}-\d{2}-\d{2}$/.test(from);
    const toOk = /^\d{4}-\d{2}-\d{2}$/.test(to);

    return {
      title: def.title,
      shortTitle: def.shortTitle,
      status: taskStatus(fromOk ? from : "", toOk ? to : "", todayJst),
      from: fromOk ? from : "",
      to: toOk ? to : "",
      notifyStartYmd: fromOk ? from : null,
      notifyDayBeforeEndYmd: toOk ? addCalendarDaysYmd(to, -1) : null,
    };
  });
}

/** いちばん近い「開始」または「締切」までの日数 */
export function getNextDeadlineHighlight(
  settings: JassoSettings,
  now: Date = new Date()
): NextDeadlineHighlight {
  const todayJst = getTodayJstYmd(now);
  const rows = buildTaskScheduleRows(settings, now);

  type Candidate = {
    taskTitle: string;
    headline: string;
    subline: string;
    daysRemaining: number;
    targetYmd: string;
  };
  const candidates: Candidate[] = [];

  for (const row of rows) {
    const fromOk = Boolean(row.from);
    const toOk = Boolean(row.to);

    if (fromOk && todayJst < row.from) {
      const days = diffCalendarDays(todayJst, row.from);
      candidates.push({
        taskTitle: row.shortTitle,
        headline: `${row.shortTitle}の入力開始まで`,
        subline: `開始日: ${slashYmdCompact(row.from)}`,
        daysRemaining: days,
        targetYmd: row.from,
      });
    } else if (toOk && (!fromOk || todayJst >= row.from) && todayJst <= row.to) {
      const days = diffCalendarDays(todayJst, row.to);
      candidates.push({
        taskTitle: row.shortTitle,
        headline: `${row.shortTitle}の締切まで`,
        subline: `最終日: ${slashYmdCompact(row.to)}`,
        daysRemaining: days,
        targetYmd: row.to,
      });
    } else if (fromOk && !toOk && todayJst >= row.from) {
      candidates.push({
        taskTitle: row.shortTitle,
        headline: `${row.shortTitle}の入力期間中`,
        subline: `${slashYmdCompact(row.from)} から（終了日未設定）`,
        daysRemaining: 0,
        targetYmd: row.from,
      });
    }
  }

  if (candidates.length === 0) {
    const anyUnset = rows.some((r) => r.status === "unset");
    if (anyUnset) {
      return { kind: "none", message: "通知設定で入力期間を登録すると、ここに次の期限が表示されます。" };
    }
    return { kind: "none", message: "登録されている入力期間はすべて終了しています。" };
  }

  candidates.sort((a, b) => a.daysRemaining - b.daysRemaining);
  const best = candidates[0];
  return {
    taskTitle: best.taskTitle,
    headline: best.headline,
    subline: best.subline,
    daysRemaining: best.daysRemaining,
    targetYmd: best.targetYmd,
  };
}

function slashYmdCompact(ymd: string): string {
  const m = ymd.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!m) return ymd;
  return `${m[1]}/${Number(m[2])}/${Number(m[3])}`;
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
