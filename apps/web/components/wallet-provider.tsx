"use client";

import type { Adapter } from "@solana/wallet-adapter-base";
import { ConnectionProvider, WalletProvider as SolanaWalletProvider } from "@solana/wallet-adapter-react";
import type { ReactNode } from "react";
import { useMemo } from "react";

interface WalletProviderProps {
  children: ReactNode;
}

function createWalletAdapters(): Adapter[] {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PhantomWalletAdapter } = require("@solana/wallet-adapter-phantom") as {
    PhantomWalletAdapter: new () => Adapter;
  };
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { SolflareWalletAdapter } = require("@solana/wallet-adapter-solflare") as {
    SolflareWalletAdapter: new () => Adapter;
  };
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { BackpackWalletAdapter } = require("@solana/wallet-adapter-backpack") as {
    BackpackWalletAdapter: new () => Adapter;
  };
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { CoinbaseWalletAdapter } = require("@solana/wallet-adapter-coinbase") as {
    CoinbaseWalletAdapter: new () => Adapter;
  };
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { TrustWalletAdapter } = require("@solana/wallet-adapter-trust") as {
    TrustWalletAdapter: new () => Adapter;
  };

  return [
    new PhantomWalletAdapter(),
    new SolflareWalletAdapter(),
    new BackpackWalletAdapter(),
    new CoinbaseWalletAdapter(),
    new TrustWalletAdapter(),
  ];
}

export function WalletProvider({ children }: WalletProviderProps) {
  // In test environments the @solana/wallet-adapter-react hooks are mocked
  // directly and we skip the real providers to avoid conflicts.
  if (process.env.NODE_ENV === "test") {
    return <>{children}</>;
  }

  return <RealWalletProviders>{children}</RealWalletProviders>;
}

function RealWalletProviders({ children }: { children: ReactNode }) {
  const cluster = process.env.NEXT_PUBLIC_SOLANA_CLUSTER ?? "devnet";
  const endpoint =
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL ??
    (cluster === "mainnet-beta"
      ? "https://api.mainnet-beta.solana.com"
      : "https://api.devnet.solana.com");
  const wallets = useMemo((): Adapter[] => {
    if (typeof window === "undefined") return [];
    return createWalletAdapters();
  }, []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider wallets={wallets} autoConnect={false}>
        {children}
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
}
