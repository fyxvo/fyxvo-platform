"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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
import { getFundingHistory } from "../../lib/api";
import { webEnv } from "../../lib/env";
import { formatRelativeDate, formatSol } from "../../lib/format";
import type { FundingHistoryItem } from "../../lib/types";
import { PRICING_LAMPORTS } from "@fyxvo/config";

const STD_PRICE_LAMPORTS = BigInt(PRICING_LAMPORTS.standard);
const CH_PRICE_LAMPORTS = BigInt(PRICING_LAMPORTS.computeHeavy);
const PRIORITY_PRICE_LAMPORTS = BigInt(PRICING_LAMPORTS.priority);

function estimateRequests(lamports: bigint): { standard: string; computeHeavy: string; priority: string } {
  function fmt(n: bigint): string {
    if (n > 1_000_000n) return `~${(Number(n) / 1_000_000).toFixed(1)}M`;
    if (n > 1_000n) return `~${(Number(n) / 1_000).toFixed(0)}k`;
    return `~${n.toString()}`;
  }
  if (lamports <= 0n) return { standard: "0", computeHeavy: "0", priority: "0" };
  return {
    standard: fmt(lamports / STD_PRICE_LAMPORTS),
    computeHeavy: fmt(lamports / CH_PRICE_LAMPORTS),
    priority: fmt(lamports / PRIORITY_PRICE_LAMPORTS)
  };
}

// Pricing: 1000 lamports per standard request → 1 SOL = 1,000,000 requests
const LAMPORTS_PER_REQUEST = 1000n;
const SOL_DECIMALS = 1_000_000_000n;

export default function FundingPage() {
  const portal = usePortal();
  const [asset, setAsset] = useState<"SOL" | "USDC">("SOL");
  const [amount, setAmount] = useState("1000000000");
  const [tokenAccount, setTokenAccount] = useState("");
  const [history, setHistory] = useState<FundingHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const availableSolCredits = (() => {
    try {
      return BigInt(portal.onchainSnapshot.balances?.availableSolCredits ?? "0");
    } catch {
      return 0n;
    }
  })();

  const isDefaultEstimate = !portal.projectAnalytics?.totals?.requestLogs;
  const dailyRequests = portal.projectAnalytics?.totals?.requestLogs
    ? Math.round(portal.projectAnalytics.totals.requestLogs / 7)
    : 1000;

  const balanceLamports = availableSolCredits;

  const dailyCostLamports = BigInt(dailyRequests) * LAMPORTS_PER_REQUEST;
  const daysRunway =
    dailyCostLamports > 0n ? Math.floor(Number(balanceLamports / dailyCostLamports)) : null;

  const recommendedRawLamports = dailyCostLamports * 30n - balanceLamports;
  const recommendedSol =
    recommendedRawLamports > 0n
      ? (Number(recommendedRawLamports) / Number(SOL_DECIMALS)).toFixed(4)
      : null;
  const hasLowBalance = availableSolCredits > 0n && availableSolCredits < 100_000_000n;
  const phase = portal.transactionState.phase;

  const amountLamports = (() => {
    try { return BigInt(amount); } catch { return 0n; }
  })();

  useEffect(() => {
    if (!portal.token) return;
    let cancelled = false;
    setLoadingHistory(true);
    getFundingHistory(portal.token)
      .then((items) => { if (!cancelled) setHistory(items); })
      .catch(() => { if (!cancelled) setHistory([]); })
      .finally(() => { if (!cancelled) setLoadingHistory(false); });
    return () => { cancelled = true; };
  }, [portal.token]);

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
                  ? (() => {
                      const est = estimateRequests(amountLamports);
                      return `1 SOL = 1,000,000,000 lam · ${est.standard} standard · ${est.computeHeavy} compute-heavy · ${est.priority} priority requests`;
                    })()
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

      <div className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-6">
        <h3 className="text-sm font-semibold text-[var(--fyxvo-text)]">Usage estimator</h3>
        {isDefaultEstimate && (
          <p className="mt-1 text-xs text-[var(--fyxvo-text-muted)] opacity-70">
            Based on a default estimate of 1,000 requests/day (no usage history yet).
          </p>
        )}
        <dl className="mt-4 grid grid-cols-3 gap-4">
          <div>
            <dt className="text-xs text-[var(--fyxvo-text-muted)]">Daily requests</dt>
            <dd className="mt-1 text-lg font-semibold text-[var(--fyxvo-text)]">
              {dailyRequests.toLocaleString()}
              {isDefaultEstimate && (
                <span className="ml-1 text-xs font-normal text-[var(--fyxvo-text-muted)]">est.</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--fyxvo-text-muted)]">Days of runway</dt>
            <dd className="mt-1 text-lg font-semibold text-[var(--fyxvo-text)]">
              {daysRunway !== null ? `${daysRunway}d` : "\u221e"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--fyxvo-text-muted)]">Rec. top-up (30d)</dt>
            <dd className="mt-1 text-lg font-semibold text-[var(--fyxvo-text)]">
              {recommendedSol !== null ? `${recommendedSol} SOL` : "None needed"}
            </dd>
          </div>
        </dl>
      </div>

      {portal.walletPhase === "authenticated" && (
        <section>
          <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
            <CardHeader>
              <CardTitle>Funding history</CardTitle>
              <CardDescription>
                All funding events for your projects, newest first. Confirmed transactions include a
                Solana Explorer link.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingHistory ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-12 animate-pulse rounded-lg bg-[var(--fyxvo-panel-soft)]" />
                  ))}
                </div>
              ) : history.length === 0 ? (
                <Notice tone="neutral" title="No funding events yet">
                  Your funding history will appear here after the first SOL transaction confirms.
                </Notice>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-[var(--fyxvo-border)]">
                      <tr>
                        <th className="pb-3 text-left text-xs font-medium uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">Date</th>
                        <th className="pb-3 text-left text-xs font-medium uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">Project</th>
                        <th className="pb-3 text-left text-xs font-medium uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">Asset</th>
                        <th className="pb-3 text-right text-xs font-medium uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">Amount</th>
                        <th className="pb-3 text-left text-xs font-medium uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">Status</th>
                        <th className="pb-3 text-left text-xs font-medium uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">Explorer</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--fyxvo-border)]">
                      {history.map((item) => (
                        <tr key={item.id} className="text-[var(--fyxvo-text-soft)]">
                          <td className="py-3 text-xs">{formatRelativeDate(item.createdAt)}</td>
                          <td className="py-3 text-xs font-medium text-[var(--fyxvo-text)]">{item.projectName}</td>
                          <td className="py-3 text-xs uppercase">{item.asset}</td>
                          <td className="py-3 text-right font-mono text-xs">
                            {item.asset === "SOL"
                              ? `${(Number(BigInt(item.amount)) / 1_000_000_000).toFixed(3)} SOL`
                              : item.amount}
                          </td>
                          <td className="py-3 text-xs">
                            <Badge
                              tone={
                                item.status === "CONFIRMED"
                                  ? "success"
                                  : item.status === "FAILED"
                                  ? "danger"
                                  : "neutral"
                              }
                            >
                              {item.status.toLowerCase()}
                            </Badge>
                          </td>
                          <td className="py-3 text-xs">
                            {item.transactionSignature ? (
                              <Link
                                href={`https://explorer.solana.com/tx/${item.transactionSignature}?cluster=devnet`}
                                target="_blank"
                                rel="noreferrer"
                                className="font-mono text-[var(--fyxvo-brand)] hover:underline"
                              >
                                {item.transactionSignature.slice(0, 8)}…
                              </Link>
                            ) : (
                              <span className="text-[var(--fyxvo-text-muted)]">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
}
