"use client";

import { GoogleAuthProvider, signInWithPopup, signOut, type User } from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { isAdminEmail } from "@/lib/adminConfig";
import { getFirebaseAuth, getFirebaseDb, isFirebaseConfigured } from "@/lib/firebase";
import { runPushBroadcastFromAdmin } from "./actions";

const COL = "settings";
const DOC = "app";

function AdminForm() {
  const [reportStart, setReportStart] = useState("");
  const [reportEnd, setReportEnd] = useState("");
  const [continueStart, setContinueStart] = useState("");
  const [continueEnd, setContinueEnd] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pushMsg, setPushMsg] = useState<string | null>(null);

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (!isFirebaseConfigured()) {
      setMsg("Firebase 未設定");
      return;
    }
    const db = getFirebaseDb();
    if (!db) {
      setMsg("Firestore に接続できません");
      return;
    }
    setBusy(true);
    try {
      const ref = doc(db, COL, DOC);
      await setDoc(
        ref,
        {
          reportStart,
          reportEnd,
          continueStart,
          continueEnd,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      setMsg("settings を更新しました。");
      setPushMsg(null);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "保存失敗");
    } finally {
      setBusy(false);
    }
  };

  const onPush = async () => {
    setPushMsg(null);
    setBusy(true);
    try {
      const r = await runPushBroadcastFromAdmin();
      if (r.data?.message) {
        setPushMsg(r.data.message);
      } else {
        setPushMsg(r.error || "未設定");
      }
    } catch (e) {
      setPushMsg(e instanceof Error ? e.message : "エラー");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={onSave}
      className="mt-4 space-y-3 rounded-lg border border-gray-100 bg-white p-4 shadow-sm"
    >
      <h2 className="text-sm font-medium text-gray-800">JASSO 入力期間（全ユーザー共通表示）</h2>
      <label className="block text-xs text-gray-500">
        在籍報告 開始
        <input
          className="mt-0.5 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          type="date"
          value={reportStart}
          onChange={(e) => setReportStart(e.target.value)}
        />
      </label>
      <label className="block text-xs text-gray-500">
        在籍報告 終了
        <input
          className="mt-0.5 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          type="date"
          value={reportEnd}
          onChange={(e) => setReportEnd(e.target.value)}
        />
      </label>
      <label className="block text-xs text-gray-500">
        継続願 開始
        <input
          className="mt-0.5 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          type="date"
          value={continueStart}
          onChange={(e) => setContinueStart(e.target.value)}
        />
      </label>
      <label className="block text-xs text-gray-500">
        継続願 終了
        <input
          className="mt-0.5 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          type="date"
          value={continueEnd}
          onChange={(e) => setContinueEnd(e.target.value)}
        />
      </label>
      {msg && <p className="text-sm text-blue-600">{msg}</p>}
      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-lg bg-gray-800 py-2.5 text-sm font-medium text-white hover:bg-gray-900 disabled:opacity-50"
      >
        更新
      </button>
      <p className="pt-1 text-xs text-gray-500">
        管理 API: <code className="rounded bg-gray-50 px-1">POST /api/send-push</code> に
        <code className="rounded bg-gray-50 px-1">Authorization: Bearer ADMIN_API_SECRET</code>。
        画面の下はサーバアクションで雛形を呼び出し、秘密をクライアントに渡しません。
      </p>
      <button
        type="button"
        onClick={() => void onPush()}
        disabled={busy}
        className="w-full rounded-lg border border-blue-200 bg-blue-50 py-2.5 text-sm font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
      >
        プッシュ一斉送信（雛形・サーバ内処理）
      </button>
      {pushMsg && <p className="text-xs text-gray-600">{pushMsg}</p>}
    </form>
  );
}

export default function AdminSecretPage() {
  const [user, setUser] = useState<User | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setReady(true);
      return;
    }
    const auth = getFirebaseAuth();
    if (!auth) {
      setReady(true);
      return;
    }
    const unsub = auth.onAuthStateChanged((u) => {
      setUser(u);
      setReady(true);
    });
    return () => unsub();
  }, []);

  const onGoogle = async () => {
    setErr(null);
    if (!isFirebaseConfigured()) {
      setErr("Firebase 未設定");
      return;
    }
    const auth = getFirebaseAuth();
    if (!auth) {
      setErr("Auth 初期化失敗");
      return;
    }
    const provider = new GoogleAuthProvider();
    try {
      const cr = await signInWithPopup(auth, provider);
      setUser(cr.user);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "ログイン失敗");
    }
  };

  const onLogout = async () => {
    const auth = getFirebaseAuth();
    if (auth) {
      try {
        await signOut(auth);
      } catch {
        // 
      }
    }
    setUser(null);
  };

  if (!ready) {
    return <p className="text-sm text-gray-500">初期化中…</p>;
  }

  if (!isFirebaseConfigured()) {
    return (
      <p className="text-sm text-amber-800">
        Firebase 環境変数が未設定のため、管理画面は使えません。
      </p>
    );
  }

  const email = user?.email ?? null;
  const admin = isAdminEmail(email);

  return (
    <div className="mx-auto w-full max-w-md space-y-2">
      <h1 className="flex items-center gap-2 text-lg font-semibold text-gray-800">
        <ShieldCheck className="h-5 w-5 text-blue-500" />
        管理（非公開 URL）
      </h1>
      <p className="text-xs text-gray-500">
        Google でログインし、<code className="rounded bg-gray-50 px-1">NEXT_PUBLIC_ADMIN_EMAILS</code>{" "}
        に含まれるメールのみ更新可能です。Firestore ルールで二重に制限してください。
      </p>
      {!user && (
        <button
          type="button"
          onClick={() => void onGoogle()}
          className="w-full rounded-lg bg-white py-2.5 text-sm font-medium text-gray-800 ring-1 ring-gray-200"
        >
          Google でログイン
        </button>
      )}
      {user && (
        <div className="space-y-2 text-sm text-gray-800">
          <p>ログイン: {user.email}</p>
          <button
            type="button"
            onClick={() => void onLogout()}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs"
          >
            ログアウト
          </button>
        </div>
      )}
      {err && <p className="text-sm text-red-600">{err}</p>}
      {user && !admin && (
        <p className="text-sm text-red-600">このアカウントは管理者に登録されていません。</p>
      )}
      {user && admin && <AdminForm />}
    </div>
  );
}
