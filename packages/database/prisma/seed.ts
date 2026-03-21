import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const owner = await prisma.user.upsert({
    where: { walletAddress: "7bN4AqvpQAgx2j4r6rGfHc9GkgxJ5dThv7m6L7Q4J4r4" },
    update: {
      walletAddress: "7bN4AqvpQAgx2j4r6rGfHc9GkgxJ5dThv7m6L7Q4J4r4",
      authNonce: "seed-owner-nonce",
      sessionVersion: 1,
      email: "owner@fyxvo.dev",
      displayName: "Fyxvo Owner",
      role: "OWNER",
      status: "ACTIVE"
    },
    create: {
      walletAddress: "7bN4AqvpQAgx2j4r6rGfHc9GkgxJ5dThv7m6L7Q4J4r4",
      authNonce: "seed-owner-nonce",
      sessionVersion: 1,
      email: "owner@fyxvo.dev",
      displayName: "Fyxvo Owner",
      role: "OWNER",
      status: "ACTIVE"
    }
  });

  const project = await prisma.project.upsert({
    where: { slug: "fyxvo-core" },
    update: {
      name: "Fyxvo Core",
      description: "Core platform project for API, gateway, and node orchestration.",
      chainProjectId: 1n,
      onChainProjectPda: "9w5M8wQJRmL6x4uJg4gN8J7kY7YQu2D38R4Uu5qN4r7D",
      ownerId: owner.id
    },
    create: {
      slug: "fyxvo-core",
      name: "Fyxvo Core",
      description: "Core platform project for API, gateway, and node orchestration.",
      chainProjectId: 1n,
      onChainProjectPda: "9w5M8wQJRmL6x4uJg4gN8J7kY7YQu2D38R4Uu5qN4r7D",
      ownerId: owner.id
    }
  });

  const apiKey = await prisma.apiKey.upsert({
    where: { prefix: "fyxvo_live_core" },
    update: {
      label: "Primary integration key",
      keyHash: "sha256:9c1d1115b8c0fb4389eb420f3e9d1ac38559de1d860ccfd7f35e26d8b8674513",
      projectId: project.id,
      createdById: owner.id,
      status: "ACTIVE",
      scopes: ["project:read", "project:write", "rpc:request"],
      lastUsedAt: new Date()
    },
    create: {
      prefix: "fyxvo_live_core",
      label: "Primary integration key",
      keyHash: "sha256:9c1d1115b8c0fb4389eb420f3e9d1ac38559de1d860ccfd7f35e26d8b8674513",
      projectId: project.id,
      createdById: owner.id,
      status: "ACTIVE",
      scopes: ["project:read", "project:write", "rpc:request"],
      lastUsedAt: new Date()
    }
  });

  const operator = await prisma.nodeOperator.upsert({
    where: { walletAddress: "FYXVOOPERATORD3VNET11111111111111111111111111" },
    update: {
      name: "Devnet Operator",
      email: "operator@fyxvo.dev",
      status: "ACTIVE",
      reputationScore: 0.98
    },
    create: {
      name: "Devnet Operator",
      email: "operator@fyxvo.dev",
      walletAddress: "FYXVOOPERATORD3VNET11111111111111111111111111",
      status: "ACTIVE",
      reputationScore: 0.98
    }
  });

  const node = await prisma.node.upsert({
    where: { endpoint: "https://rpc.devnet.fyxvo.local" },
    update: {
      name: "fyxvo-devnet-rpc-01",
      operatorId: operator.id,
      projectId: project.id,
      network: "DEVNET",
      region: "us-east-1",
      status: "ONLINE",
      reliabilityScore: 0.97,
      lastHeartbeatAt: new Date()
    },
    create: {
      name: "fyxvo-devnet-rpc-01",
      operatorId: operator.id,
      projectId: project.id,
      network: "DEVNET",
      endpoint: "https://rpc.devnet.fyxvo.local",
      region: "us-east-1",
      status: "ONLINE",
      reliabilityScore: 0.97,
      lastHeartbeatAt: new Date()
    }
  });

  await prisma.metrics.deleteMany({
    where: {
      nodeId: node.id
    }
  });

  await prisma.metrics.createMany({
    data: [
      {
        nodeId: node.id,
        cpuUsage: 31.4,
        memoryUsage: 58.1,
        diskUsage: 42.7,
        requestCount: 18240,
        errorRate: 0.12,
        recordedAt: new Date(Date.now() - 60_000)
      },
      {
        nodeId: node.id,
        cpuUsage: 28.9,
        memoryUsage: 56.3,
        diskUsage: 42.8,
        requestCount: 18612,
        errorRate: 0.08,
        recordedAt: new Date()
      }
    ]
  });

  await prisma.requestLog.upsert({
    where: { requestId: "req_seed_health_001" },
    update: {
      projectId: project.id,
      apiKeyId: apiKey.id,
      userId: owner.id,
      service: "api",
      route: "/health",
      method: "GET",
      statusCode: 200,
      durationMs: 24,
      ipAddress: "127.0.0.1",
      userAgent: "FyxvoSeed/1.0"
    },
    create: {
      requestId: "req_seed_health_001",
      projectId: project.id,
      apiKeyId: apiKey.id,
      userId: owner.id,
      service: "api",
      route: "/health",
      method: "GET",
      statusCode: 200,
      durationMs: 24,
      ipAddress: "127.0.0.1",
      userAgent: "FyxvoSeed/1.0"
    }
  });

  await prisma.requestLog.upsert({
    where: { requestId: "req_seed_rpc_001" },
    update: {
      projectId: project.id,
      apiKeyId: apiKey.id,
      userId: owner.id,
      service: "gateway",
      route: "/rpc",
      method: "POST",
      statusCode: 200,
      durationMs: 83,
      ipAddress: "127.0.0.1",
      userAgent: "FyxvoSeed/1.0"
    },
    create: {
      requestId: "req_seed_rpc_001",
      projectId: project.id,
      apiKeyId: apiKey.id,
      userId: owner.id,
      service: "gateway",
      route: "/rpc",
      method: "POST",
      statusCode: 200,
      durationMs: 83,
      ipAddress: "127.0.0.1",
      userAgent: "FyxvoSeed/1.0"
    }
  });

  await prisma.idempotencyRecord.upsert({
    where: {
      key_method_route_actorKey: {
        key: "seed-idempotency-key",
        method: "POST",
        route: "/v1/projects",
        actorKey: owner.id
      }
    },
    update: {
      requestHash: "seed-request-hash",
      statusCode: 201,
      responseBody: { ok: true },
      expiresAt: new Date(Date.now() + 86_400_000)
    },
    create: {
      key: "seed-idempotency-key",
      method: "POST",
      route: "/v1/projects",
      actorKey: owner.id,
      requestHash: "seed-request-hash",
      statusCode: 201,
      responseBody: { ok: true },
      expiresAt: new Date(Date.now() + 86_400_000)
    }
  });

  await prisma.workerCursor.upsert({
    where: { key: "metrics-aggregation" },
    update: {
      cursorValue: {
        lastProcessedAt: new Date(Date.now() - 60_000).toISOString()
      }
    },
    create: {
      key: "metrics-aggregation",
      cursorValue: {
        lastProcessedAt: new Date(Date.now() - 60_000).toISOString()
      }
    }
  });

  await prisma.projectUsageRollup.upsert({
    where: {
      projectId_service_windowStart_windowEnd: {
        projectId: project.id,
        service: "gateway",
        windowStart: new Date("2026-03-18T18:00:00.000Z"),
        windowEnd: new Date("2026-03-18T19:00:00.000Z")
      }
    },
    update: {
      requestCount: 12,
      successCount: 11,
      errorCount: 1,
      totalDurationMs: 980,
      averageLatencyMs: 82,
      lastRequestAt: new Date()
    },
    create: {
      projectId: project.id,
      service: "gateway",
      windowStart: new Date("2026-03-18T18:00:00.000Z"),
      windowEnd: new Date("2026-03-18T19:00:00.000Z"),
      requestCount: 12,
      successCount: 11,
      errorCount: 1,
      totalDurationMs: 980,
      averageLatencyMs: 82,
      lastRequestAt: new Date()
    }
  });

  await prisma.transactionLookup.upsert({
    where: { signature: "5Y5mRZ9cWc5Yz4Axh9pfViy3kS2dU1yZbSLtWj5JfWjQbwwfRzx7xtdL9o9a7cQ6L4K6p1uJ3UqE9d4qf2g6A1P" },
    update: {
      slot: 289_000_123n,
      status: "CONFIRMED",
      blockTime: new Date("2026-03-18T18:55:00.000Z"),
      raw: {
        source: "seed",
        type: "transfer"
      }
    },
    create: {
      signature: "5Y5mRZ9cWc5Yz4Axh9pfViy3kS2dU1yZbSLtWj5JfWjQbwwfRzx7xtdL9o9a7cQ6L4K6p1uJ3UqE9d4qf2g6A1P",
      slot: 289_000_123n,
      status: "CONFIRMED",
      blockTime: new Date("2026-03-18T18:55:00.000Z"),
      raw: {
        source: "seed",
        type: "transfer"
      }
    }
  });

  await prisma.walletActivity.upsert({
    where: {
      walletAddress_signature: {
        walletAddress: owner.walletAddress,
        signature: "5Y5mRZ9cWc5Yz4Axh9pfViy3kS2dU1yZbSLtWj5JfWjQbwwfRzx7xtdL9o9a7cQ6L4K6p1uJ3UqE9d4qf2g6A1P"
      }
    },
    update: {
      activityType: "TRANSFER",
      slot: 289_000_123n,
      blockTime: new Date("2026-03-18T18:55:00.000Z"),
      success: true,
      source: "PROJECT_OWNER",
      projectId: project.id,
      raw: {
        source: "seed",
        amount: "1250000"
      }
    },
    create: {
      walletAddress: owner.walletAddress,
      signature: "5Y5mRZ9cWc5Yz4Axh9pfViy3kS2dU1yZbSLtWj5JfWjQbwwfRzx7xtdL9o9a7cQ6L4K6p1uJ3UqE9d4qf2g6A1P",
      activityType: "TRANSFER",
      slot: 289_000_123n,
      blockTime: new Date("2026-03-18T18:55:00.000Z"),
      success: true,
      source: "PROJECT_OWNER",
      projectId: project.id,
      raw: {
        source: "seed",
        amount: "1250000"
      }
    }
  });

  await prisma.walletTokenBalance.upsert({
    where: {
      walletAddress_mintAddress: {
        walletAddress: owner.walletAddress,
        mintAddress: "So11111111111111111111111111111111111111112"
      }
    },
    update: {
      projectId: project.id,
      amount: "4200000000",
      decimals: 9
    },
    create: {
      walletAddress: owner.walletAddress,
      mintAddress: "So11111111111111111111111111111111111111112",
      projectId: project.id,
      amount: "4200000000",
      decimals: 9
    }
  });

  await prisma.nodeHealthCheck.deleteMany({
    where: {
      nodeId: node.id
    }
  });

  await prisma.nodeHealthCheck.create({
    data: {
      nodeId: node.id,
      isHealthy: true,
      latencyMs: 42,
      responseSlot: 289_000_456n,
      checkedAt: new Date()
    }
  });

  await prisma.operatorRewardSnapshot.upsert({
    where: {
      operatorId_projectId_windowStart_windowEnd: {
        operatorId: operator.id,
        projectId: project.id,
        windowStart: new Date("2026-03-18T18:00:00.000Z"),
        windowEnd: new Date("2026-03-18T19:00:00.000Z")
      }
    },
    update: {
      requestCount: 12,
      uptimeRatio: 0.99,
      reputationScore: 0.98,
      rewardLamports: 2940n
    },
    create: {
      operatorId: operator.id,
      projectId: project.id,
      requestCount: 12,
      uptimeRatio: 0.99,
      reputationScore: 0.98,
      rewardLamports: 2940n,
      windowStart: new Date("2026-03-18T18:00:00.000Z"),
      windowEnd: new Date("2026-03-18T19:00:00.000Z")
    }
  });

  await prisma.blogPost.upsert({
    where: { slug: "devnet-private-alpha" },
    update: {
      title: "Fyxvo Devnet Private Alpha Is Live",
      summary:
        "We're opening access to Fyxvo's Solana RPC infrastructure on devnet. Here's what's working, what we're building, and how to get started.",
      content: `## What's live today

Fyxvo is a usage-based Solana RPC layer that routes requests through a decentralised operator network and settles payments on-chain in SOL. As of today, the devnet private alpha is open.

What you can use right now:

- **Solana devnet RPC proxying** — send JSON-RPC requests to \`rpc.fyxvo.com/rpc\` using your API key
- **API key management** — create, revoke, and scope keys per project from the dashboard
- **Project analytics** — request counts, error rates, and latency graphs updated in near real time
- **Usage-based billing in SOL** — your project balance is drawn down per request; fund it with devnet SOL from any faucet

## Getting started

1. Sign in at [fyxvo.com](https://fyxvo.com) with your Solana wallet
2. Create a project and copy your API key
3. Fund the project wallet with devnet SOL (the dashboard links to a faucet)
4. Point your RPC client at \`https://rpc.fyxvo.com/rpc\` with your key in the \`Authorization\` header or as a query param

Standard \`@solana/web3.js\` usage:

\`\`\`ts
import { Connection } from "@solana/web3.js";

const connection = new Connection(
  "https://rpc.fyxvo.com/rpc?key=YOUR_API_KEY",
  "confirmed"
);
\`\`\`

## What we're building toward

Devnet is the foundation. The roadmap from here:

- **Mainnet launch** — same infrastructure, real SOL, SLA-backed uptime guarantees
- **Priority lanes** — low-latency routing for time-sensitive transactions (MEV protection optional)
- **Open operator network** — let node operators register, earn SOL rewards, and exit permissionlessly
- **SDK improvements** — first-class TypeScript and Rust clients with automatic key rotation and retry logic

## A honest note on current limitations

Analytics are still basic — you'll see aggregate counts and latency but not per-method breakdowns yet. Uptime guarantees come with mainnet; devnet may have maintenance windows without notice. If something breaks, reach out directly.

## Get involved

This alpha is small on purpose. We want early feedback before we scale.

- Discord: [discord.gg/Uggu236Jgj](https://discord.gg/Uggu236Jgj)
- Telegram: [t.me/fyxvo](https://t.me/fyxvo)
- X: [@fyxvo](https://x.com/fyxvo)

If you're building on Solana and want to try it, come in.`,
      publishedAt: new Date("2026-03-21T12:00:00Z"),
      visible: true
    },
    create: {
      slug: "devnet-private-alpha",
      title: "Fyxvo Devnet Private Alpha Is Live",
      summary:
        "We're opening access to Fyxvo's Solana RPC infrastructure on devnet. Here's what's working, what we're building, and how to get started.",
      content: `## What's live today

Fyxvo is a usage-based Solana RPC layer that routes requests through a decentralised operator network and settles payments on-chain in SOL. As of today, the devnet private alpha is open.

What you can use right now:

- **Solana devnet RPC proxying** — send JSON-RPC requests to \`rpc.fyxvo.com/rpc\` using your API key
- **API key management** — create, revoke, and scope keys per project from the dashboard
- **Project analytics** — request counts, error rates, and latency graphs updated in near real time
- **Usage-based billing in SOL** — your project balance is drawn down per request; fund it with devnet SOL from any faucet

## Getting started

1. Sign in at [fyxvo.com](https://fyxvo.com) with your Solana wallet
2. Create a project and copy your API key
3. Fund the project wallet with devnet SOL (the dashboard links to a faucet)
4. Point your RPC client at \`https://rpc.fyxvo.com/rpc\` with your key in the \`Authorization\` header or as a query param

Standard \`@solana/web3.js\` usage:

\`\`\`ts
import { Connection } from "@solana/web3.js";

const connection = new Connection(
  "https://rpc.fyxvo.com/rpc?key=YOUR_API_KEY",
  "confirmed"
);
\`\`\`

## What we're building toward

Devnet is the foundation. The roadmap from here:

- **Mainnet launch** — same infrastructure, real SOL, SLA-backed uptime guarantees
- **Priority lanes** — low-latency routing for time-sensitive transactions (MEV protection optional)
- **Open operator network** — let node operators register, earn SOL rewards, and exit permissionlessly
- **SDK improvements** — first-class TypeScript and Rust clients with automatic key rotation and retry logic

## A honest note on current limitations

Analytics are still basic — you'll see aggregate counts and latency but not per-method breakdowns yet. Uptime guarantees come with mainnet; devnet may have maintenance windows without notice. If something breaks, reach out directly.

## Get involved

This alpha is small on purpose. We want early feedback before we scale.

- Discord: [discord.gg/Uggu236Jgj](https://discord.gg/Uggu236Jgj)
- Telegram: [t.me/fyxvo](https://t.me/fyxvo)
- X: [@fyxvo](https://x.com/fyxvo)

If you're building on Solana and want to try it, come in.`,
      publishedAt: new Date("2026-03-21T12:00:00Z"),
      visible: true
    }
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
