# @fyxvo/sdk

Official TypeScript SDK for the [Fyxvo](https://www.fyxvo.com) Solana devnet RPC relay gateway.

## What is Fyxvo?

Fyxvo is a managed, wallet-authenticated RPC relay for Solana devnet. You fund a project with SOL, create scoped API keys, and route JSON-RPC requests through the Fyxvo gateway. Fyxvo handles the node infrastructure, rate limiting, and analytics.

## Installation

```bash
npm install @fyxvo/sdk
# or
yarn add @fyxvo/sdk
# or
pnpm add @fyxvo/sdk
```

## Quick Start

```typescript
import { createFyxvoClient } from "@fyxvo/sdk";

const fyxvo = createFyxvoClient({
  baseUrl: "https://rpc.fyxvo.com",
  apiKey: "fyxvo_live_YOUR_KEY_HERE",
  timeoutMs: 10_000,
});

// Send a standard JSON-RPC request
const slotResult = await fyxvo.rpc<number>({ method: "getSlot" });
console.log("Current slot:", slotResult);

// Get the balance of a wallet
const balance = await fyxvo.rpc<{ value: number }>({
  method: "getBalance",
  params: ["FQ5pyjBQvfadKPPxd66YXksgn8veYnjEw2R1g6aQnFaa"]
});
console.log("Balance (lamports):", balance.value);
```

## Priority Relay

Priority requests are routed through a low-latency path with guaranteed capacity:

```typescript
const fyxvo = createFyxvoClient({
  baseUrl: "https://rpc.fyxvo.com/priority",
  apiKey: "fyxvo_live_YOUR_KEY_HERE",
});

const latestBlockhash = await fyxvo.rpc<{
  value: { blockhash: string; lastValidBlockHeight: number }
}>({ method: "getLatestBlockhash" });
```

## Error Handling

```typescript
import { createFyxvoClient, FyxvoApiError, FyxvoNetworkError } from "@fyxvo/sdk";

const fyxvo = createFyxvoClient({ apiKey: "fyxvo_live_..." });

try {
  const result = await fyxvo.rpc({
    method: "getBalance",
    params: ["<pubkey>"]
  });
} catch (err) {
  if (err instanceof FyxvoApiError) {
    // API returned an error response (4xx/5xx)
    console.error(`API error ${err.statusCode}: ${err.message}`);
  } else if (err instanceof FyxvoNetworkError) {
    // Network connectivity issue
    console.error("Network error:", err.message);
  } else {
    throw err;
  }
}
```

## Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `baseUrl` | `string` | required | Base URL for the gateway or API you are calling |
| `apiKey` | `string` | optional | Your Fyxvo API key (starts with `fyxvo_live_`) |
| `timeoutMs` | `number` | `10000` | Request timeout in milliseconds |
| `headers` | `HeadersInit` | optional | Extra headers to attach to every request |
| `fetcher` | `typeof fetch` | optional | Custom fetch implementation |

## Checking Gateway Health

```typescript
const health = await fyxvo.getGatewayHealth();
console.log(health.status); // "ok" | "degraded"
```

## Publishing

This package is published manually by the Fyxvo team. To publish a new version:

```bash
# From the monorepo root
cd /path/to/fyxvo
npm login
pnpm --filter @fyxvo/sdk publish --access public
```

## License

MIT © Fyxvo
