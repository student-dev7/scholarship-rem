import Link from "next/link";

const disclaimer =
  "大学ごとの正式な締切・手続きを保証するものではありません。表示や通知まわりの誤り・もれによる損害について、開発者は責任を負いかねません。必要な確認は大学等の公式案内で行ってください。";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-gray-100 bg-white px-4 py-6 text-xs leading-relaxed text-gray-600">
      <p className="mb-2 font-medium text-gray-800">免責事項</p>
      <p className="mb-4">{disclaimer}</p>
      <p>
        詳しい通知の設定は{" "}
        <Link href="/notification-settings" className="text-blue-500 underline">
          通知設定
        </Link>
        をご参照ください。
      </p>
    </footer>
  );
}

export function LegalInlineBlock() {
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50/80 p-4 text-xs text-gray-600">
      <p>
        <span className="font-medium text-gray-800">免責: </span>
        {disclaimer}
      </p>
    </div>
  );
}
