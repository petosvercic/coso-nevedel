import { NextResponse } from "next/server";

type TelemetryEvent =
  | {
      type: "submit";
      at: string;
      rid: string;
      dobISO: string;
      nameHash: string;
      nameLen: number;
      zodiac: string;
      cz: string;
      age: number;
      daysAlive: number;
      factSummary: Array<{
        section: string;
        rows: Array<{ id: string; value: string }>;
      }>;
    }
  | {
      type: "paid";
      at: string;
      rid: string;
      sessionId?: string;
    };

export async function POST(req: Request) {
  // Build-safe: ak nechceš logovať, nič sa neudeje.
  // Zapneš to env premennou TELEMETRY_ENABLED=1
  if (process.env.TELEMETRY_ENABLED !== "1") {
    return new NextResponse(null, { status: 204 });
  }

  try {
    const body = (await req.json()) as TelemetryEvent;

    // Basic sanity
    if (!body || typeof body !== "object" || typeof (body as any).type !== "string") {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    // !!! ZATIAĽ LEN LOG !!!
    // Vercel ti to dá do Function Logs. Neskôr to vymeníš za DB (KV/Postgres/Blob).
    console.log("[telemetry]", JSON.stringify(body));

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[telemetry:error]", e);
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
