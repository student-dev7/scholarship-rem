"use client";

import { useLocalData } from "@/hooks/useLocalData";
import { LegalInlineBlock } from "@/components/Footer";

export default function SettingsPage() {
  const { offsetDays, setOffsetDays, ready } = useLocalData();

  if (!ready) {
    return <p className="text-sm text-gray-500">読み込み中…</p>;
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-4">
      <h1 className="text-lg font-semibold text-gray-800">設定</h1>
      <div className="space-y-3 rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
        <p className="text-sm text-gray-800">
          大学の独自の締切が JASSO 表記より前倒しの場合、ダッシュボード上の「期限からの 7 日前/前日」基準の日付を
          最大 0〜30 日、早めるオフセット（日数）に応じて調整します（表示・通知雛形の前倒し用）。
        </p>
        <label className="block text-sm text-gray-800">
          前倒し日数: {offsetDays} 日
          <input
            type="range"
            min={0}
            max={30}
            className="mt-2 w-full"
            value={offsetDays}
            onChange={(e) => setOffsetDays(Number(e.target.value))}
          />
        </label>
      </div>
      <LegalInlineBlock />
    </div>
  );
}
