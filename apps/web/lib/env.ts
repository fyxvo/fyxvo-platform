export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://api.fyxvo.com";

export const GATEWAY_BASE =
  process.env.NEXT_PUBLIC_GATEWAY_BASE_URL ?? "https://rpc.fyxvo.com";

export const SOLANA_CLUSTER =
  process.env.NEXT_PUBLIC_SOLANA_CLUSTER ?? "devnet";

export const ENABLE_USDC =
  process.env.NEXT_PUBLIC_ENABLE_USDC === "true";
