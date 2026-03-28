"use client";

import { useCallback, useEffect, useState } from "react";
import { LoadingSkeleton } from "../../components/loading-skeleton";
import { RetryBanner } from "../../components/retry-banner";
import { AuthGate } from "../../components/state-panels";
import { getTransactions } from "../../lib/api";
import { usePortal } from "../../lib/portal-context";
import type { TransactionHistoryItem } from "../../lib/types";

function explorerUrl(signature: string) {
  return `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
}

export default function TransactionsPage() {
  const { token } = usePortal();
  const [items, setItems] = useState<TransactionHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTransactions = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);

    try {
      setItems(await getTransactions(token));
    } catch (loadError) {
      setItems([]);
      setError(
        loadError instanceof Error ? loadError.message : "Unable to load transaction history."
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadTransactions();
  }, [loadTransactions]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <AuthGate>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--fyxvo-text)]">
              Transactions
            </h1>
            <p className="mt-1 text-sm text-[var(--fyxvo-text-muted)]">
              Review funding events across your projects and jump directly into Solana Explorer for
              confirmed signatures.
            </p>
          </div>

          {error ? <RetryBanner message={error} onRetry={() => void loadTransactions()} /> : null}

          {loading ? (
            <div className="space-y-4">
              <LoadingSkeleton className="h-20 rounded-2xl" />
              <LoadingSkeleton className="h-20 rounded-2xl" />
              <LoadingSkeleton className="h-20 rounded-2xl" />
            </div>
          ) : items.length > 0 ? (
            <div className="overflow-x-auto rounded-[2rem] border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)]">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--fyxvo-border)] text-left text-[var(--fyxvo-text-muted)]">
                    <th className="px-4 py-3 font-medium">Project</th>
                    <th className="px-4 py-3 font-medium">Asset</th>
                    <th className="px-4 py-3 font-medium">Amount</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Created</th>
                    <th className="px-4 py-3 font-medium">Explorer</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b border-[var(--fyxvo-border)] last:border-b-0">
                      <td className="px-4 py-3 text-[var(--fyxvo-text)]">{item.projectName}</td>
                      <td className="px-4 py-3 text-[var(--fyxvo-text-soft)]">{item.asset}</td>
                      <td className="px-4 py-3 text-[var(--fyxvo-text-soft)]">{item.amount}</td>
                      <td className="px-4 py-3 text-[var(--fyxvo-text-soft)]">{item.status}</td>
                      <td className="px-4 py-3 text-[var(--fyxvo-text-soft)]">
                        {new Date(item.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-[var(--fyxvo-text-soft)]">
                        {item.transactionSignature ? (
                          <a
                            href={explorerUrl(item.transactionSignature)}
                            target="_blank"
                            rel="noreferrer"
                            className="font-medium text-[var(--fyxvo-brand)] transition-colors hover:text-[var(--fyxvo-text)]"
                          >
                            View transaction
                          </a>
                        ) : (
                          "Pending"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-[2rem] border border-dashed border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-8 text-center">
              <p className="text-base font-medium text-[var(--fyxvo-text)]">
                No transaction history yet
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--fyxvo-text-muted)]">
                Funding events will appear here after a project treasury is prepared, signed, and
                verified on Solana devnet.
              </p>
            </div>
          )}
        </div>
      </AuthGate>
    </div>
  );
}
