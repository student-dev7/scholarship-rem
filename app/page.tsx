"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useJassoSettings } from "@/hooks/useJassoSettings";
import {
  buildTaskScheduleRows,
  getNextDeadlineHighlight,
  type TaskScheduleStatus,
} from "@/lib/jassoReminders";
import { ArrowUpRight, Share2 } from "lucide-react";

/** YYYY-MM-DD → 2026/4/14（先頭ゼロなし） */
function toSlashYmd(ymd: string): string {
  if (!ymd) return "";
  const m = ymd.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) {
    return `${m[1]}/${Number(m[2])}/${Number(m[3])}`;
  }
  return ymd;
}

function fmtNotifyYmd(ymd: string | null): string {
  if (!ymd) return "—";
  return toSlashYmd(ymd);
}

const statusBadge: Record<
  TaskScheduleStatus,
  { label: string; className: string }
> = {
  past: { label: "終了", className: "bg-gray-100 text-gray-500" },
  active: { label: "受付中", className: "bg-blue-100 text-blue-800" },
  upcoming: { label: "開始前", className: "bg-amber-100 text-amber-900" },
  unset: { label: "未設定", className: "bg-gray-50 text-gray-400" },
};

const primaryBtn =
  "flex w-full items-center justify-center gap-1 rounded-lg bg-blue-600 px-3 py-3 text-sm font-semibold text-white transition hover:bg-blue-700";

const outlineBtn =
  "flex w-full items-center justify-center gap-1 rounded-lg border border-blue-300 bg-white px-3 py-3 text-sm font-medium text-blue-800 transition hover:bg-blue-50";

export default function Home() {
  const { settings, loading, error } = useJassoSettings();
  const [canShare, setCanShare] = useState(false);
  const now = useMemo(() => new Date(), []);

  useEffect(() => {
    setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  const shareSite = useCallback(async () => {
    if (!navigator.share) return;
    try {
      await navigator.share({
        title: "奨学金リマインダー",
        text: "JASSO 在学届・継続願の期限を思い出す補助アプリ",
        url: window.location.href,
      });
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return;
    }
  }, []);

  const scheduleRows = useMemo(
    () => buildTaskScheduleRows(settings, now),
    [settings, now]
  );
  const nextDeadline = useMemo(
    () => getNextDeadlineHighlight(settings, now),
    [settings, now]
  );

  const scholarNetLoginUrl = "https://scholar-ps.sas.jasso.go.jp/mypage/login_open.do";

  return (
    <div className="mx-auto w-full max-w-md space-y-4">
      <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-snug text-amber-950">
        個人運営サイトです（JASSO・スカラネット公式とは無関係）。
        <Link href="#disclaimer" className="ml-1 font-medium text-amber-900 underline">
          免責の全文
        </Link>
      </p>

      {!loading && (
        <section className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-4 shadow-sm">
          {"kind" in nextDeadline ? (
            <p className="text-sm text-gray-600">{nextDeadline.message}</p>
          ) : (
            <>
              <p className="text-sm font-medium text-blue-900">{nextDeadline.headline}</p>
              <p className="mt-1 flex items-baseline gap-1 tabular-nums">
                <span className="text-5xl font-extrabold tracking-tight text-gray-900">
                  {nextDeadline.daysRemaining}
                </span>
                <span className="text-xl font-bold text-gray-700">日</span>
              </p>
              <p className="mt-1 text-xs text-gray-600">{nextDeadline.subline}</p>
            </>
          )}
        </section>
      )}

      <div className="flex items-start justify-between gap-2">
        <h1 className="text-lg font-semibold text-gray-800">ダッシュボード</h1>
        {canShare ? (
          <button
            type="button"
            onClick={() => void shareSite()}
            className="inline-flex shrink-0 items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
            aria-label="このサイトを共有"
          >
            <Share2 className="h-3.5 w-3.5" aria-hidden />
            共有
          </button>
        ) : null}
      </div>

      <p className="text-sm text-gray-600">
        本サイトをホーム画面に追加し、通知を許可してください。
      </p>
      <div className="flex flex-col gap-2">
        <Link href="/notification-settings" className={primaryBtn}>
          通知を設定する
        </Link>
        <a
          href={scholarNetLoginUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={outlineBtn}
        >
          スカラネット・パーソナルにログイン
          <ArrowUpRight className="h-4 w-4 shrink-0" />
        </a>
      </div>

      {error && (
        <p className="rounded-lg border border-amber-200 bg-amber-50/80 p-3 text-sm text-amber-900">
          {error}
        </p>
      )}

      <section className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-medium text-gray-800">手続きスケジュール</h2>
        {loading ? (
          <p className="text-sm text-gray-500">読み込み中…</p>
        ) : (
          <ul className="space-y-3">
            {scheduleRows.map((row) => {
              const badge = statusBadge[row.status];
              const periodLine = (() => {
                if (row.from && row.to) {
                  return `${toSlashYmd(row.from)}〜${toSlashYmd(row.to)}`;
                }
                if (row.from) return `${toSlashYmd(row.from)}〜（終了日未設定）`;
                if (row.to) return `（開始日未設定）〜${toSlashYmd(row.to)}`;
                return "期間未設定";
              })();
              const isPast = row.status === "past";

              return (
                <li
                  key={row.title}
                  className={
                    "rounded-lg px-3 py-2.5 " +
                    (isPast ? "bg-gray-50/60 opacity-75" : "bg-gray-50/90")
                  }
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={
                        "text-sm font-medium " + (isPast ? "text-gray-500" : "text-gray-800")
                      }
                    >
                      {row.shortTitle}
                    </span>
                    <span
                      className={
                        "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium " +
                        badge.className
                      }
                    >
                      {badge.label}
                    </span>
                  </div>
                  <p className="mt-1 text-sm tabular-nums text-gray-700">{periodLine}</p>
                  {!isPast && (row.notifyStartYmd || row.notifyDayBeforeEndYmd) ? (
                    <p className="mt-1.5 text-[11px] leading-snug text-gray-500">
                      通知: 開始当日 {fmtNotifyYmd(row.notifyStartYmd)}
                      {" · "}
                      締切前日 {fmtNotifyYmd(row.notifyDayBeforeEndYmd)}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
        <p className="mt-3 text-[11px] text-gray-500">
          入力期間は大学によって異なります。通知は日本時間の「開始当日」と「締切前日」に届きます。
        </p>
      </section>
    </div>
  );
}
