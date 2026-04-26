"use client";

import { Shield } from "lucide-react";
import { useMemo, useState } from "react";
import { LegalInlineBlock } from "@/components/Footer";

const INCOME_CUT = 3_000_000;

export default function LegalGuardPage() {
  const [income, setIncome] = useState("");

  const n = useMemo(() => {
    const v = Number(String(income).replace(/,/g, ""));
    return Number.isFinite(v) ? v : NaN;
  }, [income]);

  const { deferHint, reduceHint, note } = useMemo(() => {
    if (!Number.isFinite(n)) {
      return {
        deferHint: "年収（見込可）を入力してください。",
        reduceHint: "—",
        note: "国の減額返還・猶予は、所得・就職状況・採用年度等の要件によります。以下は学習用の大まか目安に過ぎません。",
      };
    }
    const under = n < INCOME_CUT;
    return {
      deferHint: under
        ? "所得面では「期間定めた返還期限の猶予」等の制度説明上の枠内で検討可能になることがあり得ます。必須審査・書類申請の対象外もあり得ます（参考情報のため、公式要項で確認のこと）。"
        : "提示した試算上は高所得帯のため、猶予等の要諦は公式の年収帯表で確認のこと。",
      reduceHint: under
        ? "年収帯上「減額返還（例: 5年・10年弁済）」の枠内で扱いが説明され得る場合がある一方、審査・承認が必要です。自己判断により申し込みが必要です（参考の簡易表示）。"
        : "上記帯向け減額弁済の要諦はJASSO最新の要項に従ってください。",
      note: "審理・更新・例外事由はJASSOが定めるとおり。本診断は法務上の意見を表明するものではありません。最終的には必ずJASSO・大学窓口に相談してください。",
    };
  }, [n]);

  return (
    <div className="mx-auto w-full max-w-md space-y-4">
      <h1 className="flex items-center gap-2 text-lg font-semibold text-gray-800">
        <Shield className="h-5 w-5 text-blue-500" />
        猶予・救済（参考）
      </h1>
      <LegalInlineBlock />
      <div className="space-y-2 rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
        <label className="text-sm text-gray-800">
          年収（円/年）の目安
          <input
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            value={income}
            onChange={(e) => setIncome(e.target.value)}
            inputMode="numeric"
            placeholder="例: 2000000"
          />
        </label>
        <p className="text-sm text-gray-800">
          減額返還（参考目安）: {reduceHint}
        </p>
        <p className="text-sm text-gray-800">返還猶予（参考目安）: {deferHint}</p>
        <p className="text-xs text-gray-500">{note}</p>
      </div>
    </div>
  );
}
