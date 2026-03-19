"use client";

import Link from "next/link";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Notice,
} from "@fyxvo/ui";
import { shortenAddress } from "../lib/format";
import { usePortal } from "./portal-provider";
import { AlertIcon, CheckIcon, WalletIcon } from "./icons";
import { WalletConnectButton } from "./wallet-connect-button";

export function WalletPanel({ compact = false }: { readonly compact?: boolean }) {
  const portal = usePortal();

  return (
    <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <WalletIcon className="h-5 w-5 text-brand-400" />
              Wallet session
            </CardTitle>
            <CardDescription>
              Wallet signatures stay in the browser. Fyxvo keeps only a JWT session and public
              wallet metadata.
            </CardDescription>
          </div>
          <Badge
            tone={
              portal.walletPhase === "authenticated"
                ? "success"
                : portal.walletPhase === "error"
                  ? "danger"
                  : "neutral"
            }
          >
            {portal.walletPhase}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {portal.walletAddress ? (
          <div className="rounded-[1.6rem] border border-[color:var(--fyxvo-border)] bg-[color:var(--fyxvo-panel-soft)] p-4">
            <div className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-text-muted)]">
              Connected wallet
            </div>
            <div className="mt-2 text-lg font-semibold text-[var(--fyxvo-text)]">
              {shortenAddress(portal.walletAddress, 6, 6)}
            </div>
            <div className="mt-1 text-sm text-[var(--fyxvo-text-muted)]">
              {portal.walletName ?? "Wallet"} on{" "}
              <span className="text-[var(--fyxvo-text)]">{portal.walletCluster}</span>
            </div>
          </div>
        ) : null}

        {portal.networkMismatch ? (
          <Notice
            tone="warning"
            title="Wallet network mismatch"
            icon={<AlertIcon className="h-4 w-4" />}
          >
            Phantom stayed on a different cluster. Switch the wallet to Solana devnet before you
            prepare or send funding transactions.
          </Notice>
        ) : portal.walletPhase === "authenticated" ? (
          <Notice tone="success" title="Session ready" icon={<CheckIcon className="h-4 w-4" />}>
            Wallet ownership is verified. Project activation, funding, relay access, and analytics
            now share the same session boundary.
          </Notice>
        ) : null}

        {portal.errorMessage ? (
          <Notice
            tone="danger"
            title="Wallet action failed"
            icon={<AlertIcon className="h-4 w-4" />}
          >
            {portal.errorMessage}
          </Notice>
        ) : null}

        {compact ? (
          <div className="flex flex-wrap gap-3">
            {portal.walletPhase === "authenticated" ? (
              <>
                <Button
                  variant="secondary"
                  onClick={() => void portal.refresh()}
                  loading={portal.loading}
                >
                  Refresh
                </Button>
                <Button variant="ghost" onClick={() => void portal.disconnectWallet()}>
                  Disconnect
                </Button>
              </>
            ) : (
              <WalletConnectButton />
            )}
          </div>
        ) : (
          <div className="grid gap-3">
            {portal.walletPhase === "authenticated" ? (
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="secondary"
                  onClick={() => void portal.refresh()}
                  loading={portal.loading}
                >
                  Refresh workspace
                </Button>
                <Button variant="ghost" onClick={() => void portal.disconnectWallet()}>
                  Disconnect
                </Button>
              </div>
            ) : (
              <WalletConnectButton />
            )}
            <Button asChild variant="ghost">
              <Link href="/docs">Read wallet flow</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
