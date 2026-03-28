import React, { type ReactNode } from "react";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AssistantPage from "../app/assistant/page";
import ApiKeysPage from "../app/api-keys/page";
import FundingPage from "../app/funding/page";
import { PortalProvider } from "../components/portal-provider";
import { StatusSubscribeForm } from "../components/status-subscribe-form";
import { WalletPanel } from "../components/wallet-panel";
import {
  previewAdminOverview,
  previewAdminStats,
  previewApiKeys,
  previewOnchain,
  previewOperators,
  previewOverview,
  previewProjectAnalytics,
  previewProjects
} from "../lib/sample-data";
import type { FundingPreparation, PortalApiKey } from "../lib/types";

const apiMocks = vi.hoisted(() => ({
  clearAssistantConversation: vi.fn(),
  createApiKey: vi.fn(),
  createAssistantConversation: vi.fn(),
  createAuthChallenge: vi.fn(),
  createProject: vi.fn(),
  fetchApiHealth: vi.fn(),
  fetchApiStatus: vi.fn(),
  getEmailDeliveryStatus: vi.fn(),
  getAdminOverview: vi.fn(),
  getAdminAssistantStats: vi.fn(),
  getAdminStats: vi.fn(),
  getAnalyticsOverview: vi.fn(),
  getAssistantConversation: vi.fn(),
  getAssistantRateLimitStatus: vi.fn(),
  getFundingHistory: vi.fn(),
  getLatestAssistantConversation: vi.fn(),
  getOnchainSnapshot: vi.fn(),
  getOperators: vi.fn(),
  getProjectAnalytics: vi.fn(),
  getProjectBudgetStatus: vi.fn(),
  listAssistantConversations: vi.fn(),
  listApiKeys: vi.fn(),
  listProjects: vi.fn(),
  prepareFunding: vi.fn(),
  revokeApiKey: vi.fn(),
  submitFeedback: vi.fn(),
  submitInterest: vi.fn(),
  submitAssistantFeedback: vi.fn(),
  trackProductEvent: vi.fn(),
  updateAssistantConversation: vi.fn(),
  verifyFunding: vi.fn(),
  verifyProjectActivation: vi.fn(),
  verifyWalletSession: vi.fn()
}));

const solanaFlowMocks = vi.hoisted(() => ({
  signAndSubmitVersionedTransaction: vi.fn(async () => "5W6d7uQk2p"),
  solToLamportsString: vi.fn((value: string) => {
    if (value === "1") return "1000000000";
    return value;
  }),
}));

const walletMocks = vi.hoisted(() => {
  const subscribers = new Set<() => void>();
  let snapshot = {
    connected: false,
    selectedWalletName: "Phantom",
  };
  const updateSnapshot = () => {
    snapshot = {
      connected: state.connected,
      selectedWalletName: state.selectedWalletName,
    };
  };
  const notify = () => {
    updateSnapshot();
    subscribers.forEach((callback) => callback());
  };
  const state = {
    connected: false,
    selectedWalletName: "Phantom",
    reset: () => {
      state.connected = false;
      state.selectedWalletName = "Phantom";
      snapshot = {
        connected: false,
        selectedWalletName: "Phantom",
      };
      subscribers.clear();
    },
    subscribe: (callback: () => void) => {
      subscribers.add(callback);
      return () => subscribers.delete(callback);
    },
    snapshot: () => snapshot,
    confirmTransaction: vi.fn(async () => ({ value: { err: null } })),
    connect: vi.fn(async () => {
      state.connected = true;
      notify();
    }),
    disconnect: vi.fn(async () => {
      state.connected = false;
      notify();
    }),
    select: vi.fn((name: string) => {
      state.selectedWalletName = name;
      notify();
    }),
    signMessage: vi.fn(async () => new Uint8Array([1, 2, 3])),
    signTransaction: vi.fn(async (transaction: unknown) => transaction),
    sendTransaction: vi.fn(async () => "5W6d7uQk2p"),
    ensureInjectedPhantomDevnet: vi.fn(async () => true)
  };

  return state;
});

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    readonly href: string | { readonly pathname?: string };
    readonly children: ReactNode;
    readonly [key: string]: unknown;
  }) => (
    <a href={typeof href === "string" ? href : href.pathname ?? "#"} {...props}>
      {children}
    </a>
  )
}));

vi.mock("../lib/api", () => ({
  clearAssistantConversation: apiMocks.clearAssistantConversation,
  createApiKey: apiMocks.createApiKey,
  createAssistantConversation: apiMocks.createAssistantConversation,
  createAuthChallenge: apiMocks.createAuthChallenge,
  createProject: apiMocks.createProject,
  fetchApiHealth: apiMocks.fetchApiHealth,
  fetchApiStatus: apiMocks.fetchApiStatus,
  getEmailDeliveryStatus: apiMocks.getEmailDeliveryStatus,
  getAdminOverview: apiMocks.getAdminOverview,
  getAdminAssistantStats: apiMocks.getAdminAssistantStats,
  getAdminStats: apiMocks.getAdminStats,
  getAnalyticsOverview: apiMocks.getAnalyticsOverview,
  getAssistantConversation: apiMocks.getAssistantConversation,
  getAssistantRateLimitStatus: apiMocks.getAssistantRateLimitStatus,
  getFundingHistory: apiMocks.getFundingHistory,
  getLatestAssistantConversation: apiMocks.getLatestAssistantConversation,
  getOnchainSnapshot: apiMocks.getOnchainSnapshot,
  getOperators: apiMocks.getOperators,
  getProjectAnalytics: apiMocks.getProjectAnalytics,
  getProjectBudgetStatus: apiMocks.getProjectBudgetStatus,
  listAssistantConversations: apiMocks.listAssistantConversations,
  listApiKeys: apiMocks.listApiKeys,
  listProjects: apiMocks.listProjects,
  prepareFunding: apiMocks.prepareFunding,
  revokeApiKey: apiMocks.revokeApiKey,
  submitFeedback: apiMocks.submitFeedback,
  submitInterest: apiMocks.submitInterest,
  submitAssistantFeedback: apiMocks.submitAssistantFeedback,
  trackProductEvent: apiMocks.trackProductEvent,
  updateAssistantConversation: apiMocks.updateAssistantConversation,
  verifyFunding: apiMocks.verifyFunding,
  verifyProjectActivation: apiMocks.verifyProjectActivation,
  verifyWalletSession: apiMocks.verifyWalletSession
}));

vi.mock("../lib/solana-transactions", () => ({
  signAndSubmitVersionedTransaction: solanaFlowMocks.signAndSubmitVersionedTransaction,
  solToLamportsString: solanaFlowMocks.solToLamportsString,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("../lib/phantom", () => ({
  ensureInjectedPhantomDevnet: walletMocks.ensureInjectedPhantomDevnet
}));

vi.mock("@solana/wallet-adapter-react", () => ({
  useConnection: () => ({
    connection: {
      confirmTransaction: walletMocks.confirmTransaction
    }
  }),
  useWallet: () => {
    const walletState = React.useSyncExternalStore(
      walletMocks.subscribe,
      walletMocks.snapshot,
      walletMocks.snapshot
    );

    const publicKey = walletState.connected
      ? {
          toBase58: () => previewProjects[0]!.owner.walletAddress
        }
      : null;

    const makeWallet = (name: string) => ({
      adapter: {
        name,
        icon: `data:image/svg+xml;base64,${btoa(
          `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" rx="8" fill="#f97316"/><text x="16" y="20" font-size="12" text-anchor="middle" fill="white">${name.slice(0, 1)}</text></svg>`
        )}`,
        get publicKey() {
          return walletState.connected
            ? {
                toBase58: () => previewProjects[0]!.owner.walletAddress
              }
            : null;
        }
      },
      readyState: "Installed"
    });

    const selectedWallet = makeWallet(walletState.selectedWalletName);

    return {
      connect: walletMocks.connect,
      disconnect: walletMocks.disconnect,
      publicKey,
      wallets: [
        selectedWallet,
        makeWallet("Solflare"),
        makeWallet("Backpack"),
        makeWallet("Coinbase Wallet"),
        makeWallet("Trust"),
      ],
      wallet: selectedWallet,
      select: walletMocks.select,
      signMessage: walletMocks.signMessage,
      signTransaction: walletMocks.signTransaction,
      sendTransaction: walletMocks.sendTransaction,
      connected: walletState.connected
    };
  }
}));

const owner = previewProjects[0]!.owner;

function renderPortal(children: ReactNode) {
  return render(<PortalProvider>{children}</PortalProvider>);
}

function createFundingPreparation(overrides: Partial<FundingPreparation> = {}): FundingPreparation {
  return {
    fundingRequestId: "funding-request-1",
    projectPda: previewOnchain.projectPda,
    protocolConfigPda: "FyxvoProtocol111111111111111111111111111111",
    treasuryPda: previewOnchain.treasuryPda,
    recentBlockhash: "9RQcSt9ANxLNyZn7wVvmjmxuFGRUqSgduCMsZbxXXA9P",
    transactionBase64: "dGVzdC10cmFuc2FjdGlvbg==",
    lastValidBlockHeight: 421337,
    amount: "1000000000",
    asset: "SOL",
    ...(previewOnchain.treasuryUsdcVault ? { treasuryUsdcVault: previewOnchain.treasuryUsdcVault.address } : {}),
    ...overrides
  };
}

function createApiKeyResult(overrides: Partial<PortalApiKey> = {}) {
  return {
    item: {
      id: "generated-key-1",
      projectId: previewProjects[0]!.id,
      createdById: owner.id,
      label: "Priority relay",
      prefix: "fyxvo_live_prio",
      status: "ACTIVE",
      scopes: ["project:read", "rpc:request", "priority:relay"],
      lastUsedAt: null,
      expiresAt: null,
      revokedAt: null,
      createdAt: "2026-03-18T19:00:00.000Z",
      updatedAt: "2026-03-18T19:00:00.000Z",
      ...overrides
    },
    plainTextKey: "fyxvo_live_prio_secret_123"
  };
}

async function connectAuthenticatedWallet() {
  await userEvent.click(screen.getByRole("button", { name: "Connect wallet" }));
  const dialog = await screen.findByRole("dialog", { name: "Connect a Solana wallet" });
  await userEvent.click(within(dialog).getByRole("button", { name: /Phantom/i }));
  await waitFor(() => {
    expect(apiMocks.verifyWalletSession).toHaveBeenCalledTimes(1);
  });
  await waitFor(() => {
    expect(apiMocks.listProjects).toHaveBeenCalledWith("session-token");
  });
}

beforeEach(() => {
  localStorage.clear();
  walletMocks.reset();
  Object.assign(navigator, {
    clipboard: {
      writeText: vi.fn().mockResolvedValue(undefined)
    }
  });

  apiMocks.createAuthChallenge.mockResolvedValue({
    walletAddress: owner.walletAddress,
    nonce: "challenge-1",
    message: "Sign in to Fyxvo"
  });
  apiMocks.verifyWalletSession.mockResolvedValue({
    token: "session-token",
    user: owner
  });
  apiMocks.listProjects.mockResolvedValue(previewProjects);
  apiMocks.listApiKeys.mockResolvedValue(previewApiKeys);
  apiMocks.getAnalyticsOverview.mockResolvedValue(previewOverview);
  apiMocks.getProjectAnalytics.mockResolvedValue(previewProjectAnalytics);
  apiMocks.getOnchainSnapshot.mockResolvedValue(previewOnchain);
  apiMocks.getAdminOverview.mockResolvedValue(previewAdminOverview);
  apiMocks.fetchApiHealth.mockResolvedValue({
    status: "ok",
    service: "fyxvo-api",
    version: "v1",
    assistantAvailable: true,
    timestamp: "2026-03-26T00:00:00.000Z"
  });
  apiMocks.fetchApiStatus.mockResolvedValue({
    status: "ok",
    service: "fyxvo-api",
    version: "v1",
    assistantAvailable: true,
    timestamp: "2026-03-26T00:00:00.000Z",
    environment: "test"
  });
  apiMocks.listAssistantConversations.mockResolvedValue({ items: [] });
  apiMocks.getLatestAssistantConversation.mockResolvedValue({ item: null });
  apiMocks.getAssistantRateLimitStatus.mockResolvedValue({
    messagesUsedThisHour: 0,
    messagesRemainingThisHour: 20,
    limit: 20,
    windowResetAt: "2026-03-26T01:00:00.000Z",
    resetAt: "2026-03-26T01:00:00.000Z",
    model: "claude-sonnet-4-20250514",
    assistantAvailable: true
  });
  apiMocks.createAssistantConversation.mockResolvedValue({
    item: {
      id: "conversation-1",
      title: "Explain the difference between standard RPC and priority relay on Fyxvo",
      pinned: false,
      archivedAt: null,
      createdAt: "2026-03-26T00:00:00.000Z",
      updatedAt: "2026-03-26T00:00:00.000Z",
      lastMessageAt: "2026-03-26T00:00:00.000Z",
      messageCount: 2
    }
  });
  apiMocks.getAssistantConversation.mockResolvedValue({
    item: {
      id: "conversation-1",
      title: "Explain the difference between standard RPC and priority relay on Fyxvo",
      pinned: false,
      archivedAt: null,
      createdAt: "2026-03-26T00:00:00.000Z",
      updatedAt: "2026-03-26T00:00:01.000Z",
      lastMessageAt: "2026-03-26T00:00:01.000Z",
      messageCount: 2,
      messages: [
        {
          id: "message-user-1",
          role: "user",
          content: "Explain the difference between standard RPC and priority relay on Fyxvo",
          createdAt: "2026-03-26T00:00:00.000Z"
        },
        {
          id: "message-assistant-1",
          role: "assistant",
          content:
            "Standard RPC handles general request flow.\n\n```bash\ncurl https://rpc.fyxvo.com/rpc\n```\n\nPriority relay is for latency-sensitive traffic.",
          createdAt: "2026-03-26T00:00:01.000Z"
        }
      ]
    }
  });
  apiMocks.clearAssistantConversation.mockResolvedValue(undefined);
  apiMocks.submitAssistantFeedback.mockResolvedValue({
    item: {
      id: "feedback-1",
      rating: "up",
      note: null,
      createdAt: "2026-03-26T00:00:02.000Z"
    }
  });
  apiMocks.getAdminAssistantStats.mockResolvedValue({
    item: {
      requestsToday: 4,
      requestsThisWeek: 12,
      failedRequestsToday: 1,
      failedRequestsThisWeek: 2,
      internalFailuresToday: 0,
      averageResponseTimeMs: 480,
      averageTokensPerResponse: 210,
      rateLimitHitsToday: 0,
      messagesPerDay: [{ date: "2026-03-26", count: 4 }],
      topPromptCategories: [{ category: "rpc", count: 2 }],
      topLinkedDocsSections: [{ section: "quickstart", count: 1 }],
      feedback: {
        positive: 1,
        negative: 0,
        withNotes: 0,
        recent: []
      },
      recentFailures: []
    }
  });
  apiMocks.getEmailDeliveryStatus.mockResolvedValue({
    configured: true,
    provider: "resend",
    email: "owner@fyxvo.dev",
    emailVerified: false,
    verificationRequired: true,
    digestEnabled: false,
    digestNextSendAt: null,
    digestLastSentAt: null,
    latestDigestGeneratedAt: null,
    latestDigestSent: null,
    statusSubscriberActive: false,
  });
  apiMocks.getAdminStats.mockResolvedValue(previewAdminStats);
  apiMocks.getOperators.mockResolvedValue(previewOperators);
  apiMocks.prepareFunding.mockResolvedValue(createFundingPreparation());
  apiMocks.getFundingHistory.mockResolvedValue([]);
  apiMocks.getProjectBudgetStatus.mockResolvedValue({
    dailyBudgetLamports: null,
    monthlyBudgetLamports: null,
    warningThresholdPct: 80,
    hardStop: false,
    dailySpendLamports: 0,
    monthlySpendLamports: 0,
    dailyUsagePct: null,
    monthlyUsagePct: null,
    dailyWarningTriggered: false,
    monthlyWarningTriggered: false,
  });
  apiMocks.createApiKey.mockResolvedValue(createApiKeyResult());
  apiMocks.revokeApiKey.mockResolvedValue(undefined);
  apiMocks.verifyFunding.mockResolvedValue({
    fundingRequestId: "funding-request-1",
    signature: "5W6d7uQk2p",
    confirmedAt: "2026-03-28T00:00:00.000Z",
    explorerUrl: "https://explorer.solana.com/tx/5W6d7uQk2p?cluster=devnet",
    onchain: {
      projectPda: previewOnchain.projectPda,
      treasuryPda: previewOnchain.treasuryPda,
    }
  });
  apiMocks.submitInterest.mockResolvedValue({
    item: {
      id: "interest-1",
      status: "NEW",
      createdAt: "2026-03-19T06:18:00.000Z",
      email: "jordan@northwind.dev"
    },
    message: "Interest captured."
  });
  apiMocks.trackProductEvent.mockResolvedValue({
    accepted: true,
    requestId: "request-1"
  });
  walletMocks.ensureInjectedPhantomDevnet.mockResolvedValue(true);
  walletMocks.confirmTransaction.mockResolvedValue({ value: { err: null } });
  solanaFlowMocks.signAndSubmitVersionedTransaction.mockResolvedValue("5W6d7uQk2p");
  solanaFlowMocks.solToLamportsString.mockImplementation((value: string) => {
    if (value === "1") return "1000000000";
    return value;
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("frontend flows", () => {
  it("shows a wallet network mismatch after authentication when Phantom stays off devnet", async () => {
    walletMocks.ensureInjectedPhantomDevnet.mockResolvedValueOnce(false);

    renderPortal(<WalletPanel />);

    await connectAuthenticatedWallet();

    expect(await screen.findByText("Wallet network mismatch")).toBeInTheDocument();
    expect(screen.getByText(/Switch the wallet to Solana devnet/)).toBeInTheDocument();
    expect(await screen.findByText("authenticated")).toBeInTheDocument();
  });

  it("prepares a funding transaction for an authenticated project", async () => {
    renderPortal(
      <>
        <WalletPanel />
        <FundingPage />
      </>
    );

    await connectAuthenticatedWallet();
    await userEvent.click(screen.getByRole("button", { name: "Prepare and fund" }));

    expect(await screen.findByText(/Funding confirmed\./)).toBeInTheDocument();
    expect(await screen.findByText("funding-request-1")).toBeInTheDocument();
    expect(apiMocks.prepareFunding).toHaveBeenCalledWith({
      projectId: previewProjects[0]!.id,
      token: "session-token",
      asset: "SOL",
      amount: "1000000000",
      funderWalletAddress: owner.walletAddress
    });
    expect(apiMocks.verifyFunding).toHaveBeenCalledWith({
      projectId: previewProjects[0]!.id,
      token: "session-token",
      fundingRequestId: "funding-request-1",
      signature: "5W6d7uQk2p"
    });
  });

  it("generates and reveals a new API key from the project controls", async () => {
    renderPortal(
      <>
        <WalletPanel />
        <ApiKeysPage />
      </>
    );

    await connectAuthenticatedWallet();

    await userEvent.click(screen.getByRole("button", { name: "Generate key" }));

    const dialog = await screen.findByRole("dialog", { name: "Generate an API key" });
    await userEvent.click(within(dialog).getByRole("button", { name: "Generate" }));

    expect(await screen.findByText("New API key generated")).toBeInTheDocument();
    expect(await screen.findByText("fyxvo_live_prio_secret_123")).toBeInTheDocument();
    expect(apiMocks.createApiKey).toHaveBeenCalledWith({
      projectId: previewProjects[0]!.id,
      token: "session-token",
      label: "Priority relay",
      colorTag: "violet",
      scopes: ["project:read", "rpc:request", "priority:relay"]
    });
  });

  it("renders the assistant page, streams a mocked response, shows copy actions, and clears conversation state", async () => {
    const encoder = new TextEncoder();
    let releaseSecondChunk: (() => void) | undefined;
    const secondChunk = new Promise<void>((resolve) => {
      releaseSecondChunk = resolve;
    });

    const streamedResponse = new ReadableStream<Uint8Array>({
      async start(controller) {
        controller.enqueue(
          encoder.encode('data: {"text":"Standard RPC handles general request flow."}\n\n')
        );
        await secondChunk;
        controller.enqueue(
          encoder.encode('data: {"text":"\\n\\n```bash\\ncurl https://rpc.fyxvo.com/rpc\\n```\\n\\nPriority relay is for latency-sensitive traffic."}\n\n')
        );
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      }
    });

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : String(input.url);
      if (url.includes("/v1/assistant/chat") || url.includes("/api/assistant")) {
        return new Response(streamedResponse, {
          status: 200,
          headers: {
            "content-type": "text/event-stream",
            "x-fyxvo-conversation-id": "conversation-1"
          }
        });
      }

      throw new Error(`Unexpected fetch call: ${url}`);
    });

    renderPortal(
      <>
        <WalletPanel />
        <AssistantPage />
      </>
    );

    expect(await screen.findByText("Getting started")).toBeInTheDocument();

    await connectAuthenticatedWallet();

    const composer = await screen.findByRole("textbox", { name: "Message Fyxvo Assistant" });
    await userEvent.type(
      composer,
      "Explain the difference between standard RPC and priority relay on Fyxvo"
    );
    await userEvent.click(screen.getByRole("button", { name: "Send" }));

    expect(
      await screen.findByText("Standard RPC handles general request flow.")
    ).toBeInTheDocument();

    releaseSecondChunk?.();

    expect(
      await screen.findByText("Priority relay is for latency-sensitive traffic.")
    ).toBeInTheDocument();

    const copyButtons = await screen.findAllByRole("button", { name: "Copy" });
    expect(copyButtons.length).toBeGreaterThan(0);
    await userEvent.click(copyButtons[copyButtons.length - 1]!);
    expect(navigator.clipboard.writeText).toHaveBeenCalled();

    expect(await screen.findByRole("button", { name: "Clear" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Clear" }));

    await waitFor(() => {
      expect(apiMocks.clearAssistantConversation).toHaveBeenCalledWith(
        "conversation-1",
        "session-token"
      );
    });
    expect(
      await screen.findByText("Ask about onboarding, debugging, relay behavior, or live project state")
    ).toBeInTheDocument();
  }, 10000);

  it("submits a status subscription and shows a saved confirmation", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ success: true }), {
        status: 201,
        headers: {
          "content-type": "application/json"
        }
      })
    );

    renderPortal(<StatusSubscribeForm />);

    fireEvent.change(screen.getByRole("textbox", { name: "Status subscription email" }), {
      target: {
        value: " alerts@example.com "
      }
    });
    await userEvent.click(screen.getByRole("button", { name: "Join list" }));

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith("https://api.fyxvo.com/v1/status/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "alerts@example.com", source: "status-page" }),
      });
    });
    expect(
      await screen.findByText("Your email is now subscribed to incident and resolution updates.")
    ).toBeInTheDocument();
  });
});
