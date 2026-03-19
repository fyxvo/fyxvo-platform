"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Notice,
} from "@fyxvo/ui";
import { CopyButton } from "../../components/copy-button";
import { PageHeader } from "../../components/page-header";
import { AuthGate } from "../../components/state-panels";
import { usePortal } from "../../components/portal-provider";
import { webEnv } from "../../lib/env";
import { formatSol } from "../../lib/format";

export default function FundingPage() {
  const portal = usePortal();
  const [asset, setAsset] = useState<"SOL" | "USDC">("SOL");
  const [amount, setAmount] = useState("1000000000");
  const [tokenAccount, setTokenAccount] = useState("");

  const availableSolCredits = (() => {
    try {
      return BigInt(portal.onchainSnapshot.balances?.availableSolCredits ?? "0");
    } catch {
      return 0n;
    }
  })();
  const hasLowBalance = availableSolCredits > 0n && availableSolCredits < 100_000_000n;
  const phase = portal.transactionState.phase;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Funding"
        title="Prepare, review, and submit funding transactions."
        description="Prepare the transaction, review the exact amount, sign it in the connected wallet, confirm it on chain, and move directly into relay usage."
      />

      {portal.walletPhase !== "authenticated" ? (
        <AuthGate body="Funding uses the same wallet proof as the API session, so you only have to connect once." />
      ) : null}

      {portal.walletPhase === "authenticated" && !portal.selectedProject ? (
        <Notice tone="warning" title="Create a project before funding">
          Funding only becomes meaningful after the project activation transaction has confirmed.
          Start on the dashboard, activate one project, then return here.
        </Notice>
      ) : null}

      {portal.walletPhase === "authenticated" &&
      portal.selectedProject &&
      !portal.onchainSnapshot.projectAccountExists ? (
        <Notice tone="warning" title="Project activation still missing">
          This project exists in the control plane, but the on-chain activation is not confirmed yet.
          Funding only becomes useful once the project account is live on devnet.
        </Notice>
      ) : null}

      {hasLowBalance ? (
        <Notice tone="warning" title="Low balance warning">
          The project still has credits, but the remaining SOL buffer is low. Funding now is the
          safe move if the team is about to test the gateway more heavily.
        </Notice>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
          <CardHeader>
            <CardTitle>Funding request</CardTitle>
            <CardDescription>
              Amounts are in lamports for SOL and raw token units for USDC. 1 SOL = 1,000,000,000
              lamports.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              {(["SOL", "USDC"] as const).map((candidate) => (
                <Button
                  key={candidate}
                  variant={asset === candidate ? "primary" : "secondary"}
                  disabled={candidate === "USDC" && !webEnv.enableUsdc}
                  onClick={() => setAsset(candidate)}
                >
                  {candidate === "USDC" && !webEnv.enableUsdc ? "USDC (gated)" : candidate}
                </Button>
              ))}
            </div>

            {!webEnv.enableUsdc ? (
              <Notice tone="neutral" title="SOL is the live funding path">
                USDC stays configuration-gated until the devnet mint and treasury vault are
                explicitly enabled.
              </Notice>
            ) : null}

            <Input
              label={`Amount in ${asset === "SOL" ? "lamports" : "raw token units"}`}
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              hint={
                asset === "SOL"
                  ? "1 SOL = 1,000,000,000 lamports"
                  : "USDC uses 6 decimals on devnet"
              }
            />

            {asset === "USDC" ? (
              <Input
                label="Funder token account"
                value={tokenAccount}
                onChange={(event) => setTokenAccount(event.target.value)}
                hint="Required when funding with USDC."
              />
            ) : null}

            <Notice tone="neutral" title="Recommended first funding pass">
              Start with a small SOL amount, confirm it on devnet, then send one real relay request
              before topping up further.
            </Notice>

            <div className="flex flex-wrap gap-3">
              <Button
                variant="secondary"
                onClick={() =>
                  void portal.prepareFunding({
                    asset,
                    amount,
                    submit: false,
                    ...(tokenAccount ? { funderTokenAccount: tokenAccount } : {}),
                  })
                }
              >
                Prepare only
              </Button>
              <Button
                loading={
                  phase === "preparing" ||
                  phase === "awaiting_signature" ||
                  phase === "submitting"
                }
                onClick={() =>
                  void portal.prepareFunding({
                    asset,
                    amount,
                    submit: true,
                    ...(tokenAccount ? { funderTokenAccount: tokenAccount } : {}),
                  })
                }
              >
                Sign and send
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle>Transaction state</CardTitle>
                <CardDescription>
                  Every stage is explicit so you know whether the product is waiting on the API, the
                  wallet, or Solana confirmation.
                </CardDescription>
              </div>
              <Badge
                tone={
                  phase === "confirmed"
                    ? "success"
                    : phase === "error"
                      ? "danger"
                      : "neutral"
                }
              >
                {phase}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Notice
              tone={
                phase === "error" ? "danger" : phase === "confirmed" ? "success" : "neutral"
              }
              title="Current status"
            >
              {portal.transactionState.message}
            </Notice>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4">
                <div className="text-xs uppercase tracking-wider text-[var(--fyxvo-text-muted)]">
                  Treasury balance
                </div>
                <div className="mt-2 font-display text-xl font-semibold text-[var(--fyxvo-text)]">
                  {formatSol(portal.onchainSnapshot.treasurySolBalance)}
                </div>
              </div>
              <div className="rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4">
                <div className="text-xs uppercase tracking-wider text-[var(--fyxvo-text-muted)]">
                  Spendable SOL credits
                </div>
                <div className="mt-2 font-display text-xl font-semibold text-[var(--fyxvo-text)]">
                  {(Number(availableSolCredits) / 1_000_000_000).toFixed(3)} SOL
                </div>
              </div>
            </div>
            <div className="mt-2">
              <Link href="/transactions" className="text-sm text-[var(--fyxvo-brand)] hover:underline">
                View transaction history →
              </Link>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {[
                {
                  step: "1. Prepare",
                  body: "Ask the API for the unsigned transaction.",
                },
                {
                  step: "2. Sign",
                  body: "Approve it in the wallet with devnet selected.",
                },
                {
                  step: "3. Use it",
                  body: "Generate a key and send the first RPC request.",
                },
              ].map((item) => (
                <div
                  key={item.step}
                  className="rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4"
                >
                  <div className="text-xs uppercase tracking-wider text-brand-600 dark:text-brand-300">
                    {item.step}
                  </div>
                  <div className="mt-2 text-sm leading-6 text-[var(--fyxvo-text-soft)]">
                    {item.body}
                  </div>
                </div>
              ))}
            </div>

            {portal.transactionState.funding ? (
              <div className="space-y-4 rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-5">
                <div className="text-xs uppercase tracking-wider text-[var(--fyxvo-text-muted)]">
                  Prepared payload
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <div className="text-xs text-[var(--fyxvo-text-muted)]">Funding request ID</div>
                    <div className="mt-1 font-mono text-sm font-medium text-[var(--fyxvo-text)]">
                      {portal.transactionState.funding.fundingRequestId}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-[var(--fyxvo-text-muted)]">Asset</div>
                    <div className="mt-1 font-medium text-[var(--fyxvo-text)]">
                      {portal.transactionState.funding.asset}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <CopyButton
                    value={portal.transactionState.funding.transactionBase64}
                    label="Copy transaction"
                  />
                  <CopyButton
                    value={portal.transactionState.funding.projectPda}
                    label="Copy project PDA"
                  />
                </div>
              </div>
            ) : null}

            {phase === "confirmed" ? (
              <Notice tone="success" title="Next step after funding">
                Open API keys, create one relay key, then copy the request example and hit{" "}
                <code>/rpc</code> once to confirm analytics are updating.
              </Notice>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <Button asChild variant="secondary">
                <Link href="/api-keys">Open API keys</Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href="/docs">Funding docs</Link>
              </Button>
              {portal.transactionState.explorerUrl ? (
                <Button asChild variant="secondary">
                  <Link href={portal.transactionState.explorerUrl} target="_blank">
                    View on Solana Explorer
                  </Link>
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
