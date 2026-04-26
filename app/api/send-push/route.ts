import { NextResponse } from "next/server";
import { broadcastPushToAllSubscribers } from "@/lib/broadcastPushStub";

/**
 * 管理者/バッチ から一斉プッシュを叩く雛形。
 * Authorization: Bearer {ADMIN_API_SECRET} (環境変数) を要求。
 */
export async function POST(request: Request) {
  const exp = `Bearer ${process.env.ADMIN_API_SECRET || ""}`;
  const h = request.headers.get("Authorization");
  if (!process.env.ADMIN_API_SECRET || h !== exp) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const r = await broadcastPushToAllSubscribers();
  return NextResponse.json(r);
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
