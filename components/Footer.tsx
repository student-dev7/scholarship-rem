import Link from "next/link";

const disclaimer =
  "当サイトは、独立行政法人日本学生支援機構（JASSO）およびスカラネット公式とは無関係の個人サイトです。手続きの期限は大学によって異なる場合があります。正確な情報は、必ずご自身の大学や公式サイトの案内をご確認ください。";

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
