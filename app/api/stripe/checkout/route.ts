import { NextResponse } from "next/server";
import { getStripe } from "@/app/lib/stripe";

export const runtime = "nodejs";

function getBaseUrl() {
  if (process.env.NEXT_PUBLIC_BASE_URL) return process.env.NEXT_PUBLIC_BASE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export async function POST(req: Request) {
  try {
    const { resultId } = (await req.json()) as { resultId?: string };
    if (!resultId) return NextResponse.json({ ok: false, error: "Missing resultId" }, { status: 400 });

    const priceId = process.env.STRIPE_PRICE_ID;
    if (!priceId) return NextResponse.json({ ok: false, error: "Missing STRIPE_PRICE_ID" }, { status: 500 });

    const stripe = getStripe();
    const baseUrl = getBaseUrl();

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/?session_id={CHECKOUT_SESSION_ID}&rid=${encodeURIComponent(resultId)}`,
      cancel_url: `${baseUrl}/?pay=cancel`,
      metadata: { resultId },
    });

    return NextResponse.json({ ok: true, url: session.url }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "Checkout error" }, { status: 500 });
  }
}
