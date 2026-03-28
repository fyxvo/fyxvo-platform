import { NextResponse } from "next/server";

const COINGECKO_URL =
  "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd";

export async function GET(): Promise<NextResponse> {
  try {
    const response = await fetch(COINGECKO_URL, {
      headers: { Accept: "application/json" },
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `CoinGecko request failed with status ${response.status}.` },
        { status: response.status }
      );
    }

    const payload = (await response.json()) as { solana?: { usd?: number } };
    const price = payload.solana?.usd;

    if (typeof price !== "number" || Number.isNaN(price)) {
      return NextResponse.json({ error: "SOL price was not available from CoinGecko." }, { status: 502 });
    }

    return NextResponse.json({ usd: price }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Unable to load the SOL price right now." }, { status: 502 });
  }
}
