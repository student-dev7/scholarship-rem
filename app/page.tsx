"use client";

import { useMemo } from "react";
import { useJassoSettings } from "@/hooks/useJassoSettings";
import { useLocalData } from "@/hooks/useLocalData";
import {
  buildReminderWindowSummary,
  getPendingReminderScaffold,
} from "@/lib/jassoReminders";
import { ArrowUpRight, Calendar, Info } from "lucide-react";

/** YYYY-MM-DD → 2026/4/14（先頭ゼロなし） */
function toSlashYmd(ymd: string): string {
  if (!ymd) return "";
  const m = ymd.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) {
    return `${m[1]}/${Number(m[2])}/${Number(m[3])}`;
  }
  return ymd;
}

function fmtDate(d: Date) {
  return d.toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" });
}

export default function Home() {
  const { settings, loading, error } = useJassoSettings();
  const { offsetDays } = useLocalData();

  const windows = useMemo(
    () => buildReminderWindowSummary(settings),
    [settings]
  );
  const reminders = useMemo(
    () => getPendingReminderScaffold(settings, new Date(), offsetDays),
    [settings, offsetDays]
  );
  const scholarNetLoginUrl = "https://scholar-ps.sas.jasso.go.jp/mypage/login_open.do";
  return (
    <div className="mx-auto w-full max-w-md space-y-4">
      <p className="rounded-lg border border-blue-100 bg-blue-50/90 px-3 py-2.5 text-sm leading-relaxed text-blue-900">
        継続願の入力期間は未定です。
        決定次第バナー通知を送信します。
      </p>
      <h1 className="text-lg font-semibold text-gray-800">ダッシュボード</h1>
      <a
        href={scholarNetLoginUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-900 transition hover:bg-blue-100"
      >
        スカラネット・パーソナルにログイン
        <ArrowUpRight className="h-4 w-4" />
      </a>
      {error && (
        <p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50/80 p-3 text-sm text-amber-900">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </p>
      )}

      <section className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
        <h2 className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-800">
          <Calendar className="h-4 w-4 text-blue-500" />
          JASSO 共通 入力期間
        </h2>
        {loading ? (
          <p className="text-sm text-gray-500">読み込み中…</p>
        ) : (
          <ul className="space-y-2 text-sm text-gray-800">
            {windows.map((w) => {
              const isContinue = w.title.startsWith("継続願");
              const hasRange = Boolean(w.from && w.to);
              const line = (() => {
                if (hasRange) {
                  const r = `${toSlashYmd(w.from)}~${toSlashYmd(w.to)}`;
                  return isContinue ? `${r}程度（未定）` : r;
                }
                return isContinue ? "—（未定）" : "未設定";
              })();
              return (
                <li
                  key={w.title}
                  className="flex flex-col gap-0.5 rounded-md bg-gray-50/80 px-3 py-2"
                >
                  <span className="text-xs text-gray-500">{w.title}</span>
                  <span>{line}</span>
                </li>
              );
            })}
          </ul>
        )}
        {offsetDays > 0 && (
          <p className="mt-2 text-xs text-gray-500">
            大学向け: 表示は「JASSO終了日から {offsetDays} 日早い」日付基準に調整中です（設定で変更可能です）。
          </p>
        )}
      </section>

      <section className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
        <h2 className="mb-2 text-sm font-medium text-gray-800">終了の3日前・前日・当日 通知（Cron と同じ基準）</h2>
        <p className="mb-2 text-xs text-gray-500">
          実際の送信は Vercel Cron の <code className="rounded bg-gray-50 px-1">GET /api/send-push</code>。
          「本日当てはまる」は日本時間での一致です。
        </p>
        <ul className="max-h-48 space-y-1.5 overflow-y-auto text-sm">
          {reminders.length === 0 && (
            <li className="text-gray-500">期限が未登録、または日付範囲外です。</li>
          )}
          {reminders.map((r) => (
            <li
              key={r.label + r.eventDate.getTime()}
              className="flex flex-col rounded-md border border-gray-100 px-2 py-1.5"
            >
              <span className="text-gray-800">{r.label}</span>
              <span className="text-xs text-gray-500">
                当該イベント日: {fmtDate(r.eventDate)} / 本日通知対象:{" "}
                <span className={r.wouldFireToday ? "font-semibold text-blue-600" : "text-gray-500"}>
                  {r.wouldFireToday ? "True" : "False"}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
