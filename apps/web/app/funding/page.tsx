"use client";

import { useEffect, useState } from "react";
import { usePortal } from "../../components/portal-provider";
import { AuthGate } from "../../components/state-panels";
import { webEnv } from "../../lib/env";

const API = "https://api.fyxvo.com";

interface OnchainBalance {
  readonly lamports: number;
  readonly sol: number;
}

interface ProjectBalance {
  readonly projectId: string;
  readonly balance: OnchainBalance | null;
  readonly loading: boolean;
}

interface Transaction {
  readonly id: string;
  readonly type: string;
  readonly lamports: number;
  readonly timestamp: string;
  readonly signature: string;
}

function formatSol(lamports: number): string {
  return `${(lamports / 1e9).toFixed(4)} SOL`;
}

function PhaseIndicator({ phase }: { readonly phase: string }) {
  const steps = [
    { key: "idle", label: "Ready" },
    { key: "preparing", label: "Preparing" },
    { key: "awaiting_signature", label: "Awaiting signature" },
    { key: "submitting", label: "Submitting" },
    { key: "confirmed", label: "Confirmed" },
  ];

  const activeIndex = steps.findIndex((s) => s.key === phase);

  return (
    <div className="flex items-center gap-2">
      {steps.filter((s) => s.key !== "idle").map((step, i) => {
        const idx = i + 1;
        const done = activeIndex >= idx;
        const active = activeIndex === idx;
        return (
          <div key={step.key} className="flex items-center gap-2">
            {i > 0 && (
              <div className={`h-px w-6 ${done ? "bg-[#f97316]" : "bg-white/[0.08]"}`} />
            )}
            <div className="flex flex-col items-center gap-1">
              <div
                className={`h-2 w-2 rounded-full ${
                  active
                    ? "bg-[#f97316] animate-pulse"
                    : done
                      ? "bg-[#f97316]"
                      : "bg-white/[0.15]"
                }`}
              />
              <span className={`text-xs ${active || done ? "text-[#f97316]" : "text-[#64748b]"}`}>
                {step.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function FundingPage() {
  const portal = usePortal();
  const [selectedProjectId, setSelectedProjectId] = useState(() => portal.selectedProject?.id ?? "");
  const [amount, setAmount] = useState("1000000000");
  const [asset, setAsset] = useState<"SOL" | "USDC">("SOL");
  const [balances, setBalances] = useState<Record<string, ProjectBalance>>({});
  const [txHistory, setTxHistory] = useState<Transaction[]>([]);
  const [txLoading, setTxLoading] = useState(false);

  // Fetch on-chain balances per project
  useEffect(() => {
    if (!portal.token || portal.projects.length === 0) return;
    for (const proj of portal.projects) {
      fetch(`${API}/v1/projects/${proj.id}/onchain`, {
        headers: { Authorization: `Bearer ${portal.token ?? ""}` },
      })
        .then(async (res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json() as { balance?: OnchainBalance } | OnchainBalance;
          const balance: OnchainBalance | null =
            data && typeof data === "object" && "lamports" in data
              ? (data as OnchainBalance)
              : (data as { balance?: OnchainBalance }).balance ?? null;
          setBalances((prev) => ({
            ...prev,
            [proj.id]: { projectId: proj.id, balance, loading: false },
          }));
        })
        .catch(() => {
          setBalances((prev) => ({
            ...prev,
            [proj.id]: { projectId: proj.id, balance: null, loading: false },
          }));
        });
    }
  }, [portal.projects, portal.token]);

  // Fetch transaction history
  useEffect(() => {
    if (!portal.token) return;
    fetch(`${API}/v1/transactions`, {
      headers: { Authorization: `Bearer ${portal.token}` },
    })
      .then(async (res) => {
        if (!res.ok) return;
        const data = await res.json() as Transaction[] | { transactions?: Transaction[] };
        if (Array.isArray(data)) {
          setTxHistory(data);
        } else {
          setTxHistory(data.transactions ?? []);
        }
      })
      .catch(() => {})
      .finally(() => setTxLoading(false));
  }, [portal.token]);

  function handleFund() {
    if (!selectedProjectId || !amount) return;
    void portal.prepareFunding({
      asset,
      amount,
      submit: true,
    });
  }

  function handlePrepareOnly() {
    if (!selectedProjectId || !amount) return;
    void portal.prepareFunding({
      asset,
      amount,
      submit: false,
    });
  }

  if (portal.walletPhase !== "authenticated") {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
        <AuthGate body="Funding uses the same wallet proof as the API session, so you only have to connect once." />
      </div>
    );
  }

  const txPhase = portal.transactionState.phase;
  const isBusy =
    txPhase === "preparing" ||
    txPhase === "ready" ||
    txPhase === "awaiting_signature" ||
    txPhase === "submitting";
  const isConfirmed = txPhase === "confirmed";
  const isError = txPhase === "error";

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-[#f1f5f9]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 space-y-10">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-[#f1f5f9]">Fund project</h1>
          <p className="text-[#64748b] mt-1">
            Add SOL to your project treasury to pay for relay requests.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Fund form */}
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 space-y-5">
            <h2 className="text-base font-semibold text-[#f1f5f9]">Add funds</h2>

            {/* Project selector */}
            <div>
              <label className="block text-xs font-medium text-[#64748b] mb-1">Project</label>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full rounded-xl border border-white/[0.08] bg-[#0a0a0f] px-3 py-2 text-sm text-[#f1f5f9] focus:outline-none focus:border-[#f97316]/50"
              >
                <option value="">Select project</option>
                {portal.projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.displayName ?? p.name}
                  </option>
                ))}
              </select>
              {selectedProjectId && balances[selectedProjectId] && (
                <p className="mt-1 text-xs text-[#64748b]">
                  Current balance:{" "}
                  {balances[selectedProjectId]?.loading
                    ? "Loading…"
                    : balances[selectedProjectId]?.balance
                      ? formatSol(balances[selectedProjectId].balance!.lamports)
                      : "—"}
                </p>
              )}
            </div>

            {/* Asset selector */}
            <div>
              <label className="block text-xs font-medium text-[#64748b] mb-1">Asset</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setAsset("SOL")}
                  className={`flex-1 rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                    asset === "SOL"
                      ? "border-[#f97316]/50 bg-[#f97316]/10 text-[#f97316]"
                      : "border-white/[0.08] bg-white/[0.03] text-[#64748b] hover:text-[#f1f5f9]"
                  }`}
                >
                  SOL
                </button>
                {webEnv.enableUsdc && (
                  <button
                    onClick={() => setAsset("USDC")}
                    className={`flex-1 rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                      asset === "USDC"
                        ? "border-[#f97316]/50 bg-[#f97316]/10 text-[#f97316]"
                        : "border-white/[0.08] bg-white/[0.03] text-[#64748b] hover:text-[#f1f5f9]"
                    }`}
                  >
                    USDC
                  </button>
                )}
              </div>
            </div>

            {/* Amount input */}
            <div>
              <label className="block text-xs font-medium text-[#64748b] mb-1">
                Amount ({asset})
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.1"
                min="0"
                step="0.001"
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm font-mono text-[#f1f5f9] placeholder-[#64748b] focus:outline-none focus:border-[#f97316]/50"
              />
              {amount && (
                <p className="mt-1 text-xs text-[#64748b]">
                  ≈ {Math.round(parseFloat(amount || "0") * 1e9).toLocaleString()} lamports
                </p>
              )}
            </div>

            {/* Phase indicator */}
            {txPhase !== "idle" && (
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 overflow-x-auto">
                <PhaseIndicator phase={txPhase} />
                {portal.transactionState.message && (
                  <p className="mt-3 text-xs text-[#64748b]">{portal.transactionState.message}</p>
                )}
                {portal.transactionState.funding?.fundingRequestId && (
                  <p className="mt-1 font-mono text-xs text-[#64748b]">
                    {portal.transactionState.funding.fundingRequestId}
                  </p>
                )}
              </div>
            )}

            {/* Confirmed */}
            {isConfirmed && portal.transactionState.explorerUrl && (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                <p className="text-sm text-emerald-400 font-medium mb-2">Transaction confirmed!</p>
                <a
                  href={portal.transactionState.explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#f97316] hover:text-[#ea6c0a] transition-colors"
                >
                  View on Solana Explorer →
                </a>
              </div>
            )}

            {/* Error */}
            {isError && (
              <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-sm text-rose-300">
                {portal.transactionState.message || "Transaction failed."}
              </div>
            )}

            {/* Fund buttons */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handlePrepareOnly}
                disabled={isBusy || !selectedProjectId || !amount}
                className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm font-medium text-[#64748b] hover:text-[#f1f5f9] hover:border-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Prepare only
              </button>
              <button
                type="button"
                onClick={handleFund}
                disabled={isBusy || !selectedProjectId || !amount}
                className="flex-1 rounded-xl bg-[#f97316] px-4 py-3 text-sm font-semibold text-white hover:bg-[#ea6c0a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isBusy ? "Processing…" : `Fund with ${amount || "0"} ${asset}`}
              </button>
            </div>
          </div>

          {/* Project balances */}
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-[#f1f5f9]">Project balances</h2>
            {portal.projects.length === 0 ? (
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-6 py-10 text-center text-sm text-[#64748b]">
                No projects yet.
              </div>
            ) : (
              portal.projects.map((proj) => {
                const b = balances[proj.id];
                return (
                  <div
                    key={proj.id}
                    className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium text-[#f1f5f9]">
                        {proj.displayName ?? proj.name}
                      </p>
                      <p className="text-xs text-[#64748b] font-mono">{proj.slug}</p>
                    </div>
                    <div className="text-right">
                      {b?.loading ? (
                        <div className="animate-pulse h-5 w-20 rounded bg-white/[0.06]" />
                      ) : b?.balance ? (
                        <p className="text-sm font-mono text-[#f1f5f9]">
                          {formatSol(b.balance.lamports)}
                        </p>
                      ) : (
                        <p className="text-sm text-[#64748b]">—</p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Transaction history */}
        <div>
          <h2 className="text-lg font-semibold text-[#f1f5f9] mb-4">Recent transactions</h2>
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left px-4 py-3 font-medium text-[#64748b]">Type</th>
                  <th className="text-left px-4 py-3 font-medium text-[#64748b]">Amount</th>
                  <th className="text-left px-4 py-3 font-medium text-[#64748b]">Time</th>
                  <th className="text-left px-4 py-3 font-medium text-[#64748b]">Explorer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {txLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-4 py-3">
                        <div className="h-5 w-14 rounded bg-white/[0.06]" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="h-4 w-20 rounded bg-white/[0.04]" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="h-4 w-28 rounded bg-white/[0.04]" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="h-4 w-16 rounded bg-white/[0.04]" />
                      </td>
                    </tr>
                  ))
                ) : txHistory.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-[#64748b] text-sm">
                      No transactions yet.
                    </td>
                  </tr>
                ) : (
                  txHistory.slice(0, 20).map((tx) => (
                    <tr key={tx.id} className="hover:bg-white/[0.02]">
                      <td className="px-4 py-3">
                        <span className="inline-block rounded px-2 py-0.5 text-xs font-semibold border bg-white/[0.05] text-[#64748b] border-white/[0.08]">
                          {tx.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-[#f1f5f9]">
                        {formatSol(tx.lamports)}
                      </td>
                      <td className="px-4 py-3 text-xs text-[#64748b]">
                        {new Date(tx.timestamp).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        {tx.signature && (
                          <a
                            href={`https://explorer.solana.com/tx/${tx.signature}?cluster=devnet`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-[#f97316] hover:text-[#ea6c0a] transition-colors"
                          >
                            View
                          </a>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
