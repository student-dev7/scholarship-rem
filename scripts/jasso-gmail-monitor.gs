/**
 * @JASSO_general の X メール通知を Gmail で監視し、条件一致時に POST /api/send-push へ送る。
 *
 * セットアップ:
 * 1. 専用 Gmail + 専用 X（@JASSO_general のみフォロー、メール通知 ON）
 * 2. script.google.com でこのファイルの内容を新規プロジェクトに貼り付け
 * 3. プロジェクト設定 → スクリプト プロパティ:
 *    - ADMIN_API_SECRET … Vercel の ADMIN_API_SECRET と同じ値
 *    - PUSH_API_URL … 省略可（既定: https://scholarship-rem.vercel.app/api/send-push）
 *    - SITE_URL … 省略可（既定: https://scholarship-rem.vercel.app）
 * 4. setupTrigger() を1回実行 → 5分おきの時間主導トリガーを登録
 * 5. 通知設定ページで各端末の FCM トークン登録が必要
 */

const DEFAULT_SITE_URL = "https://scholarship-rem.vercel.app";
const DEFAULT_PUSH_API_URL = DEFAULT_SITE_URL + "/api/send-push";
const GMAIL_QUERY = "from:(twitter.com OR x.com) is:unread newer_than:1d";
const MAX_THREADS = 10;

/** 検知パターン（上から順に評価。先に一致したものを採用） */
const JASSO_PATTERNS = [
  {
    id: "zaiseki-start",
    match: function (text) {
      return text.includes("#在籍報告") && text.includes("開始");
    },
    notification: function (siteUrl) {
      return {
        title: "在籍報告が開始されました",
        body: "@JASSO_general が在籍報告の開始を告知しました",
        link: siteUrl + "/",
      };
    },
  },
  {
    id: "keizoku-input",
    match: function (text) {
      return (
        text.includes("#奨学金継続願") &&
        text.includes("入力する必要があります")
      );
    },
    notification: function (siteUrl) {
      return {
        title: "奨学金継続願の入力が必要です",
        body: "@JASSO_general が継続願の入力開始を告知しました",
        link: siteUrl + "/",
      };
    },
  },
];

function getConfig_() {
  const props = PropertiesService.getScriptProperties();
  const secret = props.getProperty("ADMIN_API_SECRET");
  const siteUrl = (
    props.getProperty("SITE_URL") || DEFAULT_SITE_URL
  ).replace(/\/$/, "");
  const pushApiUrl = props.getProperty("PUSH_API_URL") || DEFAULT_PUSH_API_URL;
  return { secret: secret, siteUrl: siteUrl, pushApiUrl: pushApiUrl };
}

function normalizeMailText_(msg) {
  return (msg.getSubject() + "\n" + msg.getPlainBody()).replace(/\s+/g, " ");
}

function findPattern_(text) {
  for (var i = 0; i < JASSO_PATTERNS.length; i++) {
    if (JASSO_PATTERNS[i].match(text)) {
      return JASSO_PATTERNS[i];
    }
  }
  return null;
}

function sendPush_(pushApiUrl, secret, payload) {
  var res = UrlFetchApp.fetch(pushApiUrl, {
    method: "post",
    headers: {
      Authorization: "Bearer " + secret,
      "Content-Type": "application/json",
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });
  return {
    code: res.getResponseCode(),
    body: res.getContentText(),
  };
}

/** メイン: トリガーから 5 分おきに実行 */
function checkJasso() {
  var config = getConfig_();
  if (!config.secret) {
    console.error("ADMIN_API_SECRET がスクリプト プロパティに未設定です");
    return;
  }

  var threads = GmailApp.search(GMAIL_QUERY, 0, MAX_THREADS);
  if (threads.length === 0) {
    return;
  }

  for (var t = 0; t < threads.length; t++) {
    var msg = threads[t].getMessages()[0];
    var text = normalizeMailText_(msg);
    var pattern = findPattern_(text);
    if (!pattern) {
      continue;
    }

    var payload = pattern.notification(config.siteUrl);
    var result = sendPush_(config.pushApiUrl, config.secret, payload);

    if (result.code >= 200 && result.code < 300) {
      msg.markRead();
      console.log(
        "送信成功 [" + pattern.id + "]: " + payload.title + " (" + result.code + ")"
      );
    } else {
      console.error(
        "送信失敗 [" +
          pattern.id +
          "]: HTTP " +
          result.code +
          " " +
          result.body
      );
    }
  }
}

/** 初回のみ実行: 5分おきトリガーを登録（既存の checkJasso トリガーは削除してから追加） */
function setupTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === "checkJasso") {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  ScriptApp.newTrigger("checkJasso")
    .timeBased()
    .everyMinutes(5)
    .create();
  console.log("checkJasso を 5 分おきで実行するトリガーを登録しました");
}

/** 手動テスト: 直近の X メールを検索してマッチ可否だけログ出力（送信しない） */
function dryRunCheckJasso() {
  var threads = GmailApp.search(GMAIL_QUERY, 0, MAX_THREADS);
  console.log("未読 X メール: " + threads.length + " 件");
  for (var t = 0; t < threads.length; t++) {
    var msg = threads[t].getMessages()[0];
    var text = normalizeMailText_(msg);
    var pattern = findPattern_(text);
    console.log(
      (pattern ? "MATCH " + pattern.id : "SKIP") +
        " | subject: " +
        msg.getSubject()
    );
  }
}
