import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { webEnv } from "../../../lib/env";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { page?: string; fcp?: number; lcp?: number; ua?: string };
    if (!body.page) return NextResponse.json({ error: "Missing page" }, { status: 400 });
    await fetch(new URL("/v1/analytics/performance", webEnv.apiBaseUrl), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true }); // silent fail
  }
}
