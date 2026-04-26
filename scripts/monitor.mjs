import cheerio from "cheerio";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const STATE = path.join(ROOT, "last_news.txt");
const JASSO_NEWS = "https://www.jasso.go.jp/news/index.html";
const KEYWORDS = ["在籍報告", "継続願", "入力期間"];

function readState() {
  try {
    return fs.readFileSync(STATE, "utf8");
  } catch {
    return "";
  }
}

function writeState(s) {
  fs.writeFileSync(STATE, s, "utf8");
}

async function postDiscord(content) {
  const url = process.env.DISCORD_WEBHOOK_URL;
  if (!url) {
    console.error("DISCORD_WEBHOOK_URL is not set");
    return;
  }
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: content.slice(0, 1800) }),
  });
  if (!r.ok) {
    throw new Error(`Discord returned ${r.status}: ${await r.text()}`);
  }
}

function extractNews(html) {
  const $ = cheerio.load(html);
  const out = [];
  $("a").each((_, el) => {
    const t = $(el).text().replace(/\s+/g, " ").trim();
    if (!t) return;
    if (KEYWORDS.some((k) => t.includes(k))) {
      const href = $(el).attr("href") || "";
      out.push({ text: t, href: href.trim() });
    }
  });
  return out;
}

function serialize(news) {
  return news.map((n) => `${n.text}:::${n.href}`).join("\n");
}

async function main() {
  let body;
  try {
    const res = await fetch(JASSO_NEWS, {
      headers: { "User-Agent": "JASSO-Monitor/1.0 (scholarship-reminder; +https://github.com/)" },
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    body = await res.text();
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e);
    try {
      await postDiscord(
        `【JASSO監視】取得失敗: ${m}\nURL: ${JASSO_NEWS}\n（ネットワーク・HTML変更・ブロック等を確認）`
      );
    } catch (d) {
      console.error("Discord error delivery failed", d);
    }
    process.exit(1);
  }

  const news = extractNews(body);
  const snap = serialize(news);
  const prev = readState();
  if (prev && snap && snap !== prev) {
    const lines = news
      .map((n) => `• ${n.text}\n  ${n.href ? new URL(n.href, JASSO_NEWS).href : JASSO_NEWS}`)
      .join("\n");
    await postDiscord(`【JASSO ニュース更新候補】\n${lines || "(テキスト抽出なし)"}`);
  } else if (!prev) {
    console.log("初回: 次回から差分を検出します。last_news.txt を更新しました。");
  }
  writeState(snap);
  console.log("OK, links:", news.length);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
