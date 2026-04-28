"use client";

import { JASSO_SETTINGS, calcRepayment } from "@/lib/jassoCalc";
import { GitCompare, HeartHandshake, Info, Wallet } from "lucide-react";
import { type Dispatch, type SetStateAction, useEffect, useMemo, useState } from "react";

const { RATES, RATE_CAP } = JASSO_SETTINGS;
const SIMULATOR_STORAGE_KEY = "scholarship-simulator-v2";

type YearMonth = {
  year: number;
  month: number;
};

type LoanHistory = {
  id: string;
  start: YearMonth;
  end: YearMonth;
  monthlyAmount: number; // 万円
};

type StoredData = {
  t1Histories: LoanHistory[];
  t2Histories: LoanHistory[];
  rateMode: "fixed" | "floating";
};

const now = new Date();
const currentYm: YearMonth = { year: now.getFullYear(), month: now.getMonth() + 1 };
const YEAR_OPTIONS = Array.from({ length: 21 }, (_, i) => currentYm.year - 10 + i);
const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => i + 1);

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function toMonthIndex(v: YearMonth) {
  return v.year * 12 + (v.month - 1);
}

function fromMonthIndex(n: number): YearMonth {
  const year = Math.floor(n / 12);
  const month = (n % 12) + 1;
  return { year, month };
}

function isValidYm(v: unknown): v is YearMonth {
  if (!v || typeof v !== "object") return false;
  const t = v as Partial<YearMonth>;
  return (
    typeof t.year === "number" &&
    Number.isInteger(t.year) &&
    typeof t.month === "number" &&
    Number.isInteger(t.month) &&
    t.month >= 1 &&
    t.month <= 12
  );
}

function sanitizeHistory(v: unknown): LoanHistory | null {
  if (!v || typeof v !== "object") return null;
  const t = v as Partial<LoanHistory>;
  if (typeof t.id !== "string" || !isValidYm(t.start) || !isValidYm(t.end)) return null;
  const monthlyAmount =
    typeof t.monthlyAmount === "number" && Number.isFinite(t.monthlyAmount)
      ? Math.max(0, t.monthlyAmount)
      : 0;
  const start = t.start;
  const end = t.end;
  if (toMonthIndex(start) > toMonthIndex(end)) {
    return { id: t.id, start: end, end: start, monthlyAmount };
  }
  return { id: t.id, start, end, monthlyAmount };
}

function makeId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `h-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createHistory(start: YearMonth, monthlyAmount: number): LoanHistory {
  return {
    id: makeId(),
    start,
    end: start,
    monthlyAmount,
  };
}

function getNextStart(histories: LoanHistory[]) {
  const last = histories[histories.length - 1];
  if (!last) return currentYm;
  return fromMonthIndex(toMonthIndex(last.end) + 1);
}

function getMonths(start: YearMonth, end: YearMonth) {
  const s = toMonthIndex(start);
  const e = toMonthIndex(end);
  if (e < s) return 0;
  return e - s + 1;
}

export default function SimulatorPage() {
  const [t1Histories, setT1Histories] = useState<LoanHistory[]>([
    createHistory(currentYm, 4),
  ]);
  const [t2Histories, setT2Histories] = useState<LoanHistory[]>([
    createHistory(currentYm, 4),
  ]);
  const [rateMode, setRateMode] = useState<"fixed" | "floating">("fixed");
  const [startAge, setStartAge] = useState(22);
  const [takeHome, setTakeHome] = useState(200_000);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SIMULATOR_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<StoredData>;
      const nextT1 = Array.isArray(parsed.t1Histories)
        ? parsed.t1Histories.map(sanitizeHistory).filter((v): v is LoanHistory => Boolean(v))
        : [];
      const nextT2 = Array.isArray(parsed.t2Histories)
        ? parsed.t2Histories.map(sanitizeHistory).filter((v): v is LoanHistory => Boolean(v))
        : [];
      if (nextT1.length > 0) setT1Histories(nextT1);
      if (nextT2.length > 0) setT2Histories(nextT2);
      if (parsed.rateMode === "fixed" || parsed.rateMode === "floating") {
        setRateMode(parsed.rateMode);
      }
    } catch {
      // ignore broken data
    }
  }, []);

  useEffect(() => {
    const payload: StoredData = { t1Histories, t2Histories, rateMode };
    try {
      localStorage.setItem(SIMULATOR_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // ignore storage issues
    }
  }, [t1Histories, t2Histories, rateMode]);

  const t1Months = useMemo(
    () => t1Histories.reduce((sum, h) => sum + getMonths(h.start, h.end), 0),
    [t1Histories]
  );
  const t1Total = useMemo(
    () =>
      t1Histories.reduce(
        (sum, h) => sum + Math.round(h.monthlyAmount * 10_000) * getMonths(h.start, h.end),
        0
      ),
    [t1Histories]
  );
  const t2Total = useMemo(
    () =>
      t2Histories.reduce(
        (sum, h) => sum + Math.round(h.monthlyAmount * 10_000) * getMonths(h.start, h.end),
        0
      ),
    [t2Histories]
  );
  const grandTotal = t1Total + t2Total;

  const r1 = useMemo(() => calcRepayment(t1Total, 0), [t1Total]);
  const r2Fixed = useMemo(() => calcRepayment(t2Total, RATES.FIXED), [t2Total]);
  const r2Float = useMemo(() => calcRepayment(t2Total, RATES.FLOATING), [t2Total]);

  const r2Active = rateMode === "fixed" ? r2Fixed : r2Float;
  const combinedMonthly = r1.monthly + r2Active.monthly;
  const interestDiff = r2Fixed.interest - r2Float.interest;
  const totalPayDiff = r2Fixed.total - r2Float.total;

  const ratio =
    takeHome > 0 ? Math.min(100, (combinedMonthly / takeHome) * 100) : 0;
  const warnRatio = ratio > 10;

  const endAge1 = t1Total > 0 && r1.times > 0 ? startAge + r1.years : null;
  const endAge2 = t2Total > 0 && r2Active.times > 0 ? startAge + r2Active.years : null;
  const laterEndAge =
    endAge1 != null && endAge2 != null
      ? Math.max(endAge1, endAge2)
      : endAge1 ?? endAge2;

  const updateHistory = (
    setter: Dispatch<SetStateAction<LoanHistory[]>>,
    id: string,
    patch: Partial<LoanHistory>
  ) => {
    setter((prev) =>
      prev.map((h) => {
        if (h.id !== id) return h;
        const next = { ...h, ...patch };
        const startIdx = toMonthIndex(next.start);
        const endIdx = toMonthIndex(next.end);
        if (startIdx > endIdx) {
          if (patch.start) {
            next.end = next.start;
          } else {
            next.start = next.end;
          }
        }
        next.monthlyAmount = Math.max(0, Number(next.monthlyAmount) || 0);
        return next;
      })
    );
  };

  const removeHistoryById = (
    setter: Dispatch<SetStateAction<LoanHistory[]>>,
    id: string,
    fallbackAmount: number
  ) => {
    setter((prev) => {
      const next = prev.filter((h) => h.id !== id);
      return next.length > 0 ? next : [createHistory(currentYm, fallbackAmount)];
    });
  };

  return (
    <div className="mx-auto w-full max-w-lg space-y-5 pb-8">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">奨学金 返済シミュ</h1>
        <p className="mt-1 text-xs leading-relaxed text-gray-500">
          第一種（無利子）の貸与額と、第二種（有利子）の目安利率で月々の返済を試算します。貸与総額に応じ
          て返済回数は 108 回（9年）／156回／180回／240回（20年）に区分されます（JASSOの審定に従います）。
        </p>
      </div>

      {/* 第一種 */}
      <section className="rounded-2xl border border-emerald-100/80 bg-gradient-to-br from-emerald-50/90 to-white p-4 shadow-sm">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-emerald-900">
          <HeartHandshake className="h-4 w-4 shrink-0" />
          第一種（無利子）貸与
        </h2>
        <div className="space-y-3">
          {t1Histories.map((h, i) => {
            const months = getMonths(h.start, h.end);
            return (
              <div key={h.id} className="rounded-xl border border-emerald-200/80 bg-white/70 p-3">
                <p className="mb-2 text-xs font-medium text-emerald-900">履歴 {i + 1}</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="text-xs text-gray-600">
                    月額（万円）
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        type="range"
                        min={0}
                        max={20}
                        step={0.1}
                        value={h.monthlyAmount}
                        onChange={(e) =>
                          updateHistory(setT1Histories, h.id, {
                            monthlyAmount: Math.max(0, Number(e.target.value) || 0),
                          })
                        }
                        className="w-full accent-emerald-600"
                      />
                      <input
                        type="number"
                        min={0}
                        step={0.1}
                        value={h.monthlyAmount}
                        onChange={(e) =>
                          updateHistory(setT1Histories, h.id, {
                            monthlyAmount: Math.max(0, Number(e.target.value) || 0),
                          })
                        }
                        className="w-24 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm"
                      />
                      <span className="text-xs text-gray-500">万円</span>
                    </div>
                  </label>
                  <div className="text-xs text-gray-600">
                    期間
                    <div className="mt-1 grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <p>開始</p>
                        <div className="flex gap-1">
                          <select
                            className="w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm"
                            value={h.start.year}
                            onChange={(e) =>
                              updateHistory(setT1Histories, h.id, {
                                start: { ...h.start, year: Number(e.target.value) },
                              })
                            }
                          >
                            {YEAR_OPTIONS.map((y) => (
                              <option key={`t1-sy-${h.id}-${y}`} value={y}>
                                {y}年
                              </option>
                            ))}
                          </select>
                          <select
                            className="w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm"
                            value={h.start.month}
                            onChange={(e) =>
                              updateHistory(setT1Histories, h.id, {
                                start: { ...h.start, month: Number(e.target.value) },
                              })
                            }
                          >
                            {MONTH_OPTIONS.map((m) => (
                              <option key={`t1-sm-${h.id}-${m}`} value={m}>
                                {m}月
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p>終了</p>
                        <div className="flex gap-1">
                          <select
                            className="w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm"
                            value={h.end.year}
                            onChange={(e) =>
                              updateHistory(setT1Histories, h.id, {
                                end: { ...h.end, year: Number(e.target.value) },
                              })
                            }
                          >
                            {YEAR_OPTIONS.map((y) => (
                              <option key={`t1-ey-${h.id}-${y}`} value={y}>
                                {y}年
                              </option>
                            ))}
                          </select>
                          <select
                            className="w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm"
                            value={h.end.month}
                            onChange={(e) =>
                              updateHistory(setT1Histories, h.id, {
                                end: { ...h.end, month: Number(e.target.value) },
                              })
                            }
                          >
                            {MONTH_OPTIONS.map((m) => (
                              <option key={`t1-em-${h.id}-${m}`} value={m}>
                                {m}月
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  {h.monthlyAmount.toLocaleString("ja-JP")} 万円 × {months} ヶ月 ={" "}
                  {(Math.round(h.monthlyAmount * 10_000) * months).toLocaleString("ja-JP")} 円
                </p>
                <button
                  type="button"
                  onClick={() => removeHistoryById(setT1Histories, h.id, 4)}
                  className="mt-2 rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] text-gray-600 hover:bg-gray-50"
                >
                  この履歴を削除
                </button>
              </div>
            );
          })}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() =>
                setT1Histories((prev) => [...prev, createHistory(getNextStart(prev), 0)])
              }
              className="rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-medium text-emerald-900 hover:bg-emerald-50"
            >
              履歴を追加
            </button>
          </div>
        </div>
        <p className="mt-3 text-sm text-gray-800">
          貸与合計:{" "}
          <span className="font-semibold tabular-nums">
            {t1Total.toLocaleString("ja-JP")} 円
          </span>
          <span className="text-gray-500">（{t1Months} ヶ月分）</span>
        </p>
      </section>

      {/* 第二種 */}
      <section className="rounded-2xl border border-sky-100/80 bg-gradient-to-br from-sky-50/90 to-white p-4 shadow-sm">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-sky-900">
          <Wallet className="h-4 w-4 shrink-0" />
          第二種（有利子）貸与
        </h2>
        <div className="space-y-3">
          {t2Histories.map((h, i) => {
            const months = getMonths(h.start, h.end);
            return (
              <div key={h.id} className="rounded-xl border border-sky-200/80 bg-white/70 p-3">
                <p className="mb-2 text-xs font-medium text-sky-900">履歴 {i + 1}</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="text-xs text-gray-600">
                    月額（万円）
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        type="range"
                        min={0}
                        max={20}
                        step={1}
                        value={h.monthlyAmount}
                        onChange={(e) =>
                          updateHistory(setT2Histories, h.id, {
                            monthlyAmount: Math.max(0, Number(e.target.value) || 0),
                          })
                        }
                        className="w-full accent-sky-600"
                      />
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={h.monthlyAmount}
                        onChange={(e) =>
                          updateHistory(setT2Histories, h.id, {
                            monthlyAmount: Math.max(0, Number(e.target.value) || 0),
                          })
                        }
                        className="w-24 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm"
                      />
                      <span className="text-xs text-gray-500">万円</span>
                    </div>
                  </label>
                  <div className="text-xs text-gray-600">
                    期間
                    <div className="mt-1 grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <p>開始</p>
                        <div className="flex gap-1">
                          <select
                            className="w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm"
                            value={h.start.year}
                            onChange={(e) =>
                              updateHistory(setT2Histories, h.id, {
                                start: { ...h.start, year: Number(e.target.value) },
                              })
                            }
                          >
                            {YEAR_OPTIONS.map((y) => (
                              <option key={`t2-sy-${h.id}-${y}`} value={y}>
                                {y}年
                              </option>
                            ))}
                          </select>
                          <select
                            className="w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm"
                            value={h.start.month}
                            onChange={(e) =>
                              updateHistory(setT2Histories, h.id, {
                                start: { ...h.start, month: Number(e.target.value) },
                              })
                            }
                          >
                            {MONTH_OPTIONS.map((m) => (
                              <option key={`t2-sm-${h.id}-${m}`} value={m}>
                                {m}月
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p>終了</p>
                        <div className="flex gap-1">
                          <select
                            className="w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm"
                            value={h.end.year}
                            onChange={(e) =>
                              updateHistory(setT2Histories, h.id, {
                                end: { ...h.end, year: Number(e.target.value) },
                              })
                            }
                          >
                            {YEAR_OPTIONS.map((y) => (
                              <option key={`t2-ey-${h.id}-${y}`} value={y}>
                                {y}年
                              </option>
                            ))}
                          </select>
                          <select
                            className="w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm"
                            value={h.end.month}
                            onChange={(e) =>
                              updateHistory(setT2Histories, h.id, {
                                end: { ...h.end, month: Number(e.target.value) },
                              })
                            }
                          >
                            {MONTH_OPTIONS.map((m) => (
                              <option key={`t2-em-${h.id}-${m}`} value={m}>
                                {m}月
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  {h.monthlyAmount.toLocaleString("ja-JP")} 万円 × {months} ヶ月 ={" "}
                  {(Math.round(h.monthlyAmount * 10_000) * months).toLocaleString("ja-JP")} 円
                </p>
                <button
                  type="button"
                  onClick={() => removeHistoryById(setT2Histories, h.id, 4)}
                  className="mt-2 rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] text-gray-600 hover:bg-gray-50"
                >
                  この履歴を削除
                </button>
              </div>
            );
          })}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() =>
                setT2Histories((prev) => [...prev, createHistory(getNextStart(prev), 0)])
              }
              className="rounded-lg border border-sky-300 bg-white px-3 py-1.5 text-xs font-medium text-sky-900 hover:bg-sky-50"
            >
              履歴を追加
            </button>
          </div>
        </div>
        <p className="text-sm text-gray-800">
          貸与合計:{" "}
          <span className="font-semibold tabular-nums">
            {t2Total.toLocaleString("ja-JP")} 円
          </span>
        </p>

        <p className="mb-2 mt-4 text-xs font-medium text-gray-700">利率方式</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setRateMode("fixed")}
            className={
              "rounded-xl border-2 py-2.5 text-sm font-medium transition " +
              (rateMode === "fixed"
                ? "border-sky-500 bg-sky-100 text-sky-900"
                : "border-gray-200 bg-white text-gray-700 hover:border-sky-200")
            }
          >
            固定（目安 {(RATES.FIXED * 100).toFixed(3)}%）
            <span className="mt-0.5 block text-[10px] font-normal text-gray-500">
              安心
            </span>
          </button>
          <button
            type="button"
            onClick={() => setRateMode("floating")}
            className={
              "rounded-xl border-2 py-2.5 text-sm font-medium transition " +
              (rateMode === "floating"
                ? "border-sky-500 bg-sky-100 text-sky-900"
                : "border-gray-200 bg-white text-gray-700 hover:border-sky-200")
            }
          >
            見直し（目安 {(RATES.FLOATING * 100).toFixed(3)}%）
            <span className="mt-0.5 block text-[10px] font-normal text-gray-500">
              割安
            </span>
          </button>
        </div>
        <p className="mt-2 text-[11px] text-amber-800/90">
          第二種の上限金利は {RATE_CAP * 100}% です。ここでは目安の固定・見直し利率のみ使用します。
        </p>
      </section>

      {/* 前提 */}
      <section className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <h2 className="mb-2 text-sm font-medium text-gray-800">返済負担の目安</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs text-gray-500">
            返済開始の年齢（目安）
            <input
              type="number"
              min={16}
              max={80}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              value={startAge}
              onChange={(e) => setStartAge(clamp(parseInt(e.target.value, 10) || 22, 16, 80))}
            />
          </label>
          <label className="text-xs text-gray-500">
            新卒の月手取り（比較用・円）
            <input
              type="number"
              min={0}
              step={10000}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              value={takeHome}
              onChange={(e) =>
                setTakeHome(Math.max(0, parseInt(e.target.value, 10) || 0))
              }
            />
          </label>
        </div>
      </section>

      {/* メインの結果 */}
      <section className="rounded-2xl border-2 border-gray-200 bg-gradient-to-b from-white to-gray-50/80 p-5 shadow-md">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
          合計（第一種＋第二種）月々の返済額
        </p>
        <p
          className="mt-1 break-all text-4xl font-extrabold tabular-nums text-gray-900"
          style={{ fontFeatureSettings: '"tnum"' }}
        >
          {combinedMonthly.toLocaleString("ja-JP")}
          <span className="ml-1 text-2xl font-bold">円</span>
        </p>
        <p className="mt-1 text-sm text-gray-500">
          第一種: {r1.monthly.toLocaleString("ja-JP")} 円 ＋ 第二種（
          {rateMode === "fixed" ? "固定" : "見直し"}）: {r2Active.monthly.toLocaleString("ja-JP")} 円
        </p>
        <p className="mt-3 text-sm text-gray-700">
          借入合計:{" "}
          <span className="font-semibold tabular-nums">
            {grandTotal.toLocaleString("ja-JP")} 円
          </span>
        </p>
        {laterEndAge != null && (
          <p className="mt-2 text-sm text-sky-800">
            完済の目安年齢: <span className="font-bold">{laterEndAge.toFixed(1)} 歳</span>
            （遅い方の返済期間に基づく目安）
          </p>
        )}
      </section>

      {/* 手取り比 */}
      <section className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <h2 className="mb-2 text-sm font-medium text-gray-800">月手取りに占める返済</h2>
        <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
          <div
            className={
              "h-full rounded-full transition-all " +
              (warnRatio ? "bg-amber-500" : "bg-sky-500")
            }
            style={{ width: `${ratio}%` }}
          />
        </div>
        <p
          className={
            "mt-2 text-sm " + (warnRatio ? "font-medium text-amber-800" : "text-gray-600")
          }
        >
          約 {ratio.toFixed(1)}%
          {warnRatio && "（手取りの10%超の目安で注意色）"}
        </p>
      </section>

      {/* タイムライン */}
      <section className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-medium text-gray-800">完済年齢の内訳</h2>
        <ul className="space-y-2 text-sm text-gray-700">
          <li className="flex justify-between gap-2 border-b border-gray-50 pb-2">
            <span>第一種（{r1.times} 回・約{(r1.years).toFixed(1)} 年）</span>
            <span className="shrink-0 font-medium tabular-nums">
              {t1Total > 0 && endAge1 != null
                ? `約 ${endAge1.toFixed(1)} 歳`
                : "—"}
            </span>
          </li>
          <li className="flex justify-between gap-2">
            <span>
              第二種（{r2Active.times} 回・約{(r2Active.years).toFixed(1)} 年・
              {rateMode === "fixed" ? "固定" : "見直し"}）
            </span>
            <span className="shrink-0 font-medium tabular-nums">
              {t2Total > 0 && endAge2 != null
                ? `約 ${endAge2.toFixed(1)} 歳`
                : "—"}
            </span>
          </li>
        </ul>
        <p className="mt-2 text-xs text-gray-500">
          ライフプラン（就職・結婚・出産など）と重ねてイメージしてください。数値はあくまでシミュレーションです。
        </p>
      </section>

      {/* 固定 vs 見直し（第二種） */}
      <section className="rounded-2xl border border-violet-100 bg-violet-50/40 p-4 shadow-sm">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-violet-900">
          <GitCompare className="h-4 w-4" />
          第二種: 固定 vs 見直し（比較）
        </h2>
        <p className="mb-2 text-xs text-gray-600">
          第一種分は同じ。差は第二種の利息・総支払に表れます。
        </p>
        <div className="overflow-x-auto rounded-lg border border-violet-100/80 bg-white">
          <table className="w-full min-w-[280px] text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs text-gray-500">
                <th className="px-3 py-2 font-medium">区分</th>
                <th className="px-3 py-2 font-medium">固定 {(RATES.FIXED * 100).toFixed(3)}%</th>
                <th className="px-3 py-2 font-medium">見直し {(RATES.FLOATING * 100).toFixed(3)}%</th>
                <th className="px-3 py-2 font-medium">差額</th>
              </tr>
            </thead>
            <tbody className="tabular-nums text-gray-800">
              <tr className="border-b border-gray-50">
                <td className="px-3 py-2.5">総返済額</td>
                <td className="px-3 py-2.5">
                  {t2Total > 0 ? r2Fixed.total.toLocaleString("ja-JP") : "—"} 円
                </td>
                <td className="px-3 py-2.5">
                  {t2Total > 0 ? r2Float.total.toLocaleString("ja-JP") : "—"} 円
                </td>
                <td className="px-3 py-2.5 font-medium text-violet-900">
                  {t2Total > 0 ? totalPayDiff.toLocaleString("ja-JP") : "—"} 円
                </td>
              </tr>
              <tr>
                <td className="px-3 py-2.5">うち利子</td>
                <td className="px-3 py-2.5">
                  {t2Total > 0 ? r2Fixed.interest.toLocaleString("ja-JP") : "—"} 円
                </td>
                <td className="px-3 py-2.5">
                  {t2Total > 0 ? r2Float.interest.toLocaleString("ja-JP") : "—"} 円
                </td>
                <td className="px-3 py-2.5 font-medium text-violet-900">
                  {t2Total > 0 ? interestDiff.toLocaleString("ja-JP") : "—"} 円
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        {t2Total > 0 && (
          <p className="mt-2 text-sm text-violet-900">
            月額＋第一種: 固定なら
            <span className="mx-1 font-semibold tabular-nums">
              {(r1.monthly + r2Fixed.monthly).toLocaleString("ja-JP")}
            </span>
            円 / 見直しなら
            <span className="mx-1 font-semibold tabular-nums">
              {(r1.monthly + r2Float.monthly).toLocaleString("ja-JP")}
            </span>
            円
          </p>
        )}
      </section>

      <p className="flex gap-2 rounded-lg border border-amber-200/80 bg-amber-50/80 p-3 text-xs text-amber-950">
        <Info className="h-4 w-4 shrink-0 text-amber-700" />
        学内申請・在籍年数・実際の利率（上限 {RATE_CAP * 100}% など）は JASSO・学校の案内を必ず優先してください。この画面は学習・試算用です。
      </p>
    </div>
  );
}
