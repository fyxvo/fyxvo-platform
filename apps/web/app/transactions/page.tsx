"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Notice } from "@fyxvo/ui";
import { PageHeader } from "../../components/page-header";
import { AuthGate } from "../../components/state-panels";
import { usePortal } from "../../components/portal-provider";
import { getFundingHistory } from "../../lib/api";
import { formatRelativeDate } from "../../lib/format";
import type { FundingHistoryItem } from "../../lib/types";

const PAGE_SIZE = 20;

export default function TransactionsPage() {
  const portal = usePortal();
  const [items, setItems] = useState<FundingHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);

  useEffect(() => {
    if (!portal.token) return;
    let cancelled = false;
    const token = portal.token;
    Promise.resolve().then(() => {
      if (!cancelled) setLoading(true);
    });
    getFundingHistory(token)
      .then((data) => {
        if (!cancelled) setItems(data);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [portal.token]);

  const totalPages = Math.ceil(items.length / PAGE_SIZE);
  const pageItems = items.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  function shortenSig(sig: string) {
    return `${sig.slice(0, 8)}…${sig.slice(-8)}`;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Transactions"
        title="Funding history across all projects."
        description="All SOL funding transactions prepared and confirmed through the Fyxvo portal."
        actions={
          <Button asChild variant="secondary" size="sm">
            <Link href="/funding">Open funding</Link>
          </Button>
        }
      />

      {portal.walletPhase !== "authenticated" ? (
        <AuthGate body="Connect a wallet to view funding transaction history." />
      ) : null}

      <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
        <CardHeader>
          <CardTitle>Transaction history</CardTitle>
          <CardDescription>
            SOL deposits across all projects, ordered by date. Click a signature to view on Solana Explorer.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-12 animate-pulse rounded-lg bg-[var(--fyxvo-panel-soft)]" />
              ))}
            </div>
          ) : items.length === 0 && portal.walletPhase === "authenticated" ? (
            <Notice tone="neutral" title="No transactions yet">
              Fund a project to see transactions here.{" "}
              <Link href="/funding" className="underline">Open funding</Link>
            </Notice>
          ) : pageItems.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-[var(--fyxvo-border)]">
                    <tr>
                      <th className="pb-3 text-left text-xs font-medium uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">Date</th>
                      <th className="pb-3 text-left text-xs font-medium uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">Project</th>
                      <th className="pb-3 text-left text-xs font-medium uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">Type</th>
                      <th className="pb-3 text-right text-xs font-medium uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">Amount</th>
                      <th className="pb-3 text-left text-xs font-medium uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">Signature</th>
                      <th className="pb-3 text-left text-xs font-medium uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--fyxvo-border)]">
                    {pageItems.map((item) => (
                      <tr key={item.id} className="text-[var(--fyxvo-text-soft)]">
                        <td className="py-3 text-xs text-[var(--fyxvo-text-muted)]">
                          {formatRelativeDate(item.createdAt)}
                        </td>
                        <td className="py-3 font-medium text-[var(--fyxvo-text)]">
                          {item.projectName}
                        </td>
                        <td className="py-3 text-xs uppercase tracking-[0.12em]">
                          {item.asset} deposit
                        </td>
                        <td className="py-3 text-right font-mono text-xs text-[var(--fyxvo-text)]">
                          {item.amount}
                        </td>
                        <td className="py-3">
                          {item.transactionSignature ? (
                            <a
                              href={`https://explorer.solana.com/tx/${item.transactionSignature}?cluster=devnet`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-mono text-xs text-[var(--fyxvo-brand)] hover:underline"
                            >
                              {shortenSig(item.transactionSignature)}
                            </a>
                          ) : (
                            <span className="text-xs text-[var(--fyxvo-text-muted)]">Pending</span>
                          )}
                        </td>
                        <td className="py-3">
                          <Badge
                            tone={item.confirmedAt ? "success" : item.status === "failed" ? "danger" : "neutral"}
                          >
                            {item.confirmedAt ? "confirmed" : item.status ?? "pending"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                  >
                    Previous
                  </Button>
                  <span className="text-xs text-[var(--fyxvo-text-muted)]">
                    Page {page + 1} of {totalPages}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
