/** 日本時間（Asia/Tokyo）で「今日」のカレンダー日付 YYYY-MM-DD */
export function getTodayJstYmd(now: Date = new Date()): string {
  const fmt = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(now);
}

/** YYYY-MM-DD に日数を加算（単純暦日・タイムゾーン非依存） */
export function addCalendarDaysYmd(ymd: string, deltaDays: number): string | null {
  if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
  const [y, m, d] = ymd.split("-").map(Number);
  const utc = Date.UTC(y, m - 1, d + deltaDays);
  const dt = new Date(utc);
  if (Number.isNaN(dt.getTime())) return null;
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}
