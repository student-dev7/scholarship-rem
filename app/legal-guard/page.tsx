"use client";

import {
  AlertTriangle,
  ArrowUpRight,
  BadgeCheck,
  CircleSlash,
  FileText,
  Shield,
} from "lucide-react";
import { useMemo, useState } from "react";
import { LegalInlineBlock } from "@/components/Footer";

const INCOME_CUT = 3_000_000;
const INDICATOR_MAX = 6_000_000;
const JASSO_HARDSHIP_URL = "https://www.jasso.go.jp/shogakukin/henkan_konnan/";

export default function LegalGuardPage() {
  const [income, setIncome] = useState("");

  const parsedIncome = useMemo(() => {
    const v = Number(String(income).replace(/,/g, ""));
    return Number.isFinite(v) ? v : NaN;
  }, [income]);

  const {
    underCut,
    deferHint,
    reduceHint,
    note,
    statusTitle,
    statusDescription,
    cardStyle,
    statusIcon,
  } = useMemo(() => {
    if (!Number.isFinite(parsedIncome)) {
      return {
        underCut: false,
        deferHint: "年収（見込可）を入力してください。",
        reduceHint: "—",
        note: "国の減額返還・猶予は、所得・就職状況・採用年度等の要件によります。以下は学習用の大まか目安に過ぎません。",
        statusTitle: "入力待ち",
        statusDescription: "年収を入力すると、目安判定を表示します。",
        cardStyle: "border-gray-200 bg-gray-50 text-gray-800",
        statusIcon: <FileText className="h-5 w-5" />,
      };
    }
    const under = parsedIncome < INCOME_CUT;
    return {
      underCut: under,
      deferHint: under
        ? "所得面では「期間定めた返還期限の猶予」等の制度説明上の枠内で検討可能になることがあり得ます。必須審査・書類申請の対象外もあり得ます（参考情報のため、公式要項で確認のこと）。"
        : "提示した試算上は高所得帯のため、猶予等の要諦は公式の年収帯表で確認のこと。",
      reduceHint: under
        ? "年収帯上「減額返還（例: 5年・10年弁済）」の枠内で扱いが説明され得る場合がある一方、審査・承認が必要です。自己判断により申し込みが必要です（参考の簡易表示）。"
        : "上記帯向け減額弁済の要諦はJASSO最新の要項に従ってください。",
      note: "審理・更新・例外事由はJASSOが定めるとおり。本診断は法務上の意見を表明するものではありません。最終的には必ずJASSO・大学窓口に相談してください。",
      statusTitle: under ? "申請対象の可能性あり" : "原則返還が必要",
      statusDescription: under
        ? "収入目安では、返還猶予・減額返還を検討できる可能性があります。"
        : "収入目安では、通常返還の対象となる可能性が高い状態です。",
      cardStyle: under
        ? "border-blue-200 bg-blue-50 text-blue-950"
        : "border-amber-300 bg-gradient-to-br from-amber-50 to-rose-50 text-amber-950",
      statusIcon: under ? (
        <BadgeCheck className="h-5 w-5 text-blue-600" />
      ) : (
        <AlertTriangle className="h-5 w-5 text-amber-600" />
      ),
    };
  }, [parsedIncome]);

  const normalizedForIndicator = Number.isFinite(parsedIncome)
    ? Math.min(INDICATOR_MAX, Math.max(0, parsedIncome))
    : 0;
  const indicatorPercent = (normalizedForIndicator / INDICATOR_MAX) * 100;
  const cutPercent = (INCOME_CUT / INDICATOR_MAX) * 100;

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5 pb-16">
      <h1 className="flex items-center gap-2 text-lg font-semibold text-gray-800">
        <Shield className="h-5 w-5 text-blue-500" />
        返還猶予・減額返還判定（参考）
      </h1>

      <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <p className="text-center text-sm text-gray-600">年収（円/年）の目安</p>
        <label className="mx-auto mt-2 block w-full max-w-md text-center">
          <input
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-center text-3xl font-semibold tracking-wide text-gray-900"
            value={income}
            onChange={(e) => setIncome(e.target.value)}
            inputMode="numeric"
            placeholder="例: 2000000"
          />
        </label>

        <p className="mt-2 text-center text-xs text-gray-500">
          入力値:{" "}
          <span className="font-medium tabular-nums text-gray-700">
            {Number.isFinite(parsedIncome) ? parsedIncome.toLocaleString("ja-JP") : "—"} 円
          </span>
        </p>

        <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-3">
          <div className="mb-2 flex items-center justify-between text-xs text-gray-600">
            <span>目安インジケーター</span>
            <span>基準: {INCOME_CUT.toLocaleString("ja-JP")} 円（300万円）</span>
          </div>
          <div className="relative h-3 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className={
                "h-full transition-all " + (underCut ? "bg-blue-500" : "bg-amber-500")
              }
              style={{ width: `${indicatorPercent}%` }}
            />
            <div
              className="absolute inset-y-0 w-0.5 bg-gray-700/70"
              style={{ left: `${cutPercent}%` }}
            />
          </div>
          <div className="mt-2 flex justify-between text-[11px] text-gray-500">
            <span>0円</span>
            <span>300万円</span>
            <span>600万円+</span>
          </div>
        </div>
      </section>

      <section className={`rounded-2xl border p-4 shadow-sm ${cardStyle}`}>
        <div className="flex items-start gap-2">
          <div className="mt-0.5">{statusIcon}</div>
          <div>
            <p className="text-sm font-semibold">{statusTitle}</p>
            <p className="mt-1 text-sm">{statusDescription}</p>
          </div>
        </div>
        <div className="mt-3 grid gap-2 text-sm">
          <p>
            <span className="font-semibold">減額返還（参考目安）:</span> {reduceHint}
          </p>
          <p>
            <span className="font-semibold">返還猶予（参考目安）:</span> {deferHint}
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-800">制度の概要</h2>
        <ul className="mt-3 space-y-2 text-sm text-gray-700">
          <li className="rounded-lg border border-gray-100 bg-gray-50 p-3">
            <p className="flex items-center gap-2 font-medium text-gray-800">
              <CircleSlash className="h-4 w-4 text-blue-600" />
              返還猶予
            </p>
            <p className="mt-1 text-xs text-gray-600">
              一定期間、返還期限を先送りする制度。承認後も定期的な更新審査が必要です。
            </p>
          </li>
          <li className="rounded-lg border border-gray-100 bg-gray-50 p-3">
            <p className="flex items-center gap-2 font-medium text-gray-800">
              <BadgeCheck className="h-4 w-4 text-emerald-600" />
              減額返還
            </p>
            <p className="mt-1 text-xs text-gray-600">
              毎月の返還額を抑えて返還期間を延長する制度。審査・承認後に適用されます。
            </p>
          </li>
        </ul>
      </section>

      {underCut && (
        <section className="rounded-2xl border border-blue-200 bg-blue-50/60 p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-blue-900">次のステップ（アクション）</h2>
          <ul className="mt-3 space-y-2 text-sm text-blue-900">
            <li className="flex items-start gap-2">
              <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0" />
              スカラネット・パーソナルから返還猶予/減額返還の申請手続きを確認する
            </li>
            <li className="flex items-start gap-2">
              <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0" />
              マイナンバー関連書類・所得証明書など必要書類を準備する
            </li>
            <li className="flex items-start gap-2">
              <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0" />
              申請期限・更新期限を事前に確認し、早めに提出する
            </li>
          </ul>
        </section>
      )}

      <a
        href={JASSO_HARDSHIP_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 transition hover:bg-gray-50"
      >
        JASSO公式「返還が難しくなった場合」
        <ArrowUpRight className="h-4 w-4" />
      </a>

      <p className="text-xs text-gray-500">{note}</p>
      <p className="text-xs text-gray-600">
        この判定はあくまで年収のみに基づいた目安であり、世帯人数や特別な事情（病気・災害）は考慮されていません。
      </p>

      <div className="rounded-xl border-2 border-amber-300 bg-amber-50/70 p-3 shadow-sm">
        <LegalInlineBlock />
      </div>
    </div>
  );
}
