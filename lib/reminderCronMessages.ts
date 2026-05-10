import type { BroadcastInput } from "./broadcastPushStub";
import type { JassoSettings } from "./jassoSettingsTypes";
import { addCalendarDaysYmd, getTodayJstYmd } from "./jstDate";

export type EndReminderPhase = "threeDaysBeforeEnd" | "dayBeforeEnd" | "endDay";

type PhaseMatch = { phase: EndReminderPhase; endYmd: string };

function slashYmd(ymd: string): string {
  const m = ymd.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return ymd;
  return `${Number(m[1])}/${Number(m[2])}/${Number(m[3])}`;
}

function phasesForEndAgainstToday(endYmd: string, todayJstYmd: string): PhaseMatch[] {
  const d3 = addCalendarDaysYmd(endYmd, -3);
  const d1 = addCalendarDaysYmd(endYmd, -1);
  if (!d3 || !d1) return [];
  const out: PhaseMatch[] = [];
  if (todayJstYmd === d3) out.push({ phase: "threeDaysBeforeEnd", endYmd });
  if (todayJstYmd === d1) out.push({ phase: "dayBeforeEnd", endYmd });
  if (todayJstYmd === endYmd) out.push({ phase: "endDay", endYmd });
  return out;
}

function buildPayload(
  taskLabel: string,
  endDisplay: string,
  phase: EndReminderPhase
): BroadcastInput {
  const endBr = slashYmd(endDisplay);
  if (phase === "threeDaysBeforeEnd") {
    return {
      title: `${taskLabel}｜締切まであと3日`,
      body: `入力期間の終了は ${endBr} です。スカラネットと大学の案内を確認してください。`,
      link: "/",
    };
  }
  if (phase === "dayBeforeEnd") {
    return {
      title: `${taskLabel}｜明日が締切です`,
      body: `入力期間は明日 ${endBr} が最終日です。未完了の方はお早めにご対応ください。`,
      link: "/",
    };
  }
  return {
    title: `${taskLabel}｜本日が締切です`,
    body: `今日 ${endBr} が入力期限です。申請の途中でも提出状況を確認してください。`,
    link: "/",
  };
}

/** Cron 用: JST「今日」と Firestore の終了日のみ比較（offset なし） */
export function buildCronReminderBroadcasts(
  settings: JassoSettings,
  todayJstYmd: string
): BroadcastInput[] {
  const tasks: { label: string; endField: string }[] = [
    { label: "在学届（在籍報告）", endField: settings.reportEnd },
    { label: "継続願", endField: settings.continueEnd },
  ];
  const payloads: BroadcastInput[] = [];
  for (const { label, endField } of tasks) {
    const end = endField?.trim();
    if (!end || !/^\d{4}-\d{2}-\d{2}$/.test(end)) continue;
    const matches = phasesForEndAgainstToday(end, todayJstYmd);
    for (const { phase, endYmd } of matches) {
      payloads.push(buildPayload(label, endYmd, phase));
    }
  }
  return payloads;
}

function ymdToUtcNoonDate(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0, 0));
}

/**
 * ダッシュボード用: 終了日基準の3段階と JST の「今日」を比較（offset は終了日の前倒し日数）。
 */
export function getEndDateReminderScaffold(
  settings: JassoSettings,
  now: Date = new Date(),
  offsetDays: number = 0
): { label: string; wouldFireToday: boolean; eventDate: Date; note: string }[] {
  const todayJst = getTodayJstYmd(now);
  const rows: { label: string; wouldFireToday: boolean; eventDate: Date; note: string }[] = [];

  const events = [
    { title: "在学届（在籍報告）", end: settings.reportEnd },
    { title: "継続願", end: settings.continueEnd },
  ];

  const slots: { phase: EndReminderPhase; suffix: string; note: string }[] = [
    { phase: "threeDaysBeforeEnd", suffix: "終了の3日前", note: "Vercel Cron と同じ基準（表示は offset 適用終了日）" },
    { phase: "dayBeforeEnd", suffix: "終了の前日", note: "同上" },
    { phase: "endDay", suffix: "終了当日", note: "同上" },
  ];

  for (const ev of events) {
    const rawEnd = ev.end?.trim();
    if (!rawEnd || !/^\d{4}-\d{2}-\d{2}$/.test(rawEnd)) continue;
    const effectiveEnd =
      offsetDays !== 0
        ? addCalendarDaysYmd(rawEnd, -offsetDays) ?? rawEnd
        : rawEnd;

    const d3 = addCalendarDaysYmd(effectiveEnd, -3);
    const d1 = addCalendarDaysYmd(effectiveEnd, -1);
    if (!d3 || !d1) continue;

    const phaseMap: Record<EndReminderPhase, string> = {
      threeDaysBeforeEnd: d3,
      dayBeforeEnd: d1,
      endDay: effectiveEnd,
    };

    for (const slot of slots) {
      const ymd = phaseMap[slot.phase];
      rows.push({
        label: `${ev.title}・${slot.suffix}`,
        wouldFireToday: ymd === todayJst,
        eventDate: ymdToUtcNoonDate(ymd),
        note: slot.note,
      });
    }
  }

  return rows;
}
