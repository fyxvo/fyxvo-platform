"use client";

import type { ComponentType, ReactNode } from "react";
import { useMemo } from "react";

interface WalletProviderProps {
  children: ReactNode;
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
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const adapterMod = require("@solana/wallet-adapter-react") as {
    ConnectionProvider: ComponentType<{ endpoint: string; children: ReactNode }>;
    WalletProvider: ComponentType<{
      wallets: unknown[];
      autoConnect: boolean;
      children: ReactNode;
    }>;
  };

  const { ConnectionProvider, WalletProvider: SolanaWalletProvider } = adapterMod;

  const cluster = process.env.NEXT_PUBLIC_SOLANA_CLUSTER ?? "devnet";
  const endpoint =
    cluster === "mainnet-beta"
      ? "https://api.mainnet-beta.solana.com"
      : "https://api.devnet.solana.com";

  // Instantiate adapters inside useMemo so they are created once per mount.
  // We use require() here for the same reason as above – to keep the test
  // environment free of real Solana adapter code.
  const wallets = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PhantomWalletAdapter } = require("@solana/wallet-adapter-phantom") as {
      PhantomWalletAdapter: new () => unknown;
    };
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { SolflareWalletAdapter } = require("@solana/wallet-adapter-solflare") as {
      SolflareWalletAdapter: new () => unknown;
    };
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { BackpackWalletAdapter } = require("@solana/wallet-adapter-backpack") as {
      BackpackWalletAdapter: new () => unknown;
    };
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { CoinbaseWalletAdapter } = require("@solana/wallet-adapter-coinbase") as {
      CoinbaseWalletAdapter: new () => unknown;
    };
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { TrustWalletAdapter } = require("@solana/wallet-adapter-trust") as {
      TrustWalletAdapter: new () => unknown;
    };

    return [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new BackpackWalletAdapter(),
      new CoinbaseWalletAdapter(),
      new TrustWalletAdapter(),
    ];
  }, []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider wallets={wallets} autoConnect={false}>
        {children}
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
}
