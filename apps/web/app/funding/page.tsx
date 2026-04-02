"use client";

import { useEffect, useMemo, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Button, Card, CardContent, CardHeader, CardTitle, Notice } from "@fyxvo/ui";
import { AddressLink } from "../../components/address-link";
import { AuthGate } from "../../components/state-panels";
import { prepareFundingWithdrawal, verifyFunding } from "../../lib/api";
import { ENABLE_USDC } from "../../lib/env";
import { usePortal } from "../../lib/portal-context";
import { signAndSubmitVersionedTransaction, solToLamportsString } from "../../lib/solana-transactions";
import type { FundingVerification } from "../../lib/types";

type FundingAsset = "SOL" | "USDC";

const FUNDING_ASSETS: Array<{
  key: FundingAsset;
  label: string;
  description: string;
}> = [
  {
    key: "SOL",
    label: "SOL",
    description: "Fund the project treasury with devnet SOL credits.",
  },
  {
    key: "USDC",
    label: "USDC",
    description: "Fund the treasury with devnet USDC base units through the same on-chain flow.",
  },
];

function usdcToBaseUnitsString(value: string) {
  const trimmed = value.trim();
  if (!/^\d+(\.\d{0,6})?$/.test(trimmed)) {
    throw new Error("Enter a valid USDC amount with up to 6 decimal places.");
  }

  const [whole, fractional = ""] = trimmed.split(".");
  const wholeUnits = BigInt(whole || "0") * 1_000_000n;
  const fractionalUnits = BigInt((fractional + "000000").slice(0, 6) || "0");
  return (wholeUnits + fractionalUnits).toString();
}

function formatPreparedAmount(asset: FundingAsset, amount: string) {
  if (asset === "SOL") {
    return `${amount} lamports`;
  }

  const whole = BigInt(amount) / 1_000_000n;
  const fractional = (BigInt(amount) % 1_000_000n).toString().padStart(6, "0").replace(/0+$/, "");
  return fractional.length > 0
    ? `${whole.toString()}.${fractional} USDC (${amount} base units)`
    : `${whole.toString()} USDC (${amount} base units)`;
}

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

  const [asset, setAsset] = useState<FundingAsset>("SOL");
  const [amountSol, setAmountSol] = useState("1");
  const [amountUsdc, setAmountUsdc] = useState("10");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verification, setVerification] = useState<FundingVerification | null>(null);
  const [withdrawAmount, setWithdrawAmount] = useState("1000000");
  const [destinationWallet, setDestinationWallet] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [withdrawStatus, setWithdrawStatus] = useState<string | null>(null);

  const visibleAssets = ENABLE_USDC ? FUNDING_ASSETS : FUNDING_ASSETS.filter((item) => item.key === "SOL");

  useEffect(() => {
    if (wallet.publicKey && destinationWallet.length === 0) {
      setDestinationWallet(wallet.publicKey.toBase58());
    }
  }, [destinationWallet.length, wallet.publicKey]);

  const fundingPreview = useMemo(() => {
    try {
      if (asset === "SOL") {
        return `${solToLamportsString(amountSol)} lamports`;
      }

      return `${usdcToBaseUnitsString(amountUsdc)} base units`;
    } catch {
      return null;
    }
  }, [amountSol, amountUsdc, asset]);

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
      const amount =
        asset === "SOL" ? solToLamportsString(amountSol) : usdcToBaseUnitsString(amountUsdc);

      const preparation = await prepareFunding({
        asset,
        amount,
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

  async function handleWithdraw() {
    if (!selectedProject || !token) {
      setWithdrawError("Select a project and reconnect your wallet before preparing a withdrawal.");
      return;
    }

    setWithdrawing(true);
    setWithdrawError(null);
    setWithdrawStatus(null);

    try {
      const prepared = await prepareFundingWithdrawal({
        projectId: selectedProject.id,
        token,
        amount: withdrawAmount.trim(),
        destinationWalletAddress: destinationWallet.trim(),
      });

      setWithdrawStatus(
        `Withdrawal prepared for ${prepared.amount} lamports to ${prepared.destinationWalletAddress}. Sign and submit the transaction from your wallet.`
      );
    } catch (withdrawalError) {
      setWithdrawError(
        withdrawalError instanceof Error
          ? withdrawalError.message
          : "Unable to prepare the withdrawal flow."
      );
    } finally {
      setWithdrawing(false);
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
              Prepare a real treasury funding transaction, sign it in the connected wallet, send it
              to devnet, and verify it against the control plane with either SOL or USDC.
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
          {withdrawError ? <Notice tone="danger">{withdrawError}</Notice> : null}
          {withdrawStatus ? <Notice tone="neutral">{withdrawStatus}</Notice> : null}

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
                        uses this project ID, your connected wallet, and the funding asset selected
                        below.
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {visibleAssets.map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => {
                          setAsset(item.key);
                          setError(null);
                          setFundingPreparation(null);
                        }}
                        className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                          asset === item.key
                            ? "bg-[var(--fyxvo-brand)] text-black"
                            : "border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] text-[var(--fyxvo-text-muted)] hover:text-[var(--fyxvo-text)]"
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>

                  <div className="rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4">
                    <p className="text-sm font-medium text-[var(--fyxvo-text)]">
                      {visibleAssets.find((item) => item.key === asset)?.label}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[var(--fyxvo-text-soft)]">
                      {visibleAssets.find((item) => item.key === asset)?.description}
                    </p>
                  </div>

                  {asset === "SOL" ? (
                    <label className="block">
                      <span className="text-sm font-medium text-[var(--fyxvo-text)]">
                        Amount in SOL
                      </span>
                      <input
                        value={amountSol}
                        onChange={(event) => setAmountSol(event.target.value)}
                        inputMode="decimal"
                        className="mt-2 h-11 w-full rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 text-sm text-[var(--fyxvo-text)] outline-none focus:border-[var(--fyxvo-brand)]"
                      />
                    </label>
                  ) : (
                    <label className="block">
                      <span className="text-sm font-medium text-[var(--fyxvo-text)]">
                        Amount in USDC
                      </span>
                      <input
                        value={amountUsdc}
                        onChange={(event) => setAmountUsdc(event.target.value)}
                        inputMode="decimal"
                        className="mt-2 h-11 w-full rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 text-sm text-[var(--fyxvo-text)] outline-none focus:border-[var(--fyxvo-brand)]"
                      />
                    </label>
                  )}

                  <div className="rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4 text-sm text-[var(--fyxvo-text-soft)]">
                    {fundingPreview ? (
                      <p>
                        This request will prepare a funding transaction for {fundingPreview} in the{" "}
                        {asset} lane.
                      </p>
                    ) : (
                      <p>
                        Enter a valid {asset === "SOL" ? "SOL" : "USDC"} amount to see the exact
                        value sent to the API.
                      </p>
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
                          Asset:{" "}
                          <span className="font-medium text-[var(--fyxvo-text)]">
                            {fundingPreparation.asset}
                          </span>
                        </p>
                        <p>
                          Project PDA: <AddressLink address={fundingPreparation.projectPda} />
                        </p>
                        <p>
                          Treasury PDA: <AddressLink address={fundingPreparation.treasuryPda} />
                        </p>
                        <p>
                          Amount:{" "}
                          {formatPreparedAmount(
                            fundingPreparation.asset === "USDC" ? "USDC" : "SOL",
                            fundingPreparation.amount
                          )}
                        </p>
                        {fundingPreparation.treasuryUsdcVault ? (
                          <p>
                            Treasury USDC vault:{" "}
                            <AddressLink address={fundingPreparation.treasuryUsdcVault} />
                          </p>
                        ) : null}
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

          <Card>
            <CardHeader>
              <CardTitle>Withdraw treasury SOL</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
                <div className="space-y-4">
                  <p className="text-sm leading-6 text-[var(--fyxvo-text-soft)]">
                    Start a treasury withdrawal from the same funding workspace. The control plane
                    validates project ownership and available balance before preparing the next
                    step.
                  </p>

                  <label className="block">
                    <span className="text-sm font-medium text-[var(--fyxvo-text)]">
                      Amount in lamports
                    </span>
                    <input
                      value={withdrawAmount}
                      onChange={(event) => setWithdrawAmount(event.target.value)}
                      inputMode="numeric"
                      className="mt-2 h-11 w-full rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 text-sm text-[var(--fyxvo-text)] outline-none focus:border-[var(--fyxvo-brand)]"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-[var(--fyxvo-text)]">
                      Destination wallet
                    </span>
                    <input
                      value={destinationWallet}
                      onChange={(event) => setDestinationWallet(event.target.value)}
                      className="mt-2 h-11 w-full rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 text-sm text-[var(--fyxvo-text)] outline-none focus:border-[var(--fyxvo-brand)]"
                    />
                  </label>

                  <Button
                    type="button"
                    onClick={() => void handleWithdraw()}
                    loading={withdrawing}
                    disabled={withdrawing || !selectedProject}
                    variant="secondary"
                  >
                    Prepare withdrawal
                  </Button>
                </div>

                <div className="rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4 text-sm leading-6 text-[var(--fyxvo-text-soft)]">
                  <p className="font-medium text-[var(--fyxvo-text)]">What happens next</p>
                  <p className="mt-3">
                    The API checks that the selected workspace owns the project and that the
                    treasury still has enough unfunded SOL available for the request. If the live
                    protocol deployment can complete the withdrawal, the next step is returned here
                    for the connected wallet to sign.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </AuthGate>
    </div>
  );
}
