"use client";

import { Button, Card, CardContent, CardHeader, CardTitle, Notice } from "@fyxvo/ui";
import { useState } from "react";
import { AuthGate } from "../../components/state-panels";
import { usePortal } from "../../lib/portal-context";
import type { FundingPreparation } from "../../lib/types";

export default function FundingPage() {
  const { selectedProject, prepareFunding, fundingPreparation, setFundingPreparation } =
    usePortal();

  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localPrep, setLocalPrep] = useState<FundingPreparation | null>(fundingPreparation);

  const handlePrepareOnly = async () => {
    if (!selectedProject) return;
    setPreparing(true);
    setError(null);
    try {
      const prep = await prepareFunding({ asset: "SOL", amount: "1000000000", submit: false });
      setLocalPrep(prep);
      setFundingPreparation(prep);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Preparation failed");
    } finally {
      setPreparing(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <AuthGate>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--fyxvo-text)]">
              Fund Project
            </h1>
            <p className="mt-1 text-sm text-[var(--fyxvo-text-muted)]">
              Deposit SOL or USDC to your project treasury on-chain.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Prepare funding transaction</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-[var(--fyxvo-text-muted)]">
                  Prepare an unsigned transaction to fund{" "}
                  <strong className="text-[var(--fyxvo-text)]">
                    {selectedProject?.name ?? "your project"}
                  </strong>{" "}
                  with 1 SOL.
                </p>

                {error ? (
                  <Notice tone="danger">{error}</Notice>
                ) : null}

                {localPrep ? (
                  <div className="space-y-3">
                    <Notice tone="success">
                      Unsigned transaction prepared. You can now review, copy, or sign it in the
                      connected wallet.
                    </Notice>
                    <div className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4 space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-[var(--fyxvo-text-muted)]">Request ID</span>
                        <span className="font-mono text-[var(--fyxvo-text)]">
                          {localPrep.fundingRequestId}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[var(--fyxvo-text-muted)]">Asset</span>
                        <span className="text-[var(--fyxvo-text)]">{localPrep.asset}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[var(--fyxvo-text-muted)]">Amount (lamports)</span>
                        <span className="text-[var(--fyxvo-text)]">{localPrep.amount}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          void navigator.clipboard.writeText(localPrep.transactionBase64);
                        }}
                      >
                        Copy transaction
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setLocalPrep(null);
                          setFundingPreparation(null);
                        }}
                      >
                        Reset
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="primary"
                    onClick={() => void handlePrepareOnly()}
                    loading={preparing}
                    disabled={preparing || !selectedProject}
                  >
                    Prepare only
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </AuthGate>
    </div>
  );
}
