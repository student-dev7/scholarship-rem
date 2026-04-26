"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useState } from "react";
import { Footer } from "./Footer";

const nav = [
  { href: "/", label: "ホーム" },
  { href: "/simulator", label: "貸与履歴・計算（Simulator）" },
  { href: "/vault", label: "セキュアメモ（Vault）" },
  { href: "/legal-guard", label: "猶予・救済（Legal Guard）" },
  { href: "/settings", label: "設定" },
  { href: "/notification-settings", label: "通知設定" },
] as const;

function DrawerLink({
  href,
  children,
  active,
  onNavigate,
}: {
  href: string;
  children: React.ReactNode;
  active: boolean;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={
        "block rounded-lg px-3 py-2.5 text-sm " +
        (active
          ? "bg-blue-50 font-medium text-blue-600"
          : "text-gray-800 hover:bg-gray-50")
      }
    >
      {children}
    </Link>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const close = useCallback(() => setOpen(false), []);

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="safe-pt sticky top-0 z-20 flex h-14 items-center justify-between border-b border-gray-100 bg-white px-4">
        <Link
          href="/"
          className="text-sm font-semibold text-gray-800"
          onClick={close}
        >
          奨学金リマインダー
        </Link>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-800 transition hover:bg-gray-50"
          aria-label="メニューを開く"
        >
          <Menu className="h-6 w-6" />
        </button>
      </header>

      {open && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/20"
          onClick={close}
          aria-label="メニューを閉じる"
        />
      )}

      <div
        className={
          "safe-pb fixed left-0 top-0 z-40 flex h-full w-[min(20rem,88vw)] flex-col border-r border-gray-100 bg-white shadow-lg transition-transform duration-200 ease-out " +
          (open ? "translate-x-0" : "-translate-x-full")
        }
      >
        <div className="safe-pt flex h-14 items-center border-b border-gray-100 px-4 text-sm font-semibold text-gray-800">
          メニュー
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
          {nav.map((n) => (
            <DrawerLink
              key={n.href}
              href={n.href}
              active={pathname === n.href}
              onNavigate={close}
            >
              {n.label}
            </DrawerLink>
          ))}
        </nav>
      </div>

      <main className="flex-1 px-4 pb-8 pt-2">{children}</main>
      <Footer />
    </div>
  );
}
