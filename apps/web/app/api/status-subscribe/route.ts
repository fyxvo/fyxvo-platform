import { NextResponse } from "next/server";
import { API_BASE } from "../../../lib/env";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = await request.json() as { email?: string };

    if (!body.email || typeof body.email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const email = body.email.trim().toLowerCase();
    if (!email.includes("@")) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }

    const upstream = await fetch(`${API_BASE}/v1/status/subscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const payload = (await upstream.json().catch(() => ({}))) as {
      error?: string;
      message?: string;
    };
    if (!upstream.ok) {
      return NextResponse.json(
        { error: payload.message ?? payload.error ?? "Subscription failed" },
        { status: upstream.status }
      );
    }

    return NextResponse.json({ success: true, email }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
