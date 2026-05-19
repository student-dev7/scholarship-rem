"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useJassoSettings } from "@/hooks/useJassoSettings";
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

const primaryRowBtn =
  "flex w-full items-center justify-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-3 py-3 text-sm font-medium text-blue-900 transition hover:bg-blue-100";

export default function Home() {
  const { settings, loading, error } = useJassoSettings();

  const windows = useMemo(
    () => buildReminderWindowSummary(settings),
    [settings]
  );
  const reminders = useMemo(
    () => getPendingReminderScaffold(settings, new Date(), 0),
    [settings]
  );
  const scholarNetLoginUrl = "https://scholar-ps.sas.jasso.go.jp/mypage/login_open.do";
  return (
    <div className="mx-auto w-full max-w-md space-y-4">
      <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm leading-relaxed text-amber-950">
        当サイトは、独立行政法人日本学生支援機構（JASSO）およびスカラネット公式とは無関係の個人サイトです。手続きの期限は大学によって異なる場合があります。正確な情報は、必ずご自身の大学や公式サイトの案内をご確認ください。
      </p>
      <h1 className="text-lg font-semibold text-gray-800">ダッシュボード</h1>
      <p className="text-sm text-gray-600">
        本サイトをホーム画面に追加し、通知を許可してください。
      </p>
      <div className="flex flex-col gap-2">
        <Link href="/notification-settings" className={primaryRowBtn}>
          通知を設定する
        </Link>
        <a
          href={scholarNetLoginUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={primaryRowBtn}
        >
          スカラネット・パーソナルにログイン
          <ArrowUpRight className="h-4 w-4 shrink-0" />
        </a>
      </div>
      {error && (
        <p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50/80 p-3 text-sm text-amber-900">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </p>
      )}

      <section className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
        <h2 className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-800">
          <Calendar className="h-4 w-4 text-blue-500" />
          入力期間（参考）
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
      </section>

      <section className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
        <h2 className="mb-2 text-sm font-medium text-gray-800">お知らせが届く日（2回）</h2>
        <p className="mb-2 text-xs text-gray-600">
          「入力が始まる日（当日）」と「締切の前日」のタイミングです（日本時間）。
        </p>
        <ul className="max-h-56 space-y-1.5 overflow-y-auto text-sm">
          {reminders.length === 0 && (
            <li className="text-gray-500">日程がまだ登録されていないか、対象がありません。</li>
          )}
          {reminders.map((r) => (
            <li
              key={r.label + r.eventDate.getTime()}
              className="flex flex-col rounded-md border border-gray-100 px-2 py-1.5"
            >
              <span className="text-gray-800">{r.label}</span>
              <span className="text-xs text-gray-500">
                対象日: {fmtDate(r.eventDate)}
                {r.wouldFireToday ? (
                  <span className="ml-1 font-medium text-blue-600">（今日お知らせの予定）</span>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
