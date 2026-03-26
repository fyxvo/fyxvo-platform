"use client";

import { useMemo, type PropsWithChildren } from "react";
import { BackpackWalletAdapter } from "@solana/wallet-adapter-backpack";
import { CoinbaseWalletAdapter } from "@solana/wallet-adapter-coinbase";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { SolflareWalletAdapter } from "@solana/wallet-adapter-solflare";
import { TrustWalletAdapter } from "@solana/wallet-adapter-trust";
import { webEnv } from "../lib/env";

export function SolanaProvider({ children }: PropsWithChildren) {
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new BackpackWalletAdapter(),
      new CoinbaseWalletAdapter(),
      new TrustWalletAdapter(),
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={webEnv.solanaRpcUrl}>
      <WalletProvider wallets={wallets} autoConnect>
        {children}
      </WalletProvider>
    </ConnectionProvider>
  );
}
