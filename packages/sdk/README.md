# @fyxvo/sdk

Official TypeScript SDK for the [Fyxvo](https://www.fyxvo.com) Solana devnet control plane and relay gateway.

## Installation

```bash
npm install @fyxvo/sdk
```

## What this package covers

`@fyxvo/sdk` ships two clients. `createFyxvoClient` is the API key-authenticated gateway client used for standard and priority Solana JSON-RPC traffic through `rpc.fyxvo.com`. `createFyxvoApiClient` is the JWT-authenticated control-plane client used for project creation, funding preparation, analytics, alerts, and network stats through `api.fyxvo.com`.

## Authentication

Use a Fyxvo API key for relay traffic:

```ts
import { createFyxvoClient } from "@fyxvo/sdk";

const gateway = createFyxvoClient({
  baseUrl: "https://rpc.fyxvo.com",
  apiKey: "fyxvo_live_...",
});
```

Use a Fyxvo JWT for authenticated control-plane access:

```ts
import { createFyxvoApiClient } from "@fyxvo/sdk";

const api = createFyxvoApiClient({
  baseUrl: "https://api.fyxvo.com",
  jwtToken: "eyJhbGciOi...",
});
```

## Common examples

### 1. Send a standard RPC request

```ts
import { createFyxvoClient } from "@fyxvo/sdk";

const gateway = createFyxvoClient({
  baseUrl: "https://rpc.fyxvo.com",
  apiKey: "fyxvo_live_...",
});

const response = await gateway.rpc<number>({
  method: "getSlot",
});

if ("result" in response) {
  console.log("Current slot:", response.result);
}
```

### 2. Send a priority relay request

```ts
import { createFyxvoClient } from "@fyxvo/sdk";

const gateway = createFyxvoClient({
  baseUrl: "https://rpc.fyxvo.com",
  apiKey: "fyxvo_live_...",
});

const latestBlockhash = await gateway.priorityRpc<{
  value: { blockhash: string; lastValidBlockHeight: number };
}>({
  method: "getLatestBlockhash",
});

console.log(latestBlockhash);
```

### 3. Create a project

```ts
import { createFyxvoApiClient } from "@fyxvo/sdk";

const api = createFyxvoApiClient({
  baseUrl: "https://api.fyxvo.com",
  jwtToken: process.env.FYXVO_JWT!,
});

const project = await api.createProject({
  slug: "my-devnet-project",
  name: "My devnet project",
  description: "Control plane integration test",
  templateType: "blank",
});

console.log(project.item.id);
console.log(project.activation.transactionBase64);
```

### 4. Prepare a SOL funding transaction

```ts
import { createFyxvoApiClient } from "@fyxvo/sdk";

const api = createFyxvoApiClient({
  baseUrl: "https://api.fyxvo.com",
  jwtToken: process.env.FYXVO_JWT!,
});

const preparation = await api.prepareSOLFunding("PROJECT_ID", {
  amount: "1000000000",
  funderWalletAddress: "BASE58_WALLET",
});

console.log(preparation.transactionBase64);
```

### 5. Subscribe to alerts by polling the alerts center

```ts
import { createFyxvoApiClient } from "@fyxvo/sdk";

const api = createFyxvoApiClient({
  baseUrl: "https://api.fyxvo.com",
  jwtToken: process.env.FYXVO_JWT!,
});

const alerts = await api.listAlerts();

for (const alert of alerts) {
  console.log(`[${alert.severity}] ${alert.title}`);
}
```

## Raw request access

Use `request` when you need an authenticated endpoint that is not wrapped yet.

```ts
const response = await api.request<{ item: unknown }>({
  path: "/v1/admin/platform-stats",
});
```

Use `rpc` and `priorityRpc` when you need a typed Solana method response.

```ts
const balance = await gateway.rpc<{ value: number }>({
  method: "getBalance",
  params: ["Gsi8tsTm7BinEgcYd1Uc4wtNBjMrjYfbtKdoDpGdvkJc"],
});
```

## Error handling

All SDK failures throw subclasses of `FyxvoError`.

```ts
import {
  FyxvoApiError,
  FyxvoNetworkError,
  FyxvoTimeoutError,
  createFyxvoClient,
} from "@fyxvo/sdk";

const gateway = createFyxvoClient({
  baseUrl: "https://rpc.fyxvo.com",
  apiKey: "fyxvo_live_...",
});

try {
  await gateway.rpc({ method: "getHealth" });
} catch (error) {
  if (error instanceof FyxvoApiError) {
    console.error(error.statusCode, error.code, error.details);
  } else if (error instanceof FyxvoTimeoutError) {
    console.error("Timed out");
  } else if (error instanceof FyxvoNetworkError) {
    console.error("Network failure");
  } else {
    throw error;
  }
}
```

## Local development

From the monorepo root:

```bash
pnpm --filter @fyxvo/sdk build
pnpm --filter @fyxvo/sdk test
```

## Links

- Docs: https://www.fyxvo.com/docs
- Playground: https://www.fyxvo.com/playground
- Status: https://status.fyxvo.com
