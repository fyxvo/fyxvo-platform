import { NextResponse } from "next/server";
import { API_BASE } from "../../../lib/env";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = await request.json();
    const authorization = request.headers.get("authorization");
    const upstream = await fetch(`${API_BASE}/v1/feedback`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authorization ? { Authorization: authorization } : {}),
      },
      body: JSON.stringify(body),
    });

    const payload = (await upstream.json().catch(() => ({}))) as { error?: string; message?: string };
    if (!upstream.ok) {
      return NextResponse.json(
        { error: payload.message ?? payload.error ?? "Unable to submit feedback" },
        { status: upstream.status }
      );
    }

    return NextResponse.json(payload, { status: upstream.status });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
