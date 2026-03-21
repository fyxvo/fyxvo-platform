import type { NextRequest } from "next/server";

export const runtime = "nodejs";

interface CspViolationReport {
  "csp-report"?: {
    "blocked-uri"?: string;
    "violated-directive"?: string;
    "document-uri"?: string;
  };
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const body = await request.json() as CspViolationReport;
    const report = body["csp-report"] ?? {};
    // Structured log only — no persistent storage
    const entry = {
      blockedUri: report["blocked-uri"] ?? "unknown",
      violatedDirective: report["violated-directive"] ?? "unknown",
      timestamp: new Date().toISOString(),
    };
    // Forward to API for admin panel visibility
    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://api.fyxvo.com";
    void fetch(`${apiBase}/v1/analytics/csp-violation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry),
    }).catch(() => { /* best-effort */ });
    return new Response(null, { status: 204 });
  } catch {
    return new Response(null, { status: 204 });
  }
}
