"use client";

import { Badge, Notice } from "@fyxvo/ui";
import { usePortal } from "../lib/portal-context";
import { shortAddress } from "../lib/format";
import { WalletConnectButton } from "./wallet-connect-button";

export function WalletPanel() {
  const { walletPhase, user, networkMismatch, disconnectWallet } = usePortal();

  if (walletPhase !== "authenticated") {
    return (
      <div className="flex items-center gap-3 p-4 rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)]">
        <WalletConnectButton />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-4 rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)]">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Badge tone="success">authenticated</Badge>
          {user?.walletAddress ? (
            <span className="text-xs text-[var(--fyxvo-text-muted)] font-mono">
              {shortAddress(user.walletAddress)}
            </span>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => void disconnectWallet()}
          className="text-xs text-[var(--fyxvo-text-muted)] hover:text-[var(--fyxvo-text)] transition-colors"
        >
          Disconnect
        </button>
      </div>

      {networkMismatch ? (
        <Notice tone="warning" title="Wallet network mismatch">
          Switch the wallet to Solana devnet to ensure transactions are signed on the correct
          network.
        </Notice>
      ) : null}
    </div>
  );
}
