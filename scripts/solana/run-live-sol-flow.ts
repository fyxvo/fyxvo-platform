import path from "node:path";
import process from "node:process";
import { createRequire } from "node:module";
import {
  Connection,
  Keypair,
  PublicKey,
  VersionedTransaction
} from "@solana/web3.js";
import {
  createDevnetConnection,
  formatSol,
  loadKeypairFromFile,
  loadSolanaScriptRuntime,
  topUpWalletIfNeeded
} from "./shared.js";

const require = createRequire(import.meta.url);
const bs58 = require(path.join(process.cwd(), "node_modules/.pnpm/node_modules/bs58")).default as {
  encode(value: Uint8Array | Buffer): string;
};
const nacl = require(path.join(
  process.cwd(),
  "node_modules/.pnpm/node_modules/tweetnacl"
)) as {
  sign: {
    detached(message: Uint8Array, secretKey: Uint8Array): Uint8Array;
  };
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function nowSlug() {
  return `live-devnet-${Date.now()}`;
}

async function jsonRequest<T>(input: {
  readonly url: string;
  readonly method?: "GET" | "POST";
  readonly token?: string;
  readonly body?: unknown;
  readonly idempotencyKey?: string;
}): Promise<{ status: number; body: T }> {
  const response = await fetch(input.url, {
    method: input.method ?? "GET",
    headers: {
      ...(input.token ? { authorization: `Bearer ${input.token}` } : {}),
      ...(input.body !== undefined ? { "content-type": "application/json" } : {}),
      ...(input.idempotencyKey ? { "idempotency-key": input.idempotencyKey } : {})
    },
    ...(input.body !== undefined ? { body: JSON.stringify(input.body) } : {})
  });
  const body = (await response.json()) as T;
  return {
    status: response.status,
    body
  };
}

async function sendVersionedTransaction(input: {
  readonly connection: Connection;
  readonly transactionBase64: string;
  readonly signer: Keypair;
  readonly recentBlockhash: string;
  readonly lastValidBlockHeight: number;
}) {
  const transaction = VersionedTransaction.deserialize(
    Buffer.from(input.transactionBase64, "base64")
  );
  transaction.sign([input.signer]);
  const signature = await input.connection.sendRawTransaction(transaction.serialize(), {
    skipPreflight: false,
    maxRetries: 3
  });
  await input.connection.confirmTransaction(
    {
      signature,
      blockhash: input.recentBlockhash,
      lastValidBlockHeight: input.lastValidBlockHeight
    },
    "confirmed"
  );
  return signature;
}

async function main() {
  const runtime = loadSolanaScriptRuntime();
  const connection = createDevnetConnection(runtime);
  const payer = await loadKeypairFromFile(runtime.anchorWalletPath);
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
  const gatewayBaseUrl = process.env.NEXT_PUBLIC_GATEWAY_BASE_URL ?? "http://localhost:4100";
  const fundingLamports = BigInt(process.env.FYXVO_LIVE_FLOW_FUNDING_LAMPORTS ?? "100000000");

  const wallet = Keypair.generate();
  const walletFunding = await topUpWalletIfNeeded({
    connection,
    payer,
    recipient: wallet.publicKey,
    minimumLamports: 150_000_000,
    targetLamports: 250_000_000
  });

  const challenge = await jsonRequest<{
    walletAddress: string;
    nonce: string;
    message: string;
  }>({
    url: `${apiBaseUrl}/v1/auth/challenge`,
    method: "POST",
    body: {
      walletAddress: wallet.publicKey.toBase58()
    }
  });

  if (challenge.status !== 200) {
    throw new Error(`Wallet challenge failed with status ${challenge.status}.`);
  }

  const signature = bs58.encode(
    Buffer.from(nacl.sign.detached(Buffer.from(challenge.body.message, "utf8"), wallet.secretKey))
  );
  const verified = await jsonRequest<{
    token: string;
    user: {
      id: string;
      walletAddress: string;
    };
  }>({
    url: `${apiBaseUrl}/v1/auth/verify`,
    method: "POST",
    body: {
      walletAddress: wallet.publicKey.toBase58(),
      message: challenge.body.message,
      signature
    }
  });

  if (verified.status !== 200) {
    throw new Error(`Wallet verification failed with status ${verified.status}.`);
  }

  const projectSlug = nowSlug();
  const createdProject = await jsonRequest<{
    item: {
      id: string;
      slug: string;
      chainProjectId: string;
      onChainProjectPda: string;
    };
    activation: {
      transactionBase64: string;
      recentBlockhash: string;
      lastValidBlockHeight: number;
      projectPda: string;
    };
  }>({
    url: `${apiBaseUrl}/v1/projects`,
    method: "POST",
    token: verified.body.token,
    idempotencyKey: `project-${projectSlug}`,
    body: {
      slug: projectSlug,
      name: "Live Devnet SOL Flow",
      description: "Fresh project created against the live devnet Fyxvo program."
    }
  });

  if (createdProject.status !== 201) {
    throw new Error(`Project creation failed with status ${createdProject.status}.`);
  }

  const activationSignature = await sendVersionedTransaction({
    connection,
    transactionBase64: createdProject.body.activation.transactionBase64,
    signer: wallet,
    recentBlockhash: createdProject.body.activation.recentBlockhash,
    lastValidBlockHeight: createdProject.body.activation.lastValidBlockHeight
  });

  const activationVerification = await jsonRequest<{
    item: {
      signature: string;
      confirmedAt: string;
      explorerUrl: string;
    };
  }>({
    url: `${apiBaseUrl}/v1/projects/${createdProject.body.item.id}/activation/verify`,
    method: "POST",
    token: verified.body.token,
    body: {
      signature: activationSignature
    }
  });

  if (activationVerification.status !== 200) {
    throw new Error(`Project activation verification failed with status ${activationVerification.status}.`);
  }

  const apiKeyCreated = await jsonRequest<{
    item: {
      id: string;
      prefix: string;
    };
    plainTextKey: string;
  }>({
    url: `${apiBaseUrl}/v1/projects/${createdProject.body.item.id}/api-keys`,
    method: "POST",
    token: verified.body.token,
    idempotencyKey: `api-key-${projectSlug}`,
    body: {
      label: "Live Devnet Gateway Key",
      scopes: ["rpc:request", "priority:relay"]
    }
  });

  if (apiKeyCreated.status !== 201) {
    throw new Error(`API key creation failed with status ${apiKeyCreated.status}.`);
  }

  const fundingPrepared = await jsonRequest<{
    item: {
      fundingRequestId: string;
      asset: "SOL";
      amount: string;
      transactionBase64: string;
      recentBlockhash: string;
      lastValidBlockHeight: number;
    };
  }>({
    url: `${apiBaseUrl}/v1/projects/${createdProject.body.item.id}/funding/prepare`,
    method: "POST",
    token: verified.body.token,
    idempotencyKey: `funding-${projectSlug}`,
    body: {
      funderWalletAddress: wallet.publicKey.toBase58(),
      asset: "SOL",
      amount: fundingLamports.toString()
    }
  });

  if (fundingPrepared.status !== 201) {
    throw new Error(`Funding preparation failed with status ${fundingPrepared.status}.`);
  }

  const fundingSignature = await sendVersionedTransaction({
    connection,
    transactionBase64: fundingPrepared.body.item.transactionBase64,
    signer: wallet,
    recentBlockhash: fundingPrepared.body.item.recentBlockhash,
    lastValidBlockHeight: fundingPrepared.body.item.lastValidBlockHeight
  });

  const fundingVerified = await jsonRequest<{
    item: {
      fundingRequestId: string;
      signature: string;
      confirmedAt: string;
      explorerUrl: string;
      onchain: {
        projectPda: string;
        treasuryPda: string;
        balances?: {
          totalSolFunded: string;
          availableSolCredits: string;
        };
      };
    };
  }>({
    url: `${apiBaseUrl}/v1/projects/${createdProject.body.item.id}/funding/verify`,
    method: "POST",
    token: verified.body.token,
    body: {
      fundingRequestId: fundingPrepared.body.item.fundingRequestId,
      signature: fundingSignature
    }
  });

  if (fundingVerified.status !== 200) {
    throw new Error(`Funding verification failed with status ${fundingVerified.status}.`);
  }

  const onChainSnapshot = await jsonRequest<{
    item: {
      projectPda: string;
      treasuryPda: string;
      balances?: {
        totalSolFunded: string;
        availableSolCredits: string;
      };
    };
  }>({
    url: `${apiBaseUrl}/v1/projects/${createdProject.body.item.id}/onchain`,
    token: verified.body.token
  });

  const gatewayStandard = await fetch(`${gatewayBaseUrl}/rpc`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKeyCreated.body.plainTextKey
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "getHealth"
    })
  });
  const gatewayStandardBody = (await gatewayStandard.json()) as Record<string, unknown>;

  const gatewayPriority = await fetch(`${gatewayBaseUrl}/priority-rpc`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKeyCreated.body.plainTextKey
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 2,
      method: "getVersion"
    })
  });
  const gatewayPriorityBody = (await gatewayPriority.json()) as Record<string, unknown>;

  await sleep(8_000);

  const projectAnalytics = await jsonRequest<{
    item: {
      projectId: string;
      totals: {
        requestCount: number;
        successCount: number;
        errorCount: number;
      };
    };
  }>({
    url: `${apiBaseUrl}/v1/analytics/projects/${createdProject.body.item.id}`,
    token: verified.body.token
  });

  const overviewAnalytics = await jsonRequest<{
    item: {
      totals: {
        requestCount: number;
        successCount: number;
        errorCount: number;
      };
    };
  }>({
    url: `${apiBaseUrl}/v1/analytics/overview`,
    token: verified.body.token
  });

  process.stdout.write(
    JSON.stringify(
      {
        runtime: {
          programId: runtime.programId,
          apiBaseUrl,
          gatewayBaseUrl
        },
        wallet: {
          address: wallet.publicKey.toBase58(),
          funding: {
            ...walletFunding,
            currentBalance: formatSol(walletFunding.currentBalance),
            targetBalance: formatSol(walletFunding.targetBalance)
          }
        },
        auth: {
          userId: verified.body.user.id
        },
        project: {
          id: createdProject.body.item.id,
          slug: createdProject.body.item.slug,
          chainProjectId: createdProject.body.item.chainProjectId,
          onChainProjectPda: createdProject.body.item.onChainProjectPda,
          activationSignature,
          activationExplorerUrl: activationVerification.body.item.explorerUrl
        },
        apiKey: {
          id: apiKeyCreated.body.item.id,
          prefix: apiKeyCreated.body.item.prefix,
          plainTextKey: apiKeyCreated.body.plainTextKey
        },
        funding: {
          fundingRequestId: fundingPrepared.body.item.fundingRequestId,
          amountLamports: fundingPrepared.body.item.amount,
          signature: fundingSignature,
          explorerUrl: fundingVerified.body.item.explorerUrl,
          onChainSnapshot: fundingVerified.body.item.onchain,
          latestOnChainProject: onChainSnapshot.body.item
        },
        gateway: {
          standardStatus: gatewayStandard.status,
          standardBody: gatewayStandardBody,
          priorityStatus: gatewayPriority.status,
          priorityBody: gatewayPriorityBody
        },
        analytics: {
          project: projectAnalytics.body.item,
          overview: overviewAnalytics.body.item
        }
      },
      (_key, value) => (typeof value === "bigint" ? value.toString() : value),
      2
    ) + "\n"
  );
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
