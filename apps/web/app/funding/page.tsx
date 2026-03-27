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
import { getFundingHistory, getProjectBudgetStatus } from "../../lib/api";
import { webEnv } from "../../lib/env";
import { formatRelativeDate, formatSol } from "../../lib/format";
import type { FundingHistoryItem, ProjectBudgetStatus } from "../../lib/types";
import { PRICING_LAMPORTS } from "@fyxvo/config/pricing";

const STD_PRICE_LAMPORTS = BigInt(PRICING_LAMPORTS.standard);
const CH_PRICE_LAMPORTS = BigInt(PRICING_LAMPORTS.computeHeavy);
const PRIORITY_PRICE_LAMPORTS = BigInt(PRICING_LAMPORTS.priority);
const DEPOSIT_FEE_BPS = 500;
const DEFAULT_RUNWAY_DAYS = 30;
const MAINNET_BETA_RESERVE_SOL = 100;
const MAINNET_BETA_LIQUIDITY_SOL = 50;
const MAINNET_BETA_OPS_SOL = 25;
const MAINNET_BETA_SAFETY_SOL = 25;

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
  const [plannerStandardDaily, setPlannerStandardDaily] = useState("100000");
  const [plannerComputeDaily, setPlannerComputeDaily] = useState("25000");
  const [plannerPriorityDaily, setPlannerPriorityDaily] = useState("10000");
  const [plannerRunwayDays, setPlannerRunwayDays] = useState(String(DEFAULT_RUNWAY_DAYS));
  const [history, setHistory] = useState<FundingHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [budgetStatus, setBudgetStatus] = useState<ProjectBudgetStatus | null>(null);

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
  const plannerStandardCount = Math.max(0, Number.parseInt(plannerStandardDaily || "0", 10) || 0);
  const plannerComputeCount = Math.max(0, Number.parseInt(plannerComputeDaily || "0", 10) || 0);
  const plannerPriorityCount = Math.max(0, Number.parseInt(plannerPriorityDaily || "0", 10) || 0);
  const plannerDays = Math.max(1, Number.parseInt(plannerRunwayDays || "0", 10) || DEFAULT_RUNWAY_DAYS);
  const plannerDailyLamports =
    BigInt(plannerStandardCount) * STD_PRICE_LAMPORTS +
    BigInt(plannerComputeCount) * CH_PRICE_LAMPORTS +
    BigInt(plannerPriorityCount) * PRIORITY_PRICE_LAMPORTS;
  const plannerTargetLamports = plannerDailyLamports * BigInt(plannerDays);
  const plannerGrossLamports = plannerTargetLamports * 10_000n / BigInt(10_000 - DEPOSIT_FEE_BPS);
  const plannerTargetSol = Number(plannerTargetLamports) / Number(SOL_DECIMALS);
  const plannerGrossSol = Number(plannerGrossLamports) / Number(SOL_DECIMALS);
  const plannerNeededLamports = plannerGrossLamports > availableSolCredits ? plannerGrossLamports - availableSolCredits : 0n;
  const plannerNeededSol = Number(plannerNeededLamports) / Number(SOL_DECIMALS);

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

  useEffect(() => {
    if (!portal.token || !portal.selectedProject) {
      setBudgetStatus(null);
      return;
    }
    let cancelled = false;
    getProjectBudgetStatus(portal.selectedProject.id, portal.token)
      .then((item) => {
        if (!cancelled) setBudgetStatus(item);
      })
      .catch(() => {
        if (!cancelled) setBudgetStatus(null);
      });
    return () => {
      cancelled = true;
    };
  }, [portal.selectedProject, portal.token]);

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

      {budgetStatus && (budgetStatus.dailyBudgetLamports || budgetStatus.monthlyBudgetLamports) ? (
        <section className="grid gap-4 md:grid-cols-2">
          <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
            <CardHeader>
              <CardTitle>Daily budget</CardTitle>
              <CardDescription>Billable live requests only. Simulation mode remains allowed.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--fyxvo-text-muted)]">Used today</span>
                <span className="font-mono text-[var(--fyxvo-text)]">{budgetStatus.dailySpendLamports.toLocaleString()} lamports</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--fyxvo-text-muted)]">Budget</span>
                <span className="font-mono text-[var(--fyxvo-text)]">{budgetStatus.dailyBudgetLamports ?? "Not set"}</span>
              </div>
              {budgetStatus.dailyUsagePct !== null ? (
                <div className="space-y-2">
                  <div className="h-2 rounded-full bg-[var(--fyxvo-panel-soft)]">
                    <div className="h-2 rounded-full bg-[var(--fyxvo-brand)]" style={{ width: `${Math.min(100, budgetStatus.dailyUsagePct)}%` }} />
                  </div>
                  <p className="text-xs text-[var(--fyxvo-text-muted)]">
                    {budgetStatus.dailyUsagePct.toFixed(1)}% used · warning at {budgetStatus.warningThresholdPct}%
                  </p>
                </div>
              ) : null}
            </CardContent>
          </Card>
          <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
            <CardHeader>
              <CardTitle>Monthly budget</CardTitle>
              <CardDescription>
                {budgetStatus.hardStop ? "Hard stop is enabled for billable live traffic." : "Hard stop is disabled. Alerts still trigger at the configured warning threshold."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--fyxvo-text-muted)]">Used this month</span>
                <span className="font-mono text-[var(--fyxvo-text)]">{budgetStatus.monthlySpendLamports.toLocaleString()} lamports</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--fyxvo-text-muted)]">Budget</span>
                <span className="font-mono text-[var(--fyxvo-text)]">{budgetStatus.monthlyBudgetLamports ?? "Not set"}</span>
              </div>
              {budgetStatus.monthlyUsagePct !== null ? (
                <div className="space-y-2">
                  <div className="h-2 rounded-full bg-[var(--fyxvo-panel-soft)]">
                    <div className="h-2 rounded-full bg-[var(--fyxvo-brand)]" style={{ width: `${Math.min(100, budgetStatus.monthlyUsagePct)}%` }} />
                  </div>
                  <p className="text-xs text-[var(--fyxvo-text-muted)]">{budgetStatus.monthlyUsagePct.toFixed(1)}% used</p>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </section>
      ) : null}

      {/* Devnet SOL helper */}
      <section className="rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-6 space-y-5">
        <div>
          <h3 className="text-base font-semibold text-[var(--fyxvo-text)]">Get Devnet SOL</h3>
          <p className="mt-1 text-sm text-[var(--fyxvo-text-muted)]">
            Devnet SOL is test currency for the current alpha evaluation flow. It is not real SOL, but it does validate the real request-accounting and usage path that the product will carry forward.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Notice tone="neutral" title="Current stage">
            Funding on devnet is the honest live path today. It lets teams validate project funding, request accounting, and gateway usage before mainnet.
          </Notice>
          <Notice tone="neutral" title="Why fund on devnet?">
            Funding on devnet proves the end-to-end flow: wallet signs, project treasury receives credits, gateway usage is charged, and analytics reflect real usage without asking teams to risk real capital yet.
          </Notice>
        </div>

        {portal.walletPhase === "authenticated" && portal.walletAddress ? (
          <div className="flex items-center gap-3 rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)] px-4 py-3">
            <span className="text-xs text-[var(--fyxvo-text-muted)] shrink-0">Your wallet</span>
            <code className="flex-1 truncate font-mono text-xs text-[var(--fyxvo-text)]">
              {portal.walletAddress}
            </code>
            <button
              type="button"
              onClick={() => void navigator.clipboard.writeText(portal.walletAddress ?? "")}
              className="shrink-0 rounded border border-[var(--fyxvo-border)] px-2 py-1 text-xs text-[var(--fyxvo-text-muted)] hover:bg-[var(--fyxvo-bg-elevated)] transition"
            >
              Copy
            </button>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <a
            href="https://faucet.solana.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)] px-4 py-2 text-sm font-medium text-[var(--fyxvo-text-muted)] hover:text-[var(--fyxvo-text)] transition-colors"
          >
            Solana Faucet &#8594;
          </a>
          <a
            href="https://solana.com/docs/clients/javascript-reference#connection-requestairdrop"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)] px-4 py-2 text-sm font-medium text-[var(--fyxvo-text-muted)] hover:text-[var(--fyxvo-text)] transition-colors"
          >
            Web3.js Airdrop &#8594;
          </a>
        </div>

        <div className="overflow-hidden rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)]">
          <div className="border-b border-[var(--fyxvo-border)] px-4 py-2">
            <span className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-text-muted)]">
              Programmatic airdrop (devnet only)
            </span>
          </div>
          <pre className="overflow-x-auto p-4 text-xs leading-6 text-[var(--fyxvo-text-soft)]">{`import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";

const connection = new Connection("https://api.devnet.solana.com");
const pubkey = new PublicKey("YOUR_WALLET_ADDRESS");
await connection.requestAirdrop(pubkey, 2 * LAMPORTS_PER_SOL);`}</pre>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <Card className="fyxvo-surface border-[color:var(--fyxvo-border)] xl:col-span-2">
          <CardHeader>
            <CardTitle>Paid beta reserve planner</CardTitle>
            <CardDescription>
              Best next step: operate a paid devnet beta first, then move to a limited mainnet beta only after governance and operations gates are closed.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Input
                  label="Standard requests / day"
                  inputMode="numeric"
                  value={plannerStandardDaily}
                  onChange={(event) => setPlannerStandardDaily(event.target.value)}
                  hint={`${PRICING_LAMPORTS.standard.toLocaleString()} lamports each`}
                />
                <Input
                  label="Compute-heavy / day"
                  inputMode="numeric"
                  value={plannerComputeDaily}
                  onChange={(event) => setPlannerComputeDaily(event.target.value)}
                  hint={`${PRICING_LAMPORTS.computeHeavy.toLocaleString()} lamports each`}
                />
                <Input
                  label="Priority / day"
                  inputMode="numeric"
                  value={plannerPriorityDaily}
                  onChange={(event) => setPlannerPriorityDaily(event.target.value)}
                  hint={`${PRICING_LAMPORTS.priority.toLocaleString()} lamports each`}
                />
                <Input
                  label="Runway days"
                  inputMode="numeric"
                  value={plannerRunwayDays}
                  onChange={(event) => setPlannerRunwayDays(event.target.value)}
                  hint="Use 30 for a calm beta reserve"
                />
              </div>

              <div className="rounded-[1.5rem] border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-text-muted)]">
                      Suggested reserve
                    </div>
                    <div className="mt-2 text-2xl font-semibold text-[var(--fyxvo-text)]">
                      {plannerGrossSol.toFixed(3)} SOL
                    </div>
                  </div>
                  <Badge tone={plannerNeededLamports > 0n ? "warning" : "success"}>
                    {plannerNeededLamports > 0n ? `${plannerNeededSol.toFixed(3)} SOL short` : "Current balance covers it"}
                  </Badge>
                </div>
                <div className="mt-4 space-y-2 text-sm text-[var(--fyxvo-text-soft)]">
                  <div className="flex items-center justify-between gap-3">
                    <span>Usable traffic reserve</span>
                    <span className="font-mono text-[var(--fyxvo-text)]">{plannerTargetSol.toFixed(3)} SOL</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Gross with current 5% fee path</span>
                    <span className="font-mono text-[var(--fyxvo-text)]">{plannerGrossSol.toFixed(3)} SOL</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Current spendable credits</span>
                    <span className="font-mono text-[var(--fyxvo-text)]">{(Number(availableSolCredits) / Number(SOL_DECIMALS)).toFixed(3)} SOL</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <Notice tone="neutral" title="Recommended now: paid devnet beta">
                Use small but real devnet funding, enforce budgets and hard stops, verify alerts, and prove one repeatable request workflow with real teams before talking about mainnet revenue.
              </Notice>
              <Notice tone="neutral" title="Recommended later: limited mainnet beta">
                A conservative founder reserve is about {MAINNET_BETA_RESERVE_SOL} SOL total: {MAINNET_BETA_LIQUIDITY_SOL} SOL for traffic liquidity, {MAINNET_BETA_OPS_SOL} SOL for ops and incident buffer, and {MAINNET_BETA_SAFETY_SOL} SOL for treasury and reconciliation safety margin.
              </Notice>
              <Notice tone="warning" title="Do not skip the gates">
                Mainnet beta should wait for governed authority control, migration discipline, treasury reconciliation, incident drills, and clear support ownership. Those are operational gates, not marketing milestones.
              </Notice>
            </div>
          </CardContent>
        </Card>

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
                SOL on devnet is the live alpha funding path today. Real-SOL and USDC expansion still matter, but they are not being overstated before they are live.
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
                  <div className="text-xs uppercase tracking-wider text-[var(--fyxvo-brand)]">
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
