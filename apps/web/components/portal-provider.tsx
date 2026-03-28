"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import bs58 from "bs58";
import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import {
  createApiKey as apiCreateApiKey,
  createAuthChallenge,
  listProjects,
  prepareFunding as apiPrepareFunding,
  verifyWalletSession,
} from "../lib/api";
import { PortalContext, type WalletPhase } from "../lib/portal-context";
import type { FundingPreparation, PortalApiKey, PortalProject, PortalUser } from "../lib/types";
import { WalletProvider } from "./wallet-provider";

interface PortalProviderInnerProps {
  children: ReactNode;
}

function PortalProviderInner({ children }: PortalProviderInnerProps) {
  const wallet = useWallet();

  const [walletPhase, setWalletPhase] = useState<WalletPhase>("disconnected");
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<PortalUser | null>(null);
  const [networkMismatch, setNetworkMismatch] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [projects, setProjects] = useState<PortalProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<PortalProject | null>(null);
  const [apiKeys, setApiKeys] = useState<PortalApiKey[]>([]);
  const [fundingPreparation, setFundingPreparation] = useState<FundingPreparation | null>(null);

  // Select first project by default when projects load
  useEffect(() => {
    if (projects.length > 0 && !selectedProject) {
      setSelectedProject(projects[0]!);
    }
  }, [projects, selectedProject]);

  const connectWallet = useCallback(
    async (walletName: string) => {
      try {
        setWalletPhase("connecting");
        setAuthError(null);
        setNetworkMismatch(false);

        // Select the wallet
        wallet.select(walletName as Parameters<typeof wallet.select>[0]);

        // Connect
        await wallet.connect();

        // Get public key
        const pk = wallet.publicKey ?? wallet.wallet?.adapter?.publicKey;
        if (!pk) throw new Error("No public key after connect");
        const walletAddress = pk.toBase58();

        // Ensure Phantom is on devnet if applicable
        if (walletName === "Phantom") {
          const { ensureInjectedPhantomDevnet } = await import("../lib/phantom");
          const onDevnet = await ensureInjectedPhantomDevnet();
          if (!onDevnet) {
            setNetworkMismatch(true);
          }
        }

        setWalletPhase("authenticating");

        // Challenge → sign → verify
        const challenge = await createAuthChallenge(walletAddress);
        const encoded = new TextEncoder().encode(challenge.message);

        if (!wallet.signMessage) throw new Error("Wallet does not support signMessage");
        const signatureBytes = await wallet.signMessage(encoded);
        const signature = bs58.encode(signatureBytes);

        const session = await verifyWalletSession({ walletAddress, message: challenge.message, signature });

        setToken(session.token);
        setUser(session.user);
        setWalletPhase("authenticated");

        // Load projects
        const loadedProjects = await listProjects(session.token);
        setProjects(loadedProjects);
        if (loadedProjects.length > 0) {
          setSelectedProject(loadedProjects[0]!);
        }
      } catch (err) {
        setWalletPhase("error");
        setAuthError(err instanceof Error ? err.message : "Authentication failed");
      }
    },
    [wallet]
  );

  const disconnectWallet = useCallback(async () => {
    await wallet.disconnect();
    setWalletPhase("disconnected");
    setToken(null);
    setUser(null);
    setProjects([]);
    setSelectedProject(null);
    setNetworkMismatch(false);
    setAuthError(null);
  }, [wallet]);

  const prepareFunding = useCallback(
    async (params: { asset: string; amount: string; submit: boolean }) => {
      if (!token || !selectedProject || !wallet.publicKey) {
        throw new Error("Not authenticated or no project selected");
      }
      const prep = await apiPrepareFunding({
        projectId: selectedProject.id,
        token,
        asset: params.asset,
        amount: params.amount,
        funderWalletAddress: wallet.publicKey.toBase58(),
      });
      setFundingPreparation(prep);
      return prep;
    },
    [token, selectedProject, wallet.publicKey]
  );

  const createApiKey = useCallback(
    async (params: { label: string; colorTag?: string; scopes: string[] }) => {
      if (!token || !selectedProject) throw new Error("Not authenticated");
      return apiCreateApiKey({
        projectId: selectedProject.id,
        token,
        ...params,
      });
    },
    [token, selectedProject]
  );

  const value = useMemo(
    () => ({
      walletPhase,
      token,
      user,
      networkMismatch,
      authError,
      projects,
      selectedProject,
      setSelectedProject,
      apiKeys,
      setApiKeys,
      fundingPreparation,
      setFundingPreparation,
      connectWallet,
      disconnectWallet,
      prepareFunding,
      createApiKey,
    }),
    [
      walletPhase,
      token,
      user,
      networkMismatch,
      authError,
      projects,
      selectedProject,
      apiKeys,
      fundingPreparation,
      connectWallet,
      disconnectWallet,
      prepareFunding,
      createApiKey,
    ]
  );

  return <PortalContext.Provider value={value}>{children}</PortalContext.Provider>;
}

export interface PortalProviderProps {
  children: ReactNode;
}

export function PortalProvider({ children }: PortalProviderProps) {
  return (
    <WalletProvider>
      <PortalProviderInner>{children}</PortalProviderInner>
    </WalletProvider>
  );
}
