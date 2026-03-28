"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, Notice } from "@fyxvo/ui";
import { WalletConnectButton } from "../../../components/wallet-connect-button";
import { recordReferralClick } from "../../../lib/api";
import { usePortal } from "../../../lib/portal-context";

export default function JoinPage() {
  const params = useParams<{ code: string }>();
  const { walletPhase } = usePortal();
  const [error, setError] = useState<string | null>(null);
  const [recorded, setRecorded] = useState(false);

  useEffect(() => {
    if (!params.code) return;

    void (async () => {
      try {
        await recordReferralClick(params.code);
        setRecorded(true);
      } catch (recordError) {
        setError(recordError instanceof Error ? recordError.message : "Unable to record referral.");
      }
    })();
  }, [params.code]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-10">
      <div className="w-full max-w-xl rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-8 text-center">
        <h1 className="text-2xl font-bold text-[var(--fyxvo-text)]">Welcome to Fyxvo</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--fyxvo-text-muted)]">
          This referral link has been recorded. Connect your wallet to continue into the devnet
          control plane and finish onboarding.
        </p>

        {recorded ? (
          <Notice tone="success" className="mt-6">
            Referral code {params.code} was recorded successfully.
          </Notice>
        ) : null}

        {error ? (
          <Notice tone="warning" className="mt-6">
            {error}
          </Notice>
        ) : null}

        <div className="mt-6 flex flex-col items-center gap-3">
          {walletPhase === "authenticated" ? (
            <Button asChild>
              <Link href="/dashboard">Open dashboard</Link>
            </Button>
          ) : (
            <WalletConnectButton />
          )}
        </div>
      </div>
    </div>
  );
}
