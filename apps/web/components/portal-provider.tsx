"use client";

import { createContext, startTransition, useCallback, useContext, useEffect, useState, type PropsWithChildren } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  getAdminOverview,
  createProject as createProjectRequest,
  createApiKey as createApiKeyRequest,
  createAuthChallenge,
  deleteProject as deleteProjectRequest,
  getAdminStats,
  getAnalyticsOverview,
  getMe,
  getOnchainSnapshot,
  getOperators,
  getProjectAnalytics,
  listApiKeys,
  listProjects,
  prepareFunding as prepareFundingRequest,
  revokeApiKey as revokeApiKeyRequest,
  verifyFunding as verifyFundingRequest,
  verifyProjectActivation as verifyProjectActivationRequest,
  verifyWalletSession
} from "../lib/api";
import { previewAdminOverview, previewAdminStats, previewApiKeys, previewOnchain, previewOperators, previewOverview, previewProjectAnalytics, previewProjects } from "../lib/sample-data";
import { ensureInjectedPhantomDevnet } from "../lib/phantom";
import { trackLaunchEvent } from "../lib/tracking";
import type {
  AdminOverview,
  AdminStats,
  AnalyticsOverview,
  FundingPreparation,
  OnChainProjectSnapshot,
  OperatorSummary,
  PortalApiKey,
  PortalProject,
  PortalUser,
  ProjectAnalytics
} from "../lib/types";
import bs58 from "bs58";
import { VersionedTransaction } from "@solana/web3.js";
import { webEnv } from "../lib/env";

const SESSION_STORAGE_KEY = "fyxvo.web.session";
const PROJECT_STORAGE_KEY = "fyxvo.web.project";

type WalletPhase =
  | "disconnected"
  | "connecting"
  | "authenticating"
  | "authenticated"
  | "error";

type TransactionPhase =
  | "idle"
  | "preparing"
  | "ready"
  | "awaiting_signature"
  | "submitting"
  | "confirmed"
  | "error";

type ProjectCreationPhase =
  | "idle"
  | "preparing"
  | "awaiting_signature"
  | "submitting"
  | "confirmed"
  | "error";

interface PortalContextValue {
  readonly walletPhase: WalletPhase;
  readonly walletAddress: string | null;
  readonly walletName: string | null;
  readonly walletCluster: string;
  readonly networkMismatch: boolean;
  readonly errorMessage: string | null;
  readonly walletOptions: readonly {
    readonly name: string;
    readonly readyState: string;
    readonly installed: boolean;
    readonly icon: string;
  }[];
  readonly user: PortalUser | null;
  readonly token: string | null;
  readonly projects: PortalProject[];
  readonly selectedProject: PortalProject | null;
  readonly apiKeys: PortalApiKey[];
  readonly analyticsOverview: AnalyticsOverview;
  readonly projectAnalytics: ProjectAnalytics;
  readonly onchainSnapshot: OnChainProjectSnapshot;
  readonly adminStats: AdminStats | null;
  readonly adminOverview: AdminOverview | null;
  readonly operators: OperatorSummary[];
  readonly loading: boolean;
  readonly lastGeneratedApiKey: string | null;
  readonly transactionState: {
    readonly phase: TransactionPhase;
    readonly message: string;
    readonly funding?: FundingPreparation;
    readonly signature?: string;
    readonly explorerUrl?: string;
  };
  readonly projectCreationState: {
    readonly phase: ProjectCreationPhase;
    readonly message: string;
    readonly signature?: string;
    readonly explorerUrl?: string;
  };
  connectWallet(walletName?: string): Promise<void>;
  disconnectWallet(): Promise<void>;
  selectProject(projectId: string): void;
  refresh(): Promise<void>;
  createProject(input: {
    readonly slug: string;
    readonly name: string;
    readonly description?: string;
  }): Promise<void>;
  createApiKey(input: { readonly label: string; readonly colorTag?: string; readonly scopes: readonly string[]; readonly expiresAt?: string }): Promise<void>;
  revokeApiKey(apiKeyId: string): Promise<void>;
  prepareFunding(input: {
    readonly asset: "SOL" | "USDC";
    readonly amount: string;
    readonly submit: boolean;
    readonly funderTokenAccount?: string;
  }): Promise<void>;
}

const PortalContext = createContext<PortalContextValue | null>(null);

function extractErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something unexpected happened.";
}

function loadStoredSession() {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as { token: string; user: PortalUser; walletAddress: string };
  } catch {
    return null;
  }
}

function storeSession(value: { token: string; user: PortalUser; walletAddress: string } | null) {
  if (typeof window === "undefined") {
    return;
  }

  if (!value) {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(value));
}

const emptyOnchainSnapshot = {
  projectPda: "Unavailable",
  treasuryPda: "Unavailable",
  treasurySolBalance: 0,
  projectAccountExists: false,
  projectAccountDataLength: 0
};

export function PortalProvider({ children }: PropsWithChildren) {
  const { connection } = useConnection();
  const {
    connect,
    disconnect,
    publicKey,
    wallets,
    wallet,
    select,
    signMessage,
    sendTransaction,
    connected
  } = useWallet();
  const [walletPhase, setWalletPhase] = useState<WalletPhase>("disconnected");
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [walletCluster, setWalletCluster] = useState("unknown");
  const [networkMismatch, setNetworkMismatch] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<PortalUser | null>(null);
  const [projects, setProjects] = useState<PortalProject[]>(previewProjects);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(previewProjects[0]?.id ?? "");
  const [apiKeys, setApiKeys] = useState<PortalApiKey[]>(previewApiKeys);
  const [analyticsOverview, setAnalyticsOverview] = useState<AnalyticsOverview>(previewOverview);
  const [projectAnalytics, setProjectAnalytics] = useState<ProjectAnalytics>(previewProjectAnalytics);
  const [onchainSnapshot, setOnchainSnapshot] = useState<OnChainProjectSnapshot>(previewOnchain);
  const [adminStats, setAdminStats] = useState<AdminStats | null>(previewAdminStats);
  const [adminOverview, setAdminOverview] = useState<AdminOverview | null>(previewAdminOverview);
  const [operators, setOperators] = useState<OperatorSummary[]>(previewOperators);
  const [loading, setLoading] = useState(false);
  const [lastGeneratedApiKey, setLastGeneratedApiKey] = useState<string | null>(null);
  const [projectCreationState, setProjectCreationState] = useState<PortalContextValue["projectCreationState"]>({
    phase: "idle",
    message: "No project activation is in progress."
  });
  const [transactionState, setTransactionState] = useState<PortalContextValue["transactionState"]>({
    phase: "idle",
    message: "No funding transaction has been prepared yet."
  });
  const walletName = wallet?.adapter.name ?? null;
  const walletOptions = wallets.map((item) => ({
    name: item.adapter.name,
    readyState: String(item.readyState),
    installed:
      String(item.readyState) === "Installed" ||
      String(item.readyState) === "Loadable",
    icon: item.adapter.icon
  }));

  const selectedProject = projects.find((project) => project.id === selectedProjectId) ?? projects[0] ?? null;

  async function selectWalletAdapter(requestedWalletName?: string) {
    if (!requestedWalletName) {
      if (wallet) {
        return;
      }

      const preferred = walletOptions.find((candidate) => candidate.installed) ?? walletOptions[0];
      if (!preferred) {
        throw new Error("No supported Solana wallets were detected in this browser.");
      }

      select(preferred.name);
      await new Promise((resolve) => window.setTimeout(resolve, 40));
      return;
    }

    if (wallet?.adapter.name === requestedWalletName) {
      return;
    }

    select(requestedWalletName as Parameters<typeof select>[0]);
    await new Promise((resolve) => window.setTimeout(resolve, 40));
  }

  async function ensureWalletConnection(requestedWalletName?: string) {
    await selectWalletAdapter(requestedWalletName);

    if (!connected) {
      await connect();
    }

    const getConnectedWalletAddress = () =>
      publicKey?.toBase58() ??
      wallets
        .find((candidate) => candidate.adapter.name === (requestedWalletName ?? wallet?.adapter.name))
        ?.adapter.publicKey?.toBase58?.();

    let connectedWalletAddress = getConnectedWalletAddress();
    if (!connectedWalletAddress) {
      await new Promise((resolve) => window.setTimeout(resolve, 40));
      connectedWalletAddress = getConnectedWalletAddress();
    }

    if (!connectedWalletAddress) {
      throw new Error("The wallet connected, but no Solana public key was exposed.");
    }

    let switchedToDevnet = true;
    if ((requestedWalletName ?? wallet?.adapter.name) === "Phantom") {
      switchedToDevnet = await ensureInjectedPhantomDevnet();
    }

    setWalletAddress(connectedWalletAddress);
    setWalletCluster(webEnv.solanaCluster);
    setNetworkMismatch(!switchedToDevnet);

    return connectedWalletAddress;
  }

  async function signWalletMessage(message: string) {
    if (!signMessage) {
      throw new Error("The connected wallet does not support message signing.");
    }

    const signature = await signMessage(new TextEncoder().encode(message));
    return bs58.encode(signature);
  }

  function base64ToBytes(value: string) {
    return Uint8Array.from(Buffer.from(value, "base64"));
  }

  async function submitPreparedTransaction(input: {
    readonly transactionBase64: string;
    readonly lastValidBlockHeight: number;
    readonly recentBlockhash: string;
  }) {
    if (!sendTransaction) {
      throw new Error("The connected wallet does not support transaction submission.");
    }

    const transaction = VersionedTransaction.deserialize(base64ToBytes(input.transactionBase64));
    const signature = await sendTransaction(transaction, connection, {
      skipPreflight: false,
      preflightCommitment: "confirmed",
      maxRetries: 3
    });

    await connection.confirmTransaction(
      {
        signature,
        blockhash: input.recentBlockhash,
        lastValidBlockHeight: input.lastValidBlockHeight
      },
      "confirmed"
    );

    return {
      signature,
      explorerUrl: `https://explorer.solana.com/tx/${signature}?cluster=devnet`
    };
  }

  async function refreshProjectScopedData(sessionToken: string, projectId: string) {
    if (!projectId) {
      startTransition(() => {
        setApiKeys([]);
        setOnchainSnapshot(emptyOnchainSnapshot);
      });
      return;
    }

    const [keysResult, overviewResult, analyticsResult, onchainResult] = await Promise.allSettled([
      listApiKeys(projectId, sessionToken),
      getAnalyticsOverview(sessionToken),
      getProjectAnalytics(projectId, sessionToken),
      getOnchainSnapshot(projectId, sessionToken)
    ]);

    startTransition(() => {
      if (keysResult.status === "fulfilled") {
        setApiKeys(keysResult.value);
      }
      if (overviewResult.status === "fulfilled") {
        setAnalyticsOverview(overviewResult.value);
      }
      if (analyticsResult.status === "fulfilled") {
        setProjectAnalytics(analyticsResult.value);
      }
      if (onchainResult.status === "fulfilled") {
        setOnchainSnapshot(onchainResult.value);
      }
    });
  }

  const refresh = useCallback(async () => {
    if (!token) {
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const [nextProjects, meResult] = await Promise.all([
        listProjects(token),
        getMe(token).catch(() => null),
      ]);
      const nextSelectedProjectId =
        nextProjects.find((project) => project.id === selectedProjectId)?.id ??
        nextProjects[0]?.id ??
        "";

      const refreshedUser = meResult?.user ?? user;
      const effectiveRole = refreshedUser?.role ?? user?.role;

      let stats: AdminStats | null = null;
      let overview: AdminOverview | null = null;
      let nextOperators: OperatorSummary[] = [];

      if (effectiveRole === "OWNER" || effectiveRole === "ADMIN") {
        const [statsResult, overviewResult, operatorsResult] = await Promise.allSettled([
          getAdminStats(token),
          getAdminOverview(token),
          getOperators(token)
        ]);

        stats = statsResult.status === "fulfilled" ? statsResult.value : null;
        overview = overviewResult.status === "fulfilled" ? overviewResult.value : null;
        nextOperators = operatorsResult.status === "fulfilled" ? operatorsResult.value : [];
      }

      if (nextSelectedProjectId) {
        await refreshProjectScopedData(token, nextSelectedProjectId);
      } else {
        startTransition(() => {
          setApiKeys([]);
          setOnchainSnapshot(emptyOnchainSnapshot);
        });
      }

      startTransition(() => {
        setProjects(nextProjects);
        setSelectedProjectId(nextSelectedProjectId);
        setAdminStats(stats);
        setAdminOverview(overview);
        setOperators(nextOperators);
        setWalletPhase("authenticated");
        if (refreshedUser) {
          setUser(refreshedUser);
        }
      });

      if (typeof window !== "undefined") {
        window.localStorage.setItem(PROJECT_STORAGE_KEY, nextSelectedProjectId);
        if (refreshedUser && walletAddress) {
          storeSession({ token, user: refreshedUser, walletAddress });
        }
      }
    } catch (error) {
      setErrorMessage(extractErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [selectedProjectId, token, user, walletAddress]);

  useEffect(() => {
    const stored = loadStoredSession();
    const storedProjectId = typeof window !== "undefined" ? window.localStorage.getItem(PROJECT_STORAGE_KEY) : null;

    if (!stored) {
      return;
    }

    setToken(stored.token);
    setUser(stored.user);
    setWalletAddress(stored.walletAddress);
    setWalletPhase("authenticated");
    if (storedProjectId) {
      setSelectedProjectId(storedProjectId);
    }
  }, []);

  useEffect(() => {
    if (!token) {
      return;
    }

    void refresh();
  }, [refresh, token]);

  useEffect(() => {
    if (!connected || !publicKey) {
      return;
    }

    setWalletAddress(publicKey.toBase58());
    if (walletCluster === "unknown") {
      setWalletCluster(webEnv.solanaCluster);
    }
  }, [connected, publicKey, walletCluster]);

  async function connectWallet(requestedWalletName?: string) {
    setWalletPhase("connecting");
    setErrorMessage(null);
    setLastGeneratedApiKey(null);

    try {
      const connectedWalletAddress = await ensureWalletConnection(requestedWalletName);

      setWalletPhase("authenticating");
      const challenge = await createAuthChallenge(connectedWalletAddress);
      const signature = await signWalletMessage(challenge.message);
      const session = await verifyWalletSession({
        walletAddress: challenge.walletAddress,
        message: challenge.message,
        signature
      });

      storeSession({
        token: session.token,
        user: session.user,
        walletAddress: challenge.walletAddress
      });

      startTransition(() => {
        setToken(session.token);
        setUser(session.user);
        setWalletPhase("authenticated");
      });
    } catch (error) {
      setWalletPhase("error");
      setErrorMessage(extractErrorMessage(error));
    }
  }

  async function disconnectWallet() {
    await disconnect().catch(() => undefined);
    storeSession(null);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(PROJECT_STORAGE_KEY);
    }

    setWalletPhase("disconnected");
    setWalletAddress(null);
    setErrorMessage(null);
    setWalletCluster("unknown");
    setNetworkMismatch(false);
    setToken(null);
    setUser(null);
    setProjects(previewProjects);
    setSelectedProjectId(previewProjects[0]?.id ?? "");
    setApiKeys(previewApiKeys);
    setAnalyticsOverview(previewOverview);
    setProjectAnalytics(previewProjectAnalytics);
    setOnchainSnapshot(previewOnchain);
    setAdminStats(previewAdminStats);
    setAdminOverview(previewAdminOverview);
    setOperators(previewOperators);
    setProjectCreationState({
      phase: "idle",
      message: "No project activation is in progress."
    });
    setTransactionState({
      phase: "idle",
      message: "No funding transaction has been prepared yet."
    });
  }

  function selectProject(projectId: string) {
    setSelectedProjectId(projectId);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(PROJECT_STORAGE_KEY, projectId);
    }

    if (!token) {
      const fallbackProject = previewProjects.find((project) => project.id === projectId) ?? previewProjects[0];
      if (!fallbackProject) {
        return;
      }

      setProjectAnalytics({
        ...previewProjectAnalytics,
        project: fallbackProject
      });
      return;
    }

    void refreshProjectScopedData(token, projectId).catch((error: unknown) => {
      setErrorMessage(extractErrorMessage(error));
    });
  }

  async function createProject(input: {
    readonly slug: string;
    readonly name: string;
    readonly description?: string;
  }) {
    if (!token || !walletAddress) {
      setErrorMessage("Connect a wallet before creating a project.");
      return;
    }

    setProjectCreationState({
      phase: "preparing",
      message: "Creating the project record and preparing its activation transaction."
    });

    let createdProjectId: string | null = null;
    let signature: string | null = null;

    try {
      void trackLaunchEvent({
        name: "project_creation_started",
        source: "dashboard-create-project",
        token,
        ...(selectedProject?.id ? { projectId: selectedProject.id } : {})
      });
      const response = await createProjectRequest({
        token,
        slug: input.slug,
        name: input.name,
        ...(input.description ? { description: input.description } : {})
      });
      createdProjectId = response.item.id;

      setProjectCreationState({
        phase: "awaiting_signature",
        message: "Project created in the control plane. Waiting for the connected wallet to sign the on-chain activation.",
      });

      await ensureWalletConnection();
      setProjectCreationState({
        phase: "submitting",
        message: "Submitting the project activation transaction to Solana devnet."
      });

      const submission = await submitPreparedTransaction({
        transactionBase64: response.activation.transactionBase64,
        recentBlockhash: response.activation.recentBlockhash,
        lastValidBlockHeight: response.activation.lastValidBlockHeight
      });
      signature = submission.signature;
      const verification = await verifyProjectActivationRequest({
        projectId: response.item.id,
        token,
        signature
      });

      setProjectCreationState({
        phase: "confirmed",
        message: "Project activation confirmed on devnet.",
        signature: verification.signature,
        explorerUrl: verification.explorerUrl
      });

      startTransition(() => {
        setSelectedProjectId(response.item.id);
        setOnchainSnapshot(verification.onchain);
      });
      await refresh();
    } catch (error) {
      if (createdProjectId && !signature) {
        await deleteProjectRequest({
          projectId: createdProjectId,
          token
        }).catch(() => undefined);
      }

      setProjectCreationState({
        phase: "error",
        message: extractErrorMessage(error),
        ...(signature ? { signature } : {})
      });
    }
  }

  async function createApiKey(input: {
    readonly label: string;
    readonly colorTag?: string;
    readonly scopes: readonly string[];
    readonly expiresAt?: string;
  }) {
    if (!token || !selectedProject) {
      setErrorMessage("Connect a wallet and select a project before creating API keys.");
      return;
    }

    const response = await createApiKeyRequest({
      projectId: selectedProject.id,
      token,
      label: input.label,
      ...(input.colorTag ? { colorTag: input.colorTag } : {}),
      scopes: input.scopes,
      ...(input.expiresAt ? { expiresAt: input.expiresAt } : {})
    });
    void trackLaunchEvent({
      name: "api_key_created",
      source: "project-api-keys",
      token,
      projectId: selectedProject.id
    });

    setLastGeneratedApiKey(response.plainTextKey);
    setApiKeys((current) => [response.item, ...current]);
  }

  async function revokeApiKey(apiKeyId: string) {
    if (!token || !selectedProject) {
      setErrorMessage("Connect a wallet and select a project before revoking API keys.");
      return;
    }

    // Optimistic: remove immediately
    let previousKeys: PortalApiKey[] = [];
    setApiKeys((current) => {
      previousKeys = current;
      return current.filter((item) => item.id !== apiKeyId);
    });

    try {
      await revokeApiKeyRequest({
        projectId: selectedProject.id,
        apiKeyId,
        token
      });
    } catch (err) {
      // Restore on failure
      setApiKeys(previousKeys);
      throw err;
    }
  }

  async function prepareFunding(input: {
    readonly asset: "SOL" | "USDC";
    readonly amount: string;
    readonly submit: boolean;
    readonly funderTokenAccount?: string;
  }) {
    if (!token || !selectedProject || !walletAddress) {
      setTransactionState({
        phase: "error",
        message: "Wallet authentication is required before funding a project."
      });
      return;
    }

    setTransactionState({
      phase: "preparing",
      message: "Preparing an unsigned funding transaction against the API."
    });

    try {
      void trackLaunchEvent({
        name: "funding_flow_started",
        source: input.submit ? "funding-submit" : "funding-prepare",
        token,
        projectId: selectedProject.id
      });
      const prepared = await prepareFundingRequest({
        projectId: selectedProject.id,
        token,
        asset: input.asset,
        amount: input.amount,
        funderWalletAddress: walletAddress,
        ...(input.funderTokenAccount ? { funderTokenAccount: input.funderTokenAccount } : {})
      });

      if (!input.submit) {
        setTransactionState({
          phase: "ready",
          message: "Unsigned transaction prepared. You can now review, copy, or sign it in the connected wallet.",
          funding: prepared
        });
        return;
      }

      setTransactionState({
        phase: "awaiting_signature",
        message: "Waiting for your wallet to approve and sign the transaction.",
        funding: prepared
      });

      await ensureWalletConnection();
      setTransactionState({
        phase: "submitting",
        message: "Signature captured. Confirming on Solana devnet now.",
        funding: prepared
      });

      const submission = await submitPreparedTransaction({
        transactionBase64: prepared.transactionBase64,
        recentBlockhash: prepared.recentBlockhash,
        lastValidBlockHeight: prepared.lastValidBlockHeight
      });
      const verification = await verifyFundingRequest({
        projectId: selectedProject.id,
        fundingRequestId: prepared.fundingRequestId,
        token,
        signature: submission.signature
      });
      setTransactionState({
        phase: "confirmed",
        message: "Funding transaction confirmed on devnet.",
        funding: prepared,
        signature: verification.signature,
        explorerUrl: verification.explorerUrl
      });
      startTransition(() => {
        setOnchainSnapshot(verification.onchain);
      });
      await refresh();
    } catch (error) {
      setTransactionState({
        phase: "error",
        message: extractErrorMessage(error)
      });
    }
  }

  return (
    <PortalContext.Provider
      value={{
        walletPhase,
        walletAddress,
        walletName,
        walletCluster,
        networkMismatch,
        errorMessage,
        walletOptions,
        user,
        token,
        projects,
        selectedProject,
        apiKeys,
        analyticsOverview,
        projectAnalytics,
        onchainSnapshot,
        adminStats,
        adminOverview,
        operators,
        loading,
        lastGeneratedApiKey,
        projectCreationState,
        transactionState,
        connectWallet,
        disconnectWallet,
        selectProject,
        refresh,
        createProject,
        createApiKey,
        revokeApiKey,
        prepareFunding
      }}
    >
      {children}
    </PortalContext.Provider>
  );
}

export function usePortal() {
  const context = useContext(PortalContext);
  if (!context) {
    throw new Error("usePortal must be used inside PortalProvider.");
  }

  return context;
}
