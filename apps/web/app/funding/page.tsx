"use client";

import { useMemo, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Button, Card, CardContent, CardHeader, CardTitle, Notice } from "@fyxvo/ui";
import { verifyFunding } from "../../lib/api";
import { usePortal } from "../../lib/portal-context";
import { signAndSubmitVersionedTransaction, solToLamportsString } from "../../lib/solana-transactions";
import type { FundingVerification } from "../../lib/types";
import { AddressLink } from "../../components/address-link";
import { AuthGate } from "../../components/state-panels";

export default function FundingPage() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const {
    token,
    selectedProject,
    prepareFunding,
    fundingPreparation,
    setFundingPreparation,
  } = usePortal();

  const [amountSol, setAmountSol] = useState("1");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verification, setVerification] = useState<FundingVerification | null>(null);

  const lamportsPreview = useMemo(() => {
    try {
      return solToLamportsString(amountSol);
    } catch {
      return null;
    }
  }, [amountSol]);

  async function handleFund() {
    if (!selectedProject || !token || !wallet.publicKey) {
      setError("Select a project and reconnect your wallet before funding.");
      return;
    }

    if (!wallet.signTransaction) {
      setError("This wallet does not support transaction signing.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setVerification(null);

    try {
      const preparation = await prepareFunding({
        asset: "SOL",
        amount: solToLamportsString(amountSol),
        submit: false,
      });
      setFundingPreparation(preparation);

      const signature = await signAndSubmitVersionedTransaction({
        connection,
        transactionBase64: preparation.transactionBase64,
        recentBlockhash: preparation.recentBlockhash,
        lastValidBlockHeight: preparation.lastValidBlockHeight,
        signTransaction: wallet.signTransaction,
      });

      const verified = await verifyFunding({
        projectId: selectedProject.id,
        token,
        fundingRequestId: preparation.fundingRequestId,
        signature,
      });

      setVerification(verified);
    } catch (fundingError) {
      setError(
        fundingError instanceof Error ? fundingError.message : "Unable to complete the funding flow."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <AuthGate>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--fyxvo-text)]">
              Fund Project
            </h1>
            <p className="mt-1 text-sm text-[var(--fyxvo-text-muted)]">
              Prepare a real SOL funding transaction, sign it in the connected wallet, send it to
              devnet, and verify it against the control plane.
            </p>
          </div>

          {error ? <Notice tone="danger">{error}</Notice> : null}
          {verification ? (
            <Notice tone="success">
              Funding confirmed. View the transaction in the explorer at{" "}
              <a
                href={verification.explorerUrl}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-[var(--fyxvo-brand)]"
              >
                {verification.signature}
              </a>
              .
            </Notice>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Funding flow</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
                <div className="space-y-4">
                  <div className="rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4">
                    <p className="text-xs uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">
                      Selected project
                    </p>
                    <p className="mt-2 text-lg font-semibold text-[var(--fyxvo-text)]">
                      {selectedProject?.name ?? "No project selected"}
                    </p>
                    {selectedProject ? (
                      <p className="mt-2 text-sm leading-6 text-[var(--fyxvo-text-soft)]">
                        Treasury PDA funding is tied to the current workspace. The preparation call
                        will use this project ID and your connected wallet address.
                      </p>
                    ) : null}
                  </div>

                  <label className="block">
                    <span className="text-sm font-medium text-[var(--fyxvo-text)]">Amount in SOL</span>
                    <input
                      value={amountSol}
                      onChange={(event) => setAmountSol(event.target.value)}
                      inputMode="decimal"
                      className="mt-2 h-11 w-full rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 text-sm text-[var(--fyxvo-text)] outline-none focus:border-[var(--fyxvo-brand)]"
                    />
                  </label>

                  <div className="rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4 text-sm text-[var(--fyxvo-text-soft)]">
                    {lamportsPreview ? (
                      <p>This request will prepare a funding transaction for {lamportsPreview} lamports.</p>
                    ) : (
                      <p>Enter a valid SOL amount to see the lamport value that will be sent to the API.</p>
                    )}
                  </div>

                  <Button
                    type="button"
                    onClick={() => void handleFund()}
                    loading={submitting}
                    disabled={submitting || !selectedProject}
                  >
                    Prepare and fund
                  </Button>
                </div>

                <div className="space-y-4">
                  <div className="rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-4">
                    <p className="text-sm font-medium text-[var(--fyxvo-text)]">
                      Latest funding preparation
                    </p>
                    {fundingPreparation ? (
                      <div className="mt-4 space-y-3 text-sm text-[var(--fyxvo-text-soft)]">
                        <p>
                          Funding request ID:{" "}
                          <span className="font-mono text-[var(--fyxvo-text)]">
                            {fundingPreparation.fundingRequestId}
                          </span>
                        </p>
                        <p>
                          Project PDA: <AddressLink address={fundingPreparation.projectPda} />
                        </p>
                        <p>
                          Treasury PDA: <AddressLink address={fundingPreparation.treasuryPda} />
                        </p>
                        <p>Amount: {fundingPreparation.amount} lamports</p>
                      </div>
                    ) : (
                      <p className="mt-3 text-sm leading-6 text-[var(--fyxvo-text-soft)]">
                        No funding preparation has been created yet in this session.
                      </p>
                    )}
                  </div>

                  <div className="rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-4">
                    <p className="text-sm font-medium text-[var(--fyxvo-text)]">
                      Verified funding result
                    </p>
                    {verification ? (
                      <div className="mt-4 space-y-3 text-sm text-[var(--fyxvo-text-soft)]">
                        <p>
                          Explorer:{" "}
                          <a
                            href={verification.explorerUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="font-medium text-[var(--fyxvo-brand)]"
                          >
                            View transaction
                          </a>
                        </p>
                        <p>
                          Project PDA: <AddressLink address={verification.onchain.projectPda} />
                        </p>
                        <p>
                          Treasury PDA: <AddressLink address={verification.onchain.treasuryPda} />
                        </p>
                      </div>
                    ) : (
                      <p className="mt-3 text-sm leading-6 text-[var(--fyxvo-text-soft)]">
                        Once the verify step succeeds, the explorer link and confirmed on-chain
                        addresses will appear here.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </AuthGate>
    </div>
  );
}
