import { NextResponse } from "next/server";
import { getStripe } from "@/app/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    // Ak nie je key, neoverujeme (napr. build / preview bez env). Nech API neskladá celý projekt.
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ ok: true, paid: false, resultId: null, reason: "no_key" }, { status: 200 });
    }

    const { sessionId } = (await req.json()) as { sessionId?: string };
    if (!sessionId) {
      return NextResponse.json({ ok: false, error: "Missing sessionId" }, { status: 400 });
    }

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    const paid = session.payment_status === "paid" && session.status === "complete";
    const resultId = session.metadata?.resultId ?? null;

    return NextResponse.json({ ok: true, paid, resultId }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "Verify error" }, { status: 500 });
  }
}
