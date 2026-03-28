"use client";

import { createContext, useContext } from "react";
import type {
  CreateProjectResult,
  FundingPreparation,
  PortalApiKey,
  PortalProject,
  PortalUser,
} from "./types";

export type WalletPhase =
  | "disconnected"
  | "connecting"
  | "authenticating"
  | "authenticated"
  | "error";

export interface PortalContextValue {
  // Auth state
  walletPhase: WalletPhase;
  token: string | null;
  user: PortalUser | null;
  networkMismatch: boolean;
  authError: string | null;

  // Projects
  projects: PortalProject[];
  selectedProject: PortalProject | null;
  setSelectedProject: (project: PortalProject) => void;
  refreshProjects: () => Promise<PortalProject[]>;

  // API Keys
  apiKeys: PortalApiKey[];
  setApiKeys: (keys: PortalApiKey[]) => void;

  // Funding
  fundingPreparation: FundingPreparation | null;
  setFundingPreparation: (prep: FundingPreparation | null) => void;

  // Wallet actions
  connectWallet: (walletName: string) => Promise<void>;
  disconnectWallet: () => Promise<void>;

  // API proxy helpers
  prepareFunding: (params: {
    asset: string;
    amount: string;
    submit: boolean;
  }) => Promise<FundingPreparation>;
  createProject: (params: {
    slug: string;
    name: string;
    description?: string;
    templateType?: "blank" | "defi" | "indexing";
  }) => Promise<CreateProjectResult>;

  createApiKey: (params: {
    label: string;
    colorTag?: string;
    scopes: string[];
  }) => Promise<{ item: PortalApiKey; plainTextKey: string }>;
}

export const PortalContext = createContext<PortalContextValue | null>(null);

export function usePortal(): PortalContextValue {
  const ctx = useContext(PortalContext);
  if (!ctx) throw new Error("usePortal must be used within PortalProvider");
  return ctx;
}
