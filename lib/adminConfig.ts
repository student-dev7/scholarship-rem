const raw = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || "")
  .split(/[,;\n]/)
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return raw.includes(email.trim().toLowerCase());
}
