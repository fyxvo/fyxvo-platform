import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

const SYSTEM_PROMPT = `You are the Fyxvo assistant — a concise, developer-focused AI for the Fyxvo platform.

Fyxvo is Solana devnet infrastructure for funded relay traffic:
- Projects are created in the dashboard, activated on-chain, and funded with SOL or USDC
- Requests route through a managed JSON-RPC relay gateway (standard and priority modes)
- Per-request lamport pricing: standard ~5000 lamports, priority ~15000 lamports, write ops 3× multiplier
- API keys are scoped per project; the gateway enforces scope on every request
- All balances, activations, and reward payouts are verifiable on Solana devnet
- Program ID: Gsi8tsTm7BinEgcYd1Uc4wtNBjMrjYfbtKdoDpGdvkJc

Answer questions about the Fyxvo API, pricing, relay methods, authentication, errors, and Solana devnet. Be concise. Use code when helpful.`;

export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Assistant not available — ANTHROPIC_API_KEY not configured." },
      { status: 503 },
    );
  }

  let body: { message?: string; history?: ConversationMessage[] };
  try {
    body = await request.json() as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { message, history = [] } = body;
  if (!message?.trim()) {
    return NextResponse.json({ error: "Message is required." }, { status: 400 });
  }

  const messages: ConversationMessage[] = [
    ...history.slice(-20),
    { role: "user", content: message.trim() },
  ];

  const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "anthropic-version": "2023-06-01",
      "x-api-key": apiKey,
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages,
      stream: true,
    }),
  }).catch((err: unknown) => {
    throw new Error(err instanceof Error ? err.message : "Network error reaching AI service.");
  });

  if (!anthropicRes.ok) {
    const errText = await anthropicRes.text().catch(() => "");
    return NextResponse.json(
      { error: `AI service returned ${anthropicRes.status}.`, detail: errText },
      { status: 502 },
    );
  }

  const upstream = anthropicRes.body;
  if (!upstream) {
    return NextResponse.json({ error: "No response body from AI service." }, { status: 502 });
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = upstream.getReader();
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          controller.enqueue(value);
        }
      } finally {
        reader.releaseLock();
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      "x-accel-buffering": "no",
    },
  });
}
