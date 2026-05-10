import type { BroadcastInput } from "./broadcastPushStub";
import type { JassoSettings } from "./jassoSettingsTypes";
import { addCalendarDaysYmd, getTodayJstYmd } from "./jstDate";

export type ReminderPhaseKind = "threeDaysBeforeStart" | "startDay" | "dayBeforeEnd";

function slashYmd(ymd: string): string {
  const m = ymd.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return ymd;
  return `${Number(m[1])}/${Number(m[2])}/${Number(m[3])}`;
}

function buildPayloadForPhase(
  taskLabel: string,
  phase: ReminderPhaseKind,
  startYmd: string,
  endYmd: string,
  endOk: boolean
): BroadcastInput {
  const startBr = slashYmd(startYmd);
  const endBr = slashYmd(endYmd);
  if (phase === "threeDaysBeforeStart") {
    return {
      title: `${taskLabel}｜入力開始まであと3日`,
      body: `入力期間は ${startBr} からです。大学の案内とスカラネットを確認してください。`,
      link: "/",
    };
  }
  if (phase === "startDay") {
    return {
      title: `${taskLabel}｜入力期間が始まります`,
      body: endOk
        ? `本日 ${startBr} から入力できます。期限は ${endBr} です。`
        : `本日 ${startBr} から入力期間が始まります。大学の案内を確認してください。`,
      link: "/",
    };
  }
  return {
    title: `${taskLabel}｜明日が締切です`,
    body: `入力期間は明日 ${endBr} が最終日です。未完了の方はお早めにご対応ください。`,
    link: "/",
  };
}

/** Cron: JST「今日」が開始3日前・開始当日・終了前日のいずれかに該当すれば送信 */
export function buildCronReminderBroadcasts(
  settings: JassoSettings,
  todayJstYmd: string
): BroadcastInput[] {
  const tasks: { label: string; startField: string; endField: string }[] = [
    { label: "在学届（在籍報告）", startField: settings.reportStart, endField: settings.reportEnd },
    { label: "継続願", startField: settings.continueStart, endField: settings.continueEnd },
  ];
  const payloads: BroadcastInput[] = [];

  for (const { label, startField, endField } of tasks) {
    const start = startField?.trim();
    const end = endField?.trim();
    const startOk = Boolean(start && /^\d{4}-\d{2}-\d{2}$/.test(start));
    const endOk = Boolean(end && /^\d{4}-\d{2}-\d{2}$/.test(end));

    if (startOk) {
      const d3 = addCalendarDaysYmd(start, -3);
      if (d3 && todayJstYmd === d3) {
        payloads.push(
          buildPayloadForPhase(label, "threeDaysBeforeStart", start, endOk ? end! : start, endOk)
        );
      }
      if (todayJstYmd === start) {
        payloads.push(buildPayloadForPhase(label, "startDay", start, endOk ? end! : start, endOk));
      }
    }

    if (endOk) {
      const dBeforeEnd = addCalendarDaysYmd(end!, -1);
      if (dBeforeEnd && todayJstYmd === dBeforeEnd) {
        const startRef = startOk ? start! : end!;
        payloads.push(buildPayloadForPhase(label, "dayBeforeEnd", startRef, end!, true));
      }
    }
  }

  return payloads;
}

function ymdToUtcNoonDate(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0, 0));
}

/**
 * ダッシュボード用: 開始3日前・開始日・終了前日（offset 日だけ期間を前にずらして表示）
 */
export function getThreePhaseReminderScaffold(
  settings: JassoSettings,
  now: Date = new Date(),
  offsetDays: number = 0
): { label: string; wouldFireToday: boolean; eventDate: Date }[] {
  const todayJst = getTodayJstYmd(now);
  const rows: { label: string; wouldFireToday: boolean; eventDate: Date }[] = [];

  const events = [
    { title: "在学届（在籍報告）", start: settings.reportStart, end: settings.reportEnd },
    { title: "継続願", start: settings.continueStart, end: settings.continueEnd },
  ];

  const slots: { phase: ReminderPhaseKind; suffix: string }[] = [
    { phase: "threeDaysBeforeStart", suffix: "開始の3日前" },
    { phase: "startDay", suffix: "開始当日" },
    { phase: "dayBeforeEnd", suffix: "終了の前日" },
  ];

  for (const ev of events) {
    const rawStart = ev.start?.trim();
    const rawEnd = ev.end?.trim();
    const startOk = Boolean(rawStart && /^\d{4}-\d{2}-\d{2}$/.test(rawStart));
    const endOk = Boolean(rawEnd && /^\d{4}-\d{2}-\d{2}$/.test(rawEnd));

    const effectiveStart = startOk
      ? offsetDays !== 0
        ? addCalendarDaysYmd(rawStart!, -offsetDays) ?? rawStart!
        : rawStart!
      : "";
    const effectiveEnd = endOk
      ? offsetDays !== 0
        ? addCalendarDaysYmd(rawEnd!, -offsetDays) ?? rawEnd!
        : rawEnd!
      : "";

    const esOk = Boolean(effectiveStart && /^\d{4}-\d{2}-\d{2}$/.test(effectiveStart));
    const eeOk = Boolean(effectiveEnd && /^\d{4}-\d{2}-\d{2}$/.test(effectiveEnd));

    for (const slot of slots) {
      let ymd: string | null = null;
      if (slot.phase === "threeDaysBeforeStart" && esOk) {
        ymd = addCalendarDaysYmd(effectiveStart, -3);
      } else if (slot.phase === "startDay" && esOk) {
        ymd = effectiveStart;
      } else if (slot.phase === "dayBeforeEnd" && eeOk) {
        ymd = addCalendarDaysYmd(effectiveEnd, -1);
      }
      if (!ymd) continue;

      rows.push({
        label: `${ev.title}・${slot.suffix}`,
        wouldFireToday: ymd === todayJst,
        eventDate: ymdToUtcNoonDate(ymd),
      });
    }
  }

  return rows;
}
