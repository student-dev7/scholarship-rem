"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { useLocalData } from "@/hooks/useLocalData";

export default function VaultPage() {
  const { data, patch, ready } = useLocalData();
  const [showSch, setShowSch] = useState(false);
  const [showAcc, setShowAcc] = useState(false);

  if (!ready) {
    return <p className="text-sm text-gray-500">読み込み中…</p>;
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-4">
      <h1 className="text-lg font-semibold text-gray-800">セキュアメモ</h1>
      <p className="text-xs text-gray-500">
        奨学生番号・口座番号はブラウザの LocalStorage のみに保存し、ネットワークへ送信しません。機種変更前に手元で控えを取ってください。
      </p>
      <div className="space-y-3 rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
        <div>
          <label className="text-xs text-gray-500">奨学生番号</label>
          <div className="relative">
            <input
              className="mt-0.5 w-full rounded-lg border border-gray-200 px-3 py-2 pr-10 text-sm"
              type={showSch ? "text" : "password"}
              value={data.scholarshipNumber}
              onChange={(e) => patch({ scholarshipNumber: e.target.value })}
              autoComplete="off"
            />
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500"
              onClick={() => setShowSch((s) => !s)}
              aria-label={showSch ? "奨学生番号を隠す" : "奨学生番号を表示"}
            >
              {showSch ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <div>
          <label className="text-xs text-gray-500">口座番号</label>
          <div className="relative">
            <input
              className="mt-0.5 w-full rounded-lg border border-gray-200 px-3 py-2 pr-10 text-sm"
              type={showAcc ? "text" : "password"}
              value={data.accountNumber}
              onChange={(e) => patch({ accountNumber: e.target.value })}
              autoComplete="off"
            />
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500"
              onClick={() => setShowAcc((s) => !s)}
              aria-label={showAcc ? "口座番号を隠す" : "口座番号を表示"}
            >
              {showAcc ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <div>
          <label className="text-xs text-gray-500">個人メモ</label>
          <textarea
            className="mt-0.5 min-h-24 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            value={data.memo}
            onChange={(e) => patch({ memo: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}
