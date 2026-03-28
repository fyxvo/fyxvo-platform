import { NextResponse } from "next/server";

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

    // In production this would store the email in a subscriber list
    console.info("[StatusSubscribe]", email);

    return NextResponse.json({ success: true, email }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
