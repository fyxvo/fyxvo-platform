export const webEnv = {
  appName: process.env.NEXT_PUBLIC_APP_NAME ?? "Fyxvo",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  statusPageUrl:
    process.env.NEXT_PUBLIC_STATUS_PAGE_URL ??
    new URL("/status", process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").toString(),
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000",
  gatewayBaseUrl: process.env.NEXT_PUBLIC_GATEWAY_BASE_URL ?? "http://localhost:4100",
  solanaCluster: process.env.NEXT_PUBLIC_SOLANA_CLUSTER ?? "devnet",
  solanaRpcUrl: process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "https://api.devnet.solana.com",
  enableUsdc: process.env.NEXT_PUBLIC_ENABLE_USDC === "true",
  allowIndexing: process.env.NEXT_PUBLIC_ALLOW_INDEXING !== "false",
  socialImageUrl: new URL("/brand/social-card.png", process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").toString()
} as const;
