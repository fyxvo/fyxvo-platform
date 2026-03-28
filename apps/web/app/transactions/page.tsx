"use client";

import { useEffect, useState } from "react";
import { usePortal } from "../../components/portal-provider";
import { WalletConnectButton } from "../../components/wallet-connect-button";

const API = "https://api.fyxvo.com";

interface Transaction {
  readonly id: string;
  readonly type: string;
  readonly lamports: number;
  readonly timestamp: string;
  readonly signature: string;
}

interface PageMeta {
  readonly total: number;
  readonly page: number;
  readonly limit: number;
  readonly pages: number;
}

function TypeBadge({ type }: { readonly type: string }) {
  const colors: Record<string, string> = {
    funding: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    withdrawal: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    fee: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    transfer: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  };
  const cls = colors[type.toLowerCase()] ?? "bg-white/[0.05] text-[#64748b] border-white/[0.08]";
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-semibold border ${cls}`}>
      {type}
    </span>
  );
}

function formatSol(lamports: number): string {
  return `${(lamports / 1e9).toFixed(4)} SOL`;
}

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      <td className="px-4 py-3">
        <div className="h-5 w-16 rounded bg-white/[0.06]" />
      </td>
      <td className="px-4 py-3">
        <div className="h-4 w-24 rounded bg-white/[0.06]" />
      </td>
      <td className="px-4 py-3">
        <div className="h-4 w-32 rounded bg-white/[0.04]" />
      </td>
      <td className="px-4 py-3">
        <div className="h-4 w-20 rounded bg-white/[0.04]" />
      </td>
    </tr>
  );
}

export default function TransactionsPage() {
  const portal = usePortal();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!portal.token) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API}/v1/transactions?page=${page}&limit=20`, {
          headers: { Authorization: `Bearer ${portal.token}` },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json() as
          | Transaction[]
          | { transactions?: Transaction[]; meta?: PageMeta };
        if (Array.isArray(data)) {
          setTransactions(data);
        } else {
          setTransactions(data.transactions ?? []);
          setMeta(data.meta ?? null);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load transactions");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [page, portal.token]);

  if (portal.walletPhase !== "authenticated") {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-[#f1f5f9]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
          <div className="flex flex-col items-center gap-6 pt-20 text-center">
            <p className="text-[#64748b]">Connect your wallet to view transactions.</p>
            <WalletConnectButton />
          </div>
        </div>
      </div>
    );
  }

  const totalPages = meta?.pages ?? 1;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-[#f1f5f9]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-[#f1f5f9]">Transactions</h1>
          <p className="text-[#64748b] mt-1">On-chain funding and fee transactions.</p>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 px-5 py-4 text-sm text-rose-300">
            {error}
          </div>
        )}

        {/* Table */}
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left px-4 py-3 font-medium text-[#64748b]">Type</th>
                <th className="text-left px-4 py-3 font-medium text-[#64748b]">Amount</th>
                <th className="text-left px-4 py-3 font-medium text-[#64748b]">Timestamp</th>
                <th className="text-left px-4 py-3 font-medium text-[#64748b]">Explorer</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {loading ? (
                Array.from({ length: 10 }).map((_, i) => <SkeletonRow key={i} />)
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-[#64748b] text-sm">
                    No transactions yet.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3">
                      <TypeBadge type={tx.type} />
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
                          View on Explorer
                        </a>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-sm text-[#64748b] hover:text-[#f1f5f9] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <span className="text-sm text-[#64748b]">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-sm text-[#64748b] hover:text-[#f1f5f9] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
