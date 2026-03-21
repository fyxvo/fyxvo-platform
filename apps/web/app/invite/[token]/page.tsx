"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button, Card, CardContent, CardHeader, CardTitle, Notice } from "@fyxvo/ui";
import { usePortal } from "../../../components/portal-provider";
import { webEnv } from "../../../lib/env";
import { shortenAddress } from "../../../lib/format";

interface InviteInfo {
  projectName: string;
  inviterWallet: string;
  expiresAt: string;
  projectId: string;
}

type InviteState =
  | { status: "loading" }
  | { status: "valid"; info: InviteInfo }
  | { status: "invalid"; message: string }
  | { status: "accepted" }
  | { status: "declined" };

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const portal = usePortal();
  const token = typeof params.token === "string" ? params.token : (params.token?.[0] ?? "");

  const [state, setState] = useState<InviteState>({ status: "loading" });
  const [acting, setActing] = useState<"accept" | "decline" | null>(null);

  useEffect(() => {
    if (!token) {
      setState({ status: "invalid", message: "Invalid invite link." });
      return;
    }
    void fetch(`${webEnv.apiBaseUrl}/v1/invite/${token}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({})) as { message?: string };
          setState({ status: "invalid", message: body.message ?? "This invite link is invalid or has expired." });
          return;
        }
        const data = await res.json() as InviteInfo;
        setState({ status: "valid", info: data });
      })
      .catch(() => {
        setState({ status: "invalid", message: "Could not reach the server. Please try again." });
      });
  }, [token]);

  async function handleAccept() {
    if (!portal.token) return;
    setActing("accept");
    try {
      const res = await fetch(`${webEnv.apiBaseUrl}/v1/invite/${token}/accept`, {
        method: "POST",
        headers: { Authorization: `Bearer ${portal.token}` },
      });
      if (res.ok) {
        setState({ status: "accepted" });
        setTimeout(() => void router.push("/dashboard"), 2000);
      } else {
        const body = await res.json().catch(() => ({})) as { message?: string };
        setState({ status: "invalid", message: body.message ?? "Could not accept the invitation." });
      }
    } catch {
      setState({ status: "invalid", message: "Network error. Please try again." });
    } finally {
      setActing(null);
    }
  }

  async function handleDecline() {
    if (!portal.token) return;
    setActing("decline");
    try {
      await fetch(`${webEnv.apiBaseUrl}/v1/invite/${token}/decline`, {
        method: "POST",
        headers: { Authorization: `Bearer ${portal.token}` },
      });
      setState({ status: "declined" });
    } catch {
      setState({ status: "invalid", message: "Network error. Please try again." });
    } finally {
      setActing(null);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        {state.status === "loading" && (
          <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
            <CardContent className="py-10 text-center">
              <p className="text-sm text-[var(--fyxvo-text-muted)]">Loading invitation…</p>
            </CardContent>
          </Card>
        )}

        {state.status === "invalid" && (
          <Notice tone="warning" title="Invite not found">
            {state.message}
          </Notice>
        )}

        {state.status === "accepted" && (
          <Notice tone="success" title="Invitation accepted">
            You have joined the project. Redirecting to dashboard…
          </Notice>
        )}

        {state.status === "declined" && (
          <Notice tone="neutral" title="Invitation declined">
            You have declined this invitation. You can close this page.
          </Notice>
        )}

        {state.status === "valid" && (
          <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
            <CardHeader>
              <CardTitle>Project Invitation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-[var(--fyxvo-text-muted)]">Project</span>
                  <span className="font-medium text-[var(--fyxvo-text)]">{state.info.projectName}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-[var(--fyxvo-text-muted)]">Invited by</span>
                  <span className="font-mono text-sm text-[var(--fyxvo-text)]">{shortenAddress(state.info.inviterWallet, 8, 6)}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-[var(--fyxvo-text-muted)]">Expires</span>
                  <span className="text-sm text-[var(--fyxvo-text)]">
                    {new Date(state.info.expiresAt).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>

              {!portal.token ? (
                <Notice tone="neutral" title="Connect a wallet to respond">
                  You need to connect a Solana wallet before you can accept or decline this invitation.
                </Notice>
              ) : (
                <div className="flex gap-3">
                  <Button
                    className="flex-1"
                    onClick={() => void handleAccept()}
                    disabled={acting !== null}
                  >
                    {acting === "accept" ? "Accepting…" : "Accept"}
                  </Button>
                  <Button
                    variant="secondary"
                    className="flex-1"
                    onClick={() => void handleDecline()}
                    disabled={acting !== null}
                  >
                    {acting === "decline" ? "Declining…" : "Decline"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
