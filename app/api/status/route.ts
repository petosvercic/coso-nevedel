import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const rid = searchParams.get("rid");
  if (!rid) return NextResponse.json({ paid: false }, { status: 200 });

  const v = await kv.get<string>(`paid:${rid}`);
  return NextResponse.json({ paid: v === "1" }, { status: 200 });
}
