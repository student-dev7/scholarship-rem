"use client";

import { useMemo } from "react";
import { useJassoSettings } from "@/hooks/useJassoSettings";
import { useLocalData } from "@/hooks/useLocalData";
import {
  buildReminderWindowSummary,
  getPendingReminderScaffold,
  nextTransferDay,
} from "@/lib/jassoReminders";
import { Calendar, Clock, Info } from "lucide-react";

function fmt(d: string) {
  if (!d) return "未設定";
  return d;
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
  const nextPay = useMemo(() => nextTransferDay(new Date()), []);
  return (
    <div className="mx-auto w-full max-w-md space-y-4">
      <h1 className="text-lg font-semibold text-gray-800">ダッシュボード</h1>
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
            {windows.map((w) => (
              <li
                key={w.title}
                className="flex flex-col gap-0.5 rounded-md bg-gray-50/80 px-3 py-2"
              >
                <span className="text-xs text-gray-500">{w.title}</span>
                <span>
                  {fmt(w.from)} 〜 {fmt(w.to)}
                </span>
              </li>
            ))}
          </ul>
        )}
        {offsetDays > 0 && (
          <p className="mt-2 text-xs text-gray-500">
            大学向け: 表示は「JASSO終了日から {offsetDays} 日早い」日付基準に調整中です（設定で変更可能です）。
          </p>
        )}
      </section>

      <section className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
        <h2 className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-800">
          <Clock className="h-4 w-4 text-blue-500" />
          毎月の振込予定
        </h2>
        <p className="text-sm text-gray-800">次回の目安: {fmtDate(nextPay)}（毎月 11 日扱いの表示用）</p>
        <p className="mt-1 text-xs text-gray-500">
          土日祝でずれる場合があります。JASSO・大学の表記を必ず優先してください。
        </p>
      </section>

      <section className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
        <h2 className="mb-2 text-sm font-medium text-gray-800">7日前・前日 通知（雛形）</h2>
        <p className="mb-2 text-xs text-gray-500">
          下記の「本日当てはまる」行が True のとき、バックエンド/ローカルでプッシュ案を出せます（全自動には未接続の場合あり）。
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
