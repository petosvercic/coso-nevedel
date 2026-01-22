import { NextResponse } from "next/server";
import { stripe } from "@/app/lib/stripe";
import { kv } from "@vercel/kv";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { sessionId } = (await req.json()) as { sessionId?: string };
    if (!sessionId) return NextResponse.json({ ok: false, error: "Missing sessionId" }, { status: 400 });

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    const paid = session.payment_status === "paid" && session.status === "complete";
    const resultId = session.metadata?.resultId;

    if (!paid || !resultId) return NextResponse.json({ ok: true, paid: false }, { status: 200 });

    await kv.set(`paid:${resultId}`, "1");
    return NextResponse.json({ ok: true, paid: true, resultId }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "Verify error" }, { status: 500 });
  }
}
