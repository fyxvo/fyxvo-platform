import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { email?: string };
  if (!body.email || !body.email.includes("@")) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }
  // TODO: persist to database when StatusSubscriber model is available
  return NextResponse.json({ success: true });
}
