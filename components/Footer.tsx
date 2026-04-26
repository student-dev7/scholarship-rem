import Link from "next/link";

const disclaimer =
  "本サービスはJASSOの全体期間を通知するものであり、個別の大学が定める締切を保証するものではありません。情報の相違により生じた一切の損害について、開発者は責任を負いかねます。必ず自身の大学の公式案内を確認してください。";

const tos =
  "通信環境や端末の設定、LocalStorageのキャッシュ削除等により通知が届かない、またはデータが消失した場合の申請遅延について、開発者は一切の法的責任を負いません。本アプリの計算結果は概算であり、JASSO公式の通知が優先されます。";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-gray-100 bg-white px-4 py-6 text-xs leading-relaxed text-gray-600">
      <p className="mb-2 font-medium text-gray-800">免責事項</p>
      <p className="mb-4">{disclaimer}</p>
      <p className="mb-2 font-medium text-gray-800">利用規約（要約）</p>
      <p className="mb-4">{tos}</p>
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
      <p className="mb-2">
        <span className="font-medium text-gray-800">免責: </span>
        {disclaimer}
      </p>
      <p>
        <span className="font-medium text-gray-800">利用規約（要約）: </span>
        {tos}
      </p>
    </div>
  );
}
