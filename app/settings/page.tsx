"use client";

import { LegalInlineBlock } from "@/components/Footer";
import { useLocalData } from "@/hooks/useLocalData";

export default function SettingsPage() {
  const { offsetDays, setOffsetDays, ready } = useLocalData();

  if (!ready) {
    return <p className="text-sm text-gray-500">読み込み中…</p>;
  }

  const shiftLabel =
    offsetDays === 0
      ? "そのまま"
      : offsetDays > 0
        ? `${offsetDays} 日早める`
        : `${-offsetDays} 日遅らせる`;

  return (
    <div className="mx-auto w-full max-w-md space-y-4">
      <h1 className="text-lg font-semibold text-gray-800">設定</h1>
      <div className="space-y-3 rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
        <p className="text-sm text-gray-800">
          ご自身の大学の案内より「もう少し早め／遅め」の目安を知りたいときに使います。
          ホームに載る入力期間と、自動お知らせの目安だけが、スライダーで選んだぶんだけずれます（最大それぞれ30日）。
        </p>
        <label className="block text-sm text-gray-800">
          画面の日程の見え方: {shiftLabel}
          <input
            type="range"
            min={-30}
            max={30}
            className="mt-2 w-full"
            value={offsetDays}
            onChange={(e) => setOffsetDays(Number(e.target.value))}
          />
          <span className="mt-1 block text-xs text-gray-500">
            左に動かすと遅らせ、右に動かすと早めます（最大それぞれ30日）。
          </span>
        </label>
      </div>
      <LegalInlineBlock />
    </div>
  );
}
