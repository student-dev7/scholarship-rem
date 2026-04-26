"use client";

import { Plus, Trash2 } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

type Segment = {
  id: string;
  months: number;
  monthlyYen: number;
  hasInstitutionGuarantee: boolean;
  /** 保証料 月額（円、概算） */
  guaranteeFeeYen: number;
};

const defaultSeg = (): Segment => ({
  id: crypto.randomUUID(),
  months: 12,
  monthlyYen: 0,
  hasInstitutionGuarantee: false,
  guaranteeFeeYen: 0,
});

function numberOr(v: string, d: number) {
  const n = Number(v.replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : d;
}

/**
 * 概算: 固定利率・見直し利率の単利ベース。実際のJASSO計算式とは異なり得ます（表示は概算）。
 */
export default function SimulatorPage() {
  const [segments, setSegments] = useState<Segment[]>([defaultSeg()]);
  const [rateFixed, setRateFixed] = useState(0.01);
  const [rateRevised, setRateRevised] = useState(0.01);

  const add = useCallback(() => setSegments((s) => [...s, defaultSeg()]), []);
  const remove = useCallback((id: string) => {
    setSegments((s) => s.filter((x) => x.id !== id));
  }, []);

  const { totalLent, totalGuarantee, approxPayoutSum, interestFixed, interestRevised } = useMemo(() => {
    let totalLent = 0;
    let totalGuarantee = 0;
    let approxPayoutSum = 0;
    for (const s of segments) {
      const gross = s.months * s.monthlyYen;
      totalLent += gross;
      if (s.hasInstitutionGuarantee) {
        const fee = s.months * s.guaranteeFeeYen;
        totalGuarantee += fee;
        approxPayoutSum += gross - fee;
      } else {
        approxPayoutSum += gross;
      }
    }
    // 利子: 簡易に貸与総額 * 年率 として表示（年換算 1 回、概算のため）
    const iF = totalLent * rateFixed;
    const iR = totalLent * rateRevised;
    return {
      totalLent,
      totalGuarantee,
      approxPayoutSum,
      interestFixed: iF,
      interestRevised: iR,
    };
  }, [segments, rateFixed, rateRevised]);

  const repaymentWithInterestFixed = totalLent + interestFixed;
  const repaymentWithInterestRevised = totalLent + interestRevised;

  return (
    <div className="mx-auto w-full max-w-md space-y-4">
      <h1 className="text-lg font-semibold text-gray-800">貸与履歴・計算</h1>
      <p className="text-xs text-gray-500">
        機関保証「あり」時は保証料を毎月差し引いた目安（概算）を併記します。最終的な額は JASSO の審定に従います。
      </p>

      {segments.map((s, i) => (
        <div key={s.id} className="space-y-2 rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-gray-800">期間 {i + 1}</span>
            {segments.length > 1 && (
              <button
                type="button"
                onClick={() => remove(s.id)}
                className="rounded p-1 text-red-500 hover:bg-red-50"
                aria-label="削除"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
          <label className="block text-xs text-gray-500">
            月額（円）
            <input
              type="text"
              inputMode="numeric"
              className="mt-0.5 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
              value={s.monthlyYen || ""}
              onChange={(e) =>
                setSegments((segs) =>
                  segs.map((x) =>
                    x.id === s.id
                      ? { ...x, monthlyYen: numberOr(e.target.value, 0) }
                      : x
                  )
                )
              }
            />
          </label>
          <label className="block text-xs text-gray-500">
            月数
            <input
              type="text"
              inputMode="numeric"
              className="mt-0.5 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
              value={s.months || ""}
              onChange={(e) =>
                setSegments((segs) =>
                  segs.map((x) =>
                    x.id === s.id
                      ? { ...x, months: numberOr(e.target.value, 0) }
                      : x
                  )
                )
              }
            />
          </label>
          <label className="mt-1 flex items-center gap-2 text-sm text-gray-800">
            <input
              type="checkbox"
              className="rounded"
              checked={s.hasInstitutionGuarantee}
              onChange={(e) =>
                setSegments((segs) =>
                  segs.map((x) => (x.id === s.id ? { ...x, hasInstitutionGuarantee: e.target.checked } : x))
                )
              }
            />
            機関保証
          </label>
          {s.hasInstitutionGuarantee && (
            <label className="block text-xs text-gray-500">
              保証料（円/月）概算
              <input
                type="text"
                inputMode="numeric"
                className="mt-0.5 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                value={s.guaranteeFeeYen || ""}
                onChange={(e) =>
                  setSegments((segs) =>
                    segs.map((x) =>
                      x.id === s.id
                        ? { ...x, guaranteeFeeYen: numberOr(e.target.value, 0) }
                        : x
                    )
                  )
                }
              />
            </label>
          )}
        </div>
      ))}

      <button
        type="button"
        onClick={add}
        className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-gray-200 py-2 text-sm text-gray-800 hover:border-blue-200 hover:bg-blue-50/50"
      >
        <Plus className="h-4 w-4" />
        期間を追加
      </button>

      <div className="space-y-2 rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-medium text-gray-800">年率（概算入力）</h2>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs text-gray-500">
            固定
            <input
              className="mt-0.5 w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
              type="number"
              step="0.0001"
              value={rateFixed}
              onChange={(e) => setRateFixed(numberOr(e.target.value, 0.01))}
            />
          </label>
          <label className="text-xs text-gray-500">
            見直し
            <input
              className="mt-0.5 w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
              type="number"
              step="0.0001"
              value={rateRevised}
              onChange={(e) => setRateRevised(numberOr(e.target.value, 0.01))}
            />
          </label>
        </div>
      </div>

      <div className="space-y-2 rounded-lg border border-gray-100 bg-white p-4 text-sm text-gray-800 shadow-sm">
        <p>貸与合計: {totalLent.toLocaleString("ja-JP")} 円</p>
        <p>保証料合計（目安）: {totalGuarantee.toLocaleString("ja-JP")} 円</p>
        <p className="text-blue-600">概算振込額（保証考慮）: {approxPayoutSum.toLocaleString("ja-JP")} 円</p>
        <p className="pt-1 text-gray-500">
          固定利率 利子目安: {interestFixed.toLocaleString("ja-JP")} 円 / 返済額 {repaymentWithInterestFixed.toLocaleString("ja-JP")} 円
        </p>
        <p className="text-gray-500">
          見直し利率 利子目安: {interestRevised.toLocaleString("ja-JP")} 円 / 返済額 {repaymentWithInterestRevised.toLocaleString("ja-JP")} 円
        </p>
        <p className="pt-1 text-xs text-amber-700">
          上記の利率計算は簡易モデルです。JASSO公式文書の利率・弁済方法に必ず従ってください。
        </p>
      </div>
    </div>
  );
}
