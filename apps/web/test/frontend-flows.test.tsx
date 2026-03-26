import React, { type ReactNode } from "react";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AssistantPage from "../app/assistant/page";
import ApiKeysPage from "../app/api-keys/page";
import FundingPage from "../app/funding/page";
import { PortalProvider } from "../components/portal-provider";
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
  fetchApiHealth: vi.fn(),
  fetchApiStatus: vi.fn(),
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
  listAssistantConversations: vi.fn(),
  listApiKeys: vi.fn(),
  listProjects: vi.fn(),
  prepareFunding: vi.fn(),
  revokeApiKey: vi.fn(),
  submitInterest: vi.fn(),
  submitAssistantFeedback: vi.fn(),
  trackProductEvent: vi.fn(),
  verifyWalletSession: vi.fn()
}));

const walletMocks = vi.hoisted(() => {
  const state = {
    connected: false,
    selectedWalletName: "Phantom",
    confirmTransaction: vi.fn(async () => ({ value: { err: null } })),
    connect: vi.fn(async () => {
      state.connected = true;
    }),
    disconnect: vi.fn(async () => {
      state.connected = false;
    }),
    select: vi.fn((name: string) => {
      state.selectedWalletName = name;
    }),
    signMessage: vi.fn(async () => new Uint8Array([1, 2, 3])),
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
  fetchApiHealth: apiMocks.fetchApiHealth,
  fetchApiStatus: apiMocks.fetchApiStatus,
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
  listAssistantConversations: apiMocks.listAssistantConversations,
  listApiKeys: apiMocks.listApiKeys,
  listProjects: apiMocks.listProjects,
  prepareFunding: apiMocks.prepareFunding,
  revokeApiKey: apiMocks.revokeApiKey,
  submitInterest: apiMocks.submitInterest,
  submitAssistantFeedback: apiMocks.submitAssistantFeedback,
  trackProductEvent: apiMocks.trackProductEvent,
  verifyWalletSession: apiMocks.verifyWalletSession
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
    const publicKey = walletMocks.connected
      ? {
          toBase58: () => previewProjects[0]!.owner.walletAddress
        }
      : null;

    const makeWallet = (name: string) => ({
      adapter: {
        name,
        get publicKey() {
          return walletMocks.connected
            ? {
                toBase58: () => previewProjects[0]!.owner.walletAddress
              }
            : null;
        }
      },
      readyState: "Installed"
    });

    const selectedWallet = makeWallet(walletMocks.selectedWalletName);

    return {
      connect: walletMocks.connect,
      disconnect: walletMocks.disconnect,
      publicKey,
      wallets: [
        selectedWallet,
        makeWallet("Solflare"),
        makeWallet("Backpack")
      ],
      wallet: selectedWallet,
      select: walletMocks.select,
      signMessage: walletMocks.signMessage,
      sendTransaction: walletMocks.sendTransaction,
      connected: walletMocks.connected
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
  walletMocks.connected = false;
  walletMocks.selectedWalletName = "Phantom";
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
      }
    }
  });
  apiMocks.getAdminStats.mockResolvedValue(previewAdminStats);
  apiMocks.getOperators.mockResolvedValue(previewOperators);
  apiMocks.prepareFunding.mockResolvedValue(createFundingPreparation());
  apiMocks.getFundingHistory.mockResolvedValue([]);
  apiMocks.createApiKey.mockResolvedValue(createApiKeyResult());
  apiMocks.revokeApiKey.mockResolvedValue(undefined);
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
    await userEvent.click(screen.getByRole("button", { name: "Prepare only" }));

    expect(
      await screen.findByText("Unsigned transaction prepared. You can now review, copy, or sign it in the connected wallet.")
    ).toBeInTheDocument();
    expect(await screen.findByText("funding-request-1")).toBeInTheDocument();
    expect(apiMocks.prepareFunding).toHaveBeenCalledWith({
      projectId: previewProjects[0]!.id,
      token: "session-token",
      asset: "SOL",
      amount: "1000000000",
      funderWalletAddress: owner.walletAddress
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
      if (url.includes("/v1/assistant/chat")) {
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
  });
});
