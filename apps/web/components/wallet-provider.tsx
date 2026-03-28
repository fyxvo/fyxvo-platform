"use client";

import type { ComponentType, ReactNode } from "react";

interface WalletProviderProps {
  children: ReactNode;
}

// In production this wraps children with real Solana wallet context.
// In test environments the @solana/wallet-adapter-react hooks are mocked directly
// and we don't need the providers. We dynamically require them to avoid
// crashing when the module is partially mocked.
export function WalletProvider({ children }: WalletProviderProps) {
  return <WalletAdapterBridge>{children}</WalletAdapterBridge>;
}

function WalletAdapterBridge({ children }: { children: ReactNode }) {
  // We intentionally bypass real providers in test environments because
  // @solana/wallet-adapter-react may be mocked without ConnectionProvider/WalletProvider exports.
  if (process.env.NODE_ENV === "test") {
    return <>{children}</>;
  }

  return <RealWalletProviders>{children}</RealWalletProviders>;
}

// This component is only rendered outside test environments
function RealWalletProviders({ children }: { children: ReactNode }) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require("@solana/wallet-adapter-react") as {
    ConnectionProvider: ComponentType<{ endpoint: string; children: ReactNode }>;
    WalletProvider: ComponentType<{
      wallets: unknown[];
      autoConnect: boolean;
      children: ReactNode;
    }>;
  };

  const { ConnectionProvider, WalletProvider: SolanaWalletProvider } = mod;
  const cluster = process.env.NEXT_PUBLIC_SOLANA_CLUSTER ?? "devnet";
  const endpoint =
    cluster === "mainnet-beta"
      ? "https://api.mainnet-beta.solana.com"
      : "https://api.devnet.solana.com";

  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider wallets={[]} autoConnect={false}>
        {children}
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
}
