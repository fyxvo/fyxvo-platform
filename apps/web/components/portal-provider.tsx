"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createApiKey as apiCreateApiKey,
  listProjects,
  prepareFunding as apiPrepareFunding,
} from "../lib/api";
import { PortalContext, type WalletPhase } from "../lib/portal-context";
import type { FundingPreparation, PortalApiKey, PortalProject, PortalUser } from "../lib/types";
import { authenticateWallet } from "../lib/wallet-auth";

interface PortalProviderInnerProps {
  children: ReactNode;
}

function PortalProviderInner({ children }: PortalProviderInnerProps) {
  const wallet = useWallet();
  const connectedWalletAddress = wallet.publicKey?.toBase58() ?? null;
  const selectedWalletName = wallet.wallet?.adapter.name;
  const signMessage = wallet.signMessage;

  const [walletPhase, setWalletPhase] = useState<WalletPhase>("disconnected");
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<PortalUser | null>(null);
  const [networkMismatch, setNetworkMismatch] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [projects, setProjects] = useState<PortalProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<PortalProject | null>(null);
  const [apiKeys, setApiKeys] = useState<PortalApiKey[]>([]);
  const [fundingPreparation, setFundingPreparation] = useState<FundingPreparation | null>(null);
  const authenticatingWalletAddressRef = useRef<string | null>(null);

  // Select first project by default when projects load
  useEffect(() => {
    if (projects.length > 0 && !selectedProject) {
      setSelectedProject(projects[0]!);
    }
  }, [projects, selectedProject]);

  const loadProjects = useCallback(async (sessionToken: string) => {
    const loadedProjects = await listProjects(sessionToken);
    setProjects(loadedProjects);
    setSelectedProject((current) => {
      if (!current) {
        return loadedProjects[0] ?? null;
      }

      return loadedProjects.find((project) => project.id === current.id) ?? loadedProjects[0] ?? null;
    });
  }, []);

  const connectWallet = useCallback(
    async (walletName: string) => {
      try {
        setWalletPhase("connecting");
        setAuthError(null);
        setNetworkMismatch(false);
        wallet.select(walletName as Parameters<typeof wallet.select>[0]);
        await wallet.connect();
      } catch (err) {
        setWalletPhase("error");
        setAuthError(err instanceof Error ? err.message : "Authentication failed");
      }
    },
    [wallet]
  );

  useEffect(() => {
    const walletAddress = connectedWalletAddress;

    if (!wallet.connected || !walletAddress) {
      return;
    }

    if (!signMessage) {
      setWalletPhase("error");
      setAuthError("This wallet does not support message signing.");
      return;
    }

    if (
      walletPhase === "authenticated" &&
      token &&
      user?.walletAddress === walletAddress
    ) {
      return;
    }

    if (authenticatingWalletAddressRef.current === walletAddress) {
      return;
    }

    setWalletPhase("authenticating");
    setAuthError(null);
    authenticatingWalletAddressRef.current = walletAddress;

    void (async () => {
      try {
        if (selectedWalletName === "Phantom") {
          const { ensureInjectedPhantomDevnet } = await import("../lib/phantom");
          const onDevnet = await ensureInjectedPhantomDevnet();
          if (authenticatingWalletAddressRef.current === walletAddress) {
            setNetworkMismatch(!onDevnet);
          }
        } else if (authenticatingWalletAddressRef.current === walletAddress) {
          setNetworkMismatch(false);
        }

        const session = await authenticateWallet({
          walletAddress,
          signMessage: async (message) => {
            const signature = await signMessage?.(message);
            if (!signature) {
              throw new Error("Wallet signature was not returned.");
            }
            return signature;
          },
        });

        if (authenticatingWalletAddressRef.current !== walletAddress) return;

        setToken(session.token);
        setUser(session.user);
        await loadProjects(session.token);
        if (authenticatingWalletAddressRef.current !== walletAddress) return;
        setWalletPhase("authenticated");
      } catch (err) {
        if (authenticatingWalletAddressRef.current !== walletAddress) return;
        setWalletPhase("error");
        setAuthError(err instanceof Error ? err.message : "Authentication failed");
      } finally {
        if (authenticatingWalletAddressRef.current === walletAddress) {
          authenticatingWalletAddressRef.current = null;
        }
      }
    })();
  }, [
    loadProjects,
    token,
    user?.walletAddress,
    wallet.connected,
    connectedWalletAddress,
    selectedWalletName,
    signMessage,
    walletPhase,
  ]);

  useEffect(() => {
    if (wallet.connected || connectedWalletAddress) {
      return;
    }

    setWalletPhase("disconnected");
    setToken(null);
    setUser(null);
    setProjects([]);
    setSelectedProject(null);
    setApiKeys([]);
    setFundingPreparation(null);
    setNetworkMismatch(false);
    setAuthError(null);
    authenticatingWalletAddressRef.current = null;
  }, [connectedWalletAddress, wallet.connected]);

  const disconnectWallet = useCallback(async () => {
    await wallet.disconnect();
    setWalletPhase("disconnected");
    setToken(null);
    setUser(null);
    setProjects([]);
    setSelectedProject(null);
    setNetworkMismatch(false);
    setAuthError(null);
    setApiKeys([]);
    setFundingPreparation(null);
    authenticatingWalletAddressRef.current = null;
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
  return <PortalProviderInner>{children}</PortalProviderInner>;
}
