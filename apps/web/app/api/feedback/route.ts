import { NextResponse } from "next/server";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = await request.json() as { type?: string; message?: string };
    if (!body.message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }
    // In production this would be forwarded to a feedback service
    console.info("[Feedback]", body);
    return NextResponse.json({ success: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
