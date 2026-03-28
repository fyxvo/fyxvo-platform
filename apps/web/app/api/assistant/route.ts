import { NextResponse } from "next/server";
import { API_BASE } from "../../../lib/env";

export async function POST(request: Request): Promise<Response> {
  try {
    const authHeader = request.headers.get("Authorization");
    const body = await request.json();

    const res = await fetch(`${API_BASE}/v1/assistant/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Upstream error" }, { status: res.status });
    }

    // Stream the response through
    return new Response(res.body, {
      status: res.status,
      headers: {
        "Content-Type": res.headers.get("Content-Type") ?? "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
