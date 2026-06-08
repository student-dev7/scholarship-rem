# 奨学金リマインダー

JASSO（在学届・継続願）の入力期限を思い出すための補助 PWA です。  
**独立行政法人日本学生支援機構（JASSO）およびスカラネット公式とは無関係の個人サイト**です。手続きの期限は大学によって異なる場合があります。正確な情報は、必ずご自身の大学や公式サイトの案内をご確認ください。

## 主な機能

- **ダッシュボード** — 入力期間の参考表示、お知らせが届く日（開始当日・終了前日）
- **通知設定** — Web Push（FCM）の有効化、サーバー経由テスト送信
- **シミュレーター** — 貸与・返還の目安計算（固定 2.722% / 見直し 1.874%）
- **PWA** — ホーム画面への追加、オフラインキャッシュ（本番ビルド時）

## 技術スタック

- Next.js 15（App Router）
- Firebase（Auth / Firestore / Cloud Messaging）
- Tailwind CSS
- Vercel（ホスティング・Cron）

## セットアップ

### 1. 依存関係

```bash
npm install
```

### 2. 環境変数

`.env.example` をコピーして `.env.local` を作成し、値を埋めます。

```bash
cp .env.example .env.local   # Windows: copy .env.example .env.local
```

| 変数 | 用途 |
|------|------|
| `NEXT_PUBLIC_FIREBASE_*` | クライアント用 Firebase 設定 |
| `NEXT_PUBLIC_FIREBASE_VAPID_KEY` | Web プッシュ（FCM トークン取得） |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | サーバー送信（JSON を **1行** で貼り付け） |
| `ADMIN_API_SECRET` | Cron / `POST /api/send-push` の Bearer 秘密鍵 |

本番（Vercel）でも同じ変数を Environment Variables に設定してください。

**サービスアカウント JSON の1行化（例）:**

```bash
node -e "console.log(JSON.stringify(require('./path/to/service-account.json')))"
```

### 3. Firestore ルール

`firestore.rules` を Firebase コンソール → Firestore → ルール に貼り付けて公開してください。  
`settings/app` の期限は Firebase コンソールから編集してください（アプリからの書き込みは不可）。

### 4. 開発サーバー

```bash
npm run dev
```

http://localhost:3000 で開きます。

## PWA アイコンの差し替え

1. 次のいずれかを `public/icons/custom/` に置く  
   - `icon-192x192.png` と `icon-512x512.png`  
   - または `source.png`（512px 以上の正方形）
2. 反映:

```bash
npm run icons:apply
```

`public/icons/icon-*.png` がマニフェスト・Apple タッチアイコン・通知アイコンに使われます。

## プッシュ通知

1. **ホーム画面に追加**（特に iPhone は Safari から追加後、アイコンから起動）
2. **通知設定** で「通知を有効化」
3. 「サーバー経由でテスト通知」で動作確認

自動リマインダーは Vercel Cron（`vercel.json`: 毎日 15:00 UTC ≒ JST 0:00）が `/api/send-push` を呼び、**開始当日**と**終了前日**に該当する場合のみ送信します。

## アクセス解析（Vercel + Firebase）

- Vercel Analytics は `@vercel/analytics` を導入済みです。
- Firebase で見る場合は、`.env.local` / Vercel 環境変数に `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` を設定してください。
- 設定後、Firebase Console の **Analytics > Realtime** で訪問状況を確認できます（反映まで数分かかることがあります）。

## スクリプト

| コマンド | 説明 |
|----------|------|
| `npm run dev` | 開発サーバー |
| `npm run build` | 本番ビルド |
| `npm run start` | 本番サーバー起動 |
| `npm run lint` | ESLint |
| `npm run icons:apply` | カスタムアイコンを `public/icons/` に反映 |
| `npm run monitor` | 外部サイト監視（`DISCORD_WEBHOOK_URL` 要） |

## ディレクトリ構成（抜粋）

```
app/                    # ページ・API Routes
  api/                  # send-push, push-test-self, firebase-public-config
  notification-settings/
components/
hooks/
lib/                    # Firebase Admin, FCM, JASSO 計算・リマインダー
public/
  manifest.json
  firebase-messaging-sw.js
  icons/
firestore.rules         # Firebase コンソール用
```

## デプロイ（Vercel）

1. GitHub リポジトリを Vercel に接続
2. 環境変数を設定（特に `FIREBASE_SERVICE_ACCOUNT_JSON`）
3. `CRON_SECRET` を Vercel に追加し、値を `ADMIN_API_SECRET` と同じにする
4. `main` へ push で自動デプロイ

## 注意

- 奨学生番号・口座番号などは **localStorage のみ**（Firestore には送りません）
- サービアカウント JSON や `.env.local` を Git にコミットしないでください

## ライセンス

Private（個人利用想定）
