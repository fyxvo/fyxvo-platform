import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { webEnv } from "../../../lib/env";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { email?: string };
  const email = body.email?.trim();
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  try {
    const response = await fetch(new URL("/v1/status/subscribe", webEnv.apiBaseUrl), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
      cache: "no-store",
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({ error: "Subscription failed." }));
      return NextResponse.json(payload, { status: response.status });
    }

    const payload = await response.json().catch(() => ({ success: true }));
    return NextResponse.json(payload, { status: response.status });
  } catch {
    return NextResponse.json(
      { error: "Status subscriptions are temporarily unavailable. Please try again shortly." },
      { status: 503 },
    );
  }
}
