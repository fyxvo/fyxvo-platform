"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, Notice } from "@fyxvo/ui";
import { WalletConnectButton } from "../../../components/wallet-connect-button";
import { acceptInvite, declineInvite, getInviteMetadata } from "../../../lib/api";
import { usePortal } from "../../../lib/portal-context";
import type { InviteMetadata } from "../../../lib/types";

export default function InvitePage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const { token: authToken, walletPhase } = usePortal();
  const inviteToken = params.token;
  const [invite, setInvite] = useState<InviteMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!inviteToken) return;

    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const item = await getInviteMetadata(inviteToken);
        setInvite(item);
      } catch (loadError) {
        setInvite(null);
        setError(loadError instanceof Error ? loadError.message : "Unable to load this invite.");
      } finally {
        setLoading(false);
      }
    })();
  }, [inviteToken]);

  async function handleAction(action: "accept" | "decline") {
    if (!authToken) return;
    setSubmitting(true);
    setError(null);

    try {
      if (action === "accept") {
        await acceptInvite({ token: inviteToken, authToken });
      } else {
        await declineInvite({ token: inviteToken, authToken });
      }
      router.push("/dashboard");
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Unable to update this invite."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-10">
      <div className="w-full max-w-xl rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-8">
        <h1 className="text-2xl font-bold text-[var(--fyxvo-text)]">Project invitation</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--fyxvo-text-muted)]">
          Review the invite metadata below, then connect your wallet to accept or decline it.
        </p>

        {error ? <Notice tone="danger" className="mt-6">{error}</Notice> : null}

        {loading ? (
          <p className="mt-6 text-sm text-[var(--fyxvo-text-muted)]">Loading invite details…</p>
        ) : invite ? (
          <div className="mt-6 rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-5">
            <p className="text-sm font-semibold text-[var(--fyxvo-text)]">{invite.projectName}</p>
            <p className="mt-2 text-sm text-[var(--fyxvo-text-muted)]">
              Invited by wallet {invite.inviterWallet}
            </p>
            <p className="mt-2 text-sm text-[var(--fyxvo-text-muted)]">
              Project ID {invite.projectId}
            </p>
          </div>
        ) : null}

        {walletPhase !== "authenticated" || !authToken ? (
          <div className="mt-6 space-y-4">
            <p className="text-sm text-[var(--fyxvo-text-muted)]">
              Connect your wallet to continue with this invite.
            </p>
            <WalletConnectButton />
          </div>
        ) : (
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button
              type="button"
              loading={submitting}
              onClick={() => void handleAction("accept")}
            >
              Accept invitation
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={submitting}
              onClick={() => void handleAction("decline")}
            >
              Decline
            </Button>
          </div>
        )}

        <div className="mt-6">
          <Link href="/" className="text-sm text-[var(--fyxvo-brand)] hover:underline">
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
