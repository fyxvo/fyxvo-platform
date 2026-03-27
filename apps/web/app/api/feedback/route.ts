import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { webEnv } from "../../../lib/env";

type WidgetBody = { type?: "widget"; rating: "up" | "down"; comment?: string | null; page?: string };
type InterestBody = { type: "interest"; name: string; email: string; role?: string; team?: string; useCase: string; expectedRequestVolume: string; interestAreas: string[]; operatorInterest: boolean; source: string };
type FeedbackBody = { type: "feedback"; name: string; email: string; role?: string; team?: string; category: string; message: string; source: string; page?: string };

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as WidgetBody | InterestBody | FeedbackBody;

    // Interest form submission
    if ("type" in body && body.type === "interest") {
      const res = await fetch(new URL("/v1/interest", webEnv.apiBaseUrl), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({ success: res.ok }));
      return NextResponse.json(data, { status: res.ok ? 200 : res.status });
    }

    // Full feedback form submission
    if ("type" in body && body.type === "feedback") {
      const res = await fetch(new URL("/v1/feedback", webEnv.apiBaseUrl), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({ success: res.ok }));
      return NextResponse.json(data, { status: res.ok ? 200 : res.status });
    }

    // Widget thumbs up/down — existing behaviour
    const widgetBody = body as WidgetBody;
    if (!widgetBody.rating || !["up", "down"].includes(widgetBody.rating)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    await fetch(new URL("/v1/feedback", webEnv.apiBaseUrl), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Anonymous",
        email: "anonymous@fyxvo.user",
        category: widgetBody.rating === "up" ? "PRODUCT_FEEDBACK" : "ONBOARDING_FRICTION",
        message: widgetBody.comment ?? `Page ${widgetBody.page ?? "unknown"}: ${widgetBody.rating}`,
        page: widgetBody.page ?? null,
        role: "developer",
        source: "feedback-widget",
      }),
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Submission failed. Please try again." }, { status: 500 });
  }
}
