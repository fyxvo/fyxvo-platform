"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { Button, Modal } from "@fyxvo/ui";
import { useState } from "react";
import { usePortal } from "../lib/portal-context";

export function WalletConnectButton() {
  const [open, setOpen] = useState(false);
  const { connectWallet, walletPhase } = usePortal();
  const { wallets } = useWallet();

  const isConnecting = walletPhase === "connecting" || walletPhase === "authenticating";

  const handleSelect = async (name: string) => {
    setOpen(false);
    await connectWallet(name);
  };

  return (
    <>
      <Button
        variant="primary"
        onClick={() => setOpen(true)}
        loading={isConnecting}
        disabled={isConnecting}
      >
        Connect wallet
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Connect a Solana wallet"
        description="Choose a wallet to connect and authenticate with Fyxvo."
      >
        <div className="flex flex-col gap-2">
          {wallets.length === 0 ? (
            <p className="text-sm text-[var(--fyxvo-text-muted)]">
              No wallets detected. Please install Phantom or another Solana wallet.
            </p>
          ) : (
            wallets.map((w) => {
              const name =
                typeof w.adapter?.name === "string"
                  ? w.adapter.name
                  : (w as { adapter?: { name?: string } }).adapter?.name ?? "Unknown";
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => handleSelect(name)}
                  className="flex items-center gap-3 rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 py-3 text-left text-sm font-medium text-[var(--fyxvo-text)] transition-colors hover:border-[var(--fyxvo-brand)] hover:bg-[var(--fyxvo-panel)]"
                  aria-label={name}
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--fyxvo-panel)]">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.5}
                      width={18}
                      height={18}
                      aria-hidden="true"
                    >
                      <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4" />
                      <path d="M4 6v12c0 1.1.9 2 2 2h14v-4" />
                      <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
                    </svg>
                  </span>
                  <span>{name}</span>
                </button>
              );
            })
          )}
        </div>
      </Modal>
    </>
  );
}
