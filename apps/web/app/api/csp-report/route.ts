import { NextResponse } from "next/server";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = await request.json();
    console.warn("[CSP Report]", JSON.stringify(body));
  } catch {
    // Ignore malformed reports
  }
  return new NextResponse(null, { status: 204 });
}
