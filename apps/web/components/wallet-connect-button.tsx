"use client";

import Image from "next/image";
import { useWallet } from "@solana/wallet-adapter-react";
import { Button, Modal } from "@fyxvo/ui";
import { useEffect, useMemo, useState } from "react";
import { usePortal } from "../lib/portal-context";

const PREFERRED_WALLETS = [
  { name: "Phantom", label: "Phantom" },
  { name: "Solflare", label: "Solflare" },
  { name: "Backpack", label: "Backpack" },
  { name: "Coinbase Wallet", label: "Coinbase Wallet" },
  { name: "Trust", label: "Trust Wallet" },
] as const;

export function WalletConnectButton() {
  const [open, setOpen] = useState(false);
  const [pendingWalletName, setPendingWalletName] = useState<string | null>(null);
  const { walletPhase } = usePortal();
  const { connect, select, wallet, wallets } = useWallet();

  const isConnecting = walletPhase === "connecting" || walletPhase === "authenticating";

  const orderedWallets = useMemo(() => {
    const items: Array<{ wallet: (typeof wallets)[number]; label: string }> = [];

    PREFERRED_WALLETS.forEach((preferred) => {
      const entry = wallets.find((candidate) => candidate.adapter.name === preferred.name);
      if (entry) {
        items.push({
          wallet: entry,
          label: preferred.label,
        });
      }
    });

    return items;
  }, [wallets]);

  useEffect(() => {
    if (!open) return;
    console.info(
      "[WalletConnectButton] wallets",
      wallets.map((entry) => ({
        name: entry.adapter.name,
        readyState: String(entry.readyState),
      }))
    );
  }, [open, wallets]);

  useEffect(() => {
    if (!pendingWalletName) return;
    if (wallet?.adapter.name !== pendingWalletName) return;

    let cancelled = false;
    void (async () => {
      try {
        await connect();
      } finally {
        if (!cancelled) {
          setPendingWalletName(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [connect, pendingWalletName, wallet?.adapter.name]);

  const handleSelect = (name: string) => {
    setOpen(false);
    setPendingWalletName(name);
    select(name as Parameters<typeof select>[0]);
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
          {orderedWallets.length === 0 ? (
            <p className="text-sm text-[var(--fyxvo-text-muted)]">
              Wallet adapters have not loaded yet. If this stays empty, check the browser console
              for the wallet array log.
            </p>
          ) : (
            orderedWallets.map(({ wallet: walletOption, label }) => {
              const icon = walletOption.adapter.icon;
              const name = walletOption.adapter.name;
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => handleSelect(name)}
                  disabled={isConnecting}
                  className="flex items-center gap-3 rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 py-3 text-left text-sm font-medium text-[var(--fyxvo-text)] transition-colors hover:border-[var(--fyxvo-brand)] hover:bg-[var(--fyxvo-panel)]"
                  aria-label={label}
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--fyxvo-panel)] p-1">
                    <Image
                      src={icon}
                      alt={`${label} logo`}
                      width={32}
                      height={32}
                      unoptimized
                      className="h-8 w-8 rounded-md object-contain"
                    />
                  </span>
                  <div className="flex flex-col">
                    <span>{label}</span>
                    <span className="text-xs text-[var(--fyxvo-text-muted)]">
                      {walletOption.readyState === "Installed"
                        ? "Available in this browser"
                        : "Connect or open wallet"}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </Modal>
    </>
  );
}
