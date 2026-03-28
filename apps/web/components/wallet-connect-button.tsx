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

const WALLET_ICON_FALLBACKS: Record<string, string> = {
  Phantom:
    "https://raw.githubusercontent.com/solana-labs/wallet-adapter/master/packages/wallets/phantom/icon.png",
  Solflare:
    "https://raw.githubusercontent.com/solana-labs/wallet-adapter/master/packages/wallets/solflare/icon.svg",
  Backpack:
    "https://raw.githubusercontent.com/solana-labs/wallet-adapter/master/packages/wallets/backpack/icon.png",
  "Coinbase Wallet":
    "https://raw.githubusercontent.com/solana-labs/wallet-adapter/master/packages/wallets/coinbase/icon.svg",
  Trust:
    "https://raw.githubusercontent.com/solana-labs/wallet-adapter/master/packages/wallets/trust/icon.svg",
};

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
              const name = walletOption.adapter.name;
              const icon =
                walletOption.adapter.icon ??
                WALLET_ICON_FALLBACKS[name] ??
                "/brand/logo.png";
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => handleSelect(name)}
                  disabled={isConnecting}
                  className="flex items-center gap-4 rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 py-3 text-left text-sm font-medium text-[var(--fyxvo-text)] shadow-[0_0_0_1px_rgba(255,255,255,0.02)] transition-all hover:border-[var(--fyxvo-brand)] hover:bg-[var(--fyxvo-panel)]"
                  aria-label={label}
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)] p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                    <Image
                      src={icon}
                      alt={`${label} logo`}
                      width={36}
                      height={36}
                      unoptimized
                      className="h-9 w-9 rounded-lg object-contain"
                    />
                  </span>
                  <div className="flex flex-1 items-center justify-between gap-3">
                    <div className="flex flex-col">
                      <span className="text-base font-semibold">{label}</span>
                      <span className="text-xs text-[var(--fyxvo-text-muted)]">
                        {walletOption.readyState === "Installed"
                          ? "Available in this browser"
                          : "Connect or open wallet"}
                      </span>
                    </div>
                    <span className="rounded-full border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] px-2.5 py-1 text-[11px] uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">
                      {walletOption.readyState === "Installed"
                        ? "Ready"
                        : "Open"}
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
