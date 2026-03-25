"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button, Notice } from "@fyxvo/ui";
import { WalletConnectButton } from "../../components/wallet-connect-button";
import { PageHeader } from "../../components/page-header";
import { usePortal } from "../../components/portal-provider";
import { webEnv } from "../../lib/env";
import {
  clearAssistantConversation,
  createAssistantConversation,
  fetchApiStatus,
  getAssistantConversation,
  getAssistantRateLimitStatus,
  getLatestAssistantConversation,
  listAssistantConversations,
} from "../../lib/api";

type Message = {
  id?: string;
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
};

type ConversationSummary = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string;
  messageCount: number;
};

interface AssistantErrorPayload {
  code?: string;
  error?: string;
  message?: string;
  retryAfterMs?: number;
}

const SUGGESTED_QUESTIONS = [
  "How do I connect to the Fyxvo gateway in TypeScript?",
  "What's the difference between standard and priority relay?",
  "Show me a curl example for getLatestBlockhash",
  "How do I migrate from Helius to Fyxvo?",
  "What pricing is live right now?",
  "How do I debug an RPC error?",
];

const HISTORY_KEY = "fyxvo.assistant.cache";
const PLAYGROUND_INSERT_KEY = "fyxvo.playground.assistantInsert";

function extractSsePayloads(input: string): { payloads: string[]; remainder: string } {
  const events = input.split(/\r?\n\r?\n/);
  const remainder = events.pop() ?? "";
  const payloads = events
    .map((event) =>
      event
        .split(/\r?\n/)
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trimStart())
        .join("\n")
    )
    .filter((payload) => payload.length > 0);

  return { payloads, remainder };
}

async function parseAssistantErrorPayload(response: Response): Promise<AssistantErrorPayload | null> {
  const contentType = response.headers.get("content-type") ?? "";

  try {
    if (contentType.includes("application/json")) {
      return (await response.json()) as AssistantErrorPayload;
    }

    const text = await response.text();
    return text ? ({ error: text } satisfies AssistantErrorPayload) : null;
  } catch {
    return null;
  }
}

function getAssistantErrorMessage(status: number, payload: AssistantErrorPayload | null | undefined): string {
  if (status === 401) {
    return "Your session expired. Reconnect your wallet and try again.";
  }

  if (status === 429) {
    const retryAfterMs = payload?.retryAfterMs;
    if (typeof retryAfterMs === "number" && retryAfterMs > 0) {
      const retryMinutes = Math.max(1, Math.ceil(retryAfterMs / 60_000));
      return `You have reached the assistant rate limit. Try again in ${retryMinutes} minute${retryMinutes === 1 ? "" : "s"}.`;
    }

    return payload?.message ?? "You have reached the assistant rate limit. Please try again shortly.";
  }

  if (status === 503) {
    return payload?.message ?? "The AI assistant is not configured right now. Please check back soon.";
  }

  if (status === 500) {
    return payload?.message ?? "The AI assistant ran into an internal error. Please try again.";
  }

  if (status === 400) {
    return payload?.message ?? "That request could not be processed. Please rephrase your message.";
  }

  return payload?.message ?? payload?.error ?? "The AI assistant request failed. Please try again.";
}

function relativeTime(value: string): string {
  const diffMs = Date.now() - new Date(value).getTime();
  if (diffMs < 60_000) return "just now";
  if (diffMs < 3_600_000) return `${Math.floor(diffMs / 60_000)}m ago`;
  if (diffMs < 86_400_000) return `${Math.floor(diffMs / 3_600_000)}h ago`;
  return `${Math.floor(diffMs / 86_400_000)}d ago`;
}

function firstCodeBlock(content: string): string | null {
  const match = content.match(/```[\w-]*\n([\s\S]*?)```/);
  return match?.[1]?.trim() ?? null;
}

function detectDocsSection(content: string): { href: string; label: string } | null {
  const lower = content.toLowerCase();
  if (lower.includes("pricing")) return { href: "/docs#pricing", label: "Open pricing docs" };
  if (lower.includes("webhook")) return { href: "/docs#webhooks", label: "Open webhook docs" };
  if (lower.includes("api key") || lower.includes("x-api-key")) return { href: "/docs#authentication", label: "Open auth docs" };
  if (lower.includes("fund") || lower.includes("sol")) return { href: "/docs#quickstart", label: "Open quickstart" };
  if (lower.includes("priority")) return { href: "/docs#priority-rpc", label: "Open priority relay docs" };
  return null;
}

function detectPlaygroundInsert(content: string): { method: string; params: Record<string, string>; snippet: string } | null {
  const block = firstCodeBlock(content) ?? content;
  const methodMatch = block.match(/"method"\s*:\s*"([^"]+)"/) ?? block.match(/\b(getHealth|getSlot|getLatestBlockhash|getBalance|getAccountInfo|getEpochInfo|simulateTransaction|getVersion)\b/);
  if (!methodMatch) return null;
  const method = methodMatch[1]!;
  const params: Record<string, string> = {};
  if (method === "getBalance" || method === "getAccountInfo") {
    const keyMatch = block.match(/[1-9A-HJ-NP-Za-km-z]{32,44}/);
    if (keyMatch) params.pubkey = keyMatch[0];
  }
  if (method === "simulateTransaction") {
    params.signature = "";
  }
  return { method, params, snippet: block };
}

function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="group relative my-3 overflow-hidden rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)]">
      <div className="flex items-center justify-between border-b border-[var(--fyxvo-border)] px-4 py-2">
        <span className="text-xs text-[var(--fyxvo-text-muted)]">{language}</span>
        <button
          onClick={() => {
            void navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          className="text-xs text-[var(--fyxvo-text-muted)] transition-colors hover:text-[var(--fyxvo-text)]"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 text-sm text-[var(--fyxvo-text)]">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function MessageContent({ content }: { content: string }) {
  const parts = content.split(/(```[\w-]*\n[\s\S]*?```)/g);
  return (
    <div className="space-y-2">
      {parts.map((part, index) => {
        if (part.startsWith("```")) {
          const lines = part.split("\n");
          const language = lines[0]?.slice(3) ?? "";
          const code = lines.slice(1, -1).join("\n");
          return <CodeBlock key={index} code={code} language={language || "code"} />;
        }

        const inlineParts = part.split(/(`[^`]+`)/g);
        return (
          <p key={index} className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--fyxvo-text)]">
            {inlineParts.map((piece, pieceIndex) =>
              piece.startsWith("`") && piece.endsWith("`") ? (
                <code
                  key={pieceIndex}
                  className="rounded bg-[var(--fyxvo-panel-soft)] px-1 py-0.5 font-mono text-xs text-[var(--fyxvo-brand)]"
                >
                  {piece.slice(1, -1)}
                </code>
              ) : (
                piece
              )
            )}
          </p>
        );
      })}
    </div>
  );
}

export default function AssistantPage() {
  const portal = usePortal();
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [rateLimitStatus, setRateLimitStatus] = useState<{
    messagesUsedThisHour: number;
    messagesRemainingThisHour: number;
    limit: number;
    resetAt: string;
    model: string;
    assistantAvailable: boolean;
  } | null>(null);
  const [assistantAvailable, setAssistantAvailable] = useState<boolean | null>(null);
  const [assistantStatusMessage, setAssistantStatusMessage] = useState<string | null>(null);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const isAuthenticated = portal.walletPhase === "authenticated";
  const isAssistantUnavailable = assistantAvailable === false;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(HISTORY_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored) as {
        activeConversationId?: string | null;
        messages?: Message[];
      };
      if (parsed.activeConversationId) setActiveConversationId(parsed.activeConversationId);
      if (parsed.messages?.length) setMessages(parsed.messages.slice(-50));
    } catch {
      // ignore cache
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify({ activeConversationId, messages: messages.slice(-50) }));
    } catch {
      // ignore cache
    }
  }, [activeConversationId, messages]);

  useEffect(() => {
    let cancelled = false;

    fetchApiStatus()
      .then((data) => {
        if (cancelled) return;
        setAssistantAvailable(data.assistantAvailable ?? false);
        setAssistantStatusMessage(
          data.assistantAvailable === false
            ? "The AI assistant is currently unavailable. Please check back after the next deployment."
            : null
        );
      })
      .catch(() => {
        if (cancelled) return;
        setAssistantAvailable(null);
        setAssistantStatusMessage("Fyxvo could not verify assistant availability right now. You can still try sending a message.");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!portal.token || !isAuthenticated) return;
    let cancelled = false;

    Promise.all([
      listAssistantConversations(portal.token),
      getLatestAssistantConversation(portal.token),
      getAssistantRateLimitStatus(portal.token),
    ])
      .then(([conversationData, latestData, rateData]) => {
        if (cancelled) return;
        setConversations(conversationData.items);
        setRateLimitStatus(rateData);
        setAssistantAvailable(rateData.assistantAvailable);
        if (latestData.item) {
          setActiveConversationId((current) => current ?? latestData.item?.id ?? null);
          setMessages((current) => (current.length > 0 ? current : latestData.item?.messages ?? []));
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [portal.token, isAuthenticated]);

  async function refreshConversationList() {
    if (!portal.token) return;
    const [conversationData, rateData] = await Promise.all([
      listAssistantConversations(portal.token),
      getAssistantRateLimitStatus(portal.token).catch(() => null),
    ]);
    setConversations(conversationData.items);
    if (rateData) {
      setRateLimitStatus(rateData);
      setAssistantAvailable(rateData.assistantAvailable);
    }
  }

  async function loadConversation(conversationId: string) {
    if (!portal.token) return;
    setLoadingConversation(true);
    try {
      const data = await getAssistantConversation(conversationId, portal.token);
      setMessages(data.item.messages);
      setActiveConversationId(conversationId);
      setSidebarOpen(false);
    } finally {
      setLoadingConversation(false);
    }
  }

  async function handleCreateConversation() {
    if (!portal.token) {
      setActiveConversationId(null);
      setMessages([]);
      return;
    }
    const data = await createAssistantConversation(undefined, portal.token);
    setConversations((current) => [data.item, ...current.filter((item) => item.id !== data.item.id)]);
    setActiveConversationId(data.item.id);
    setMessages([]);
    setSidebarOpen(false);
  }

  async function handleClearConversation() {
    if (!activeConversationId) {
      setMessages([]);
      return;
    }
    setMessages([]);
    if (portal.token) {
      await clearAssistantConversation(activeConversationId, portal.token).catch(() => undefined);
      const remaining = conversations.filter((item) => item.id !== activeConversationId);
      setConversations(remaining);
      setActiveConversationId(remaining[0]?.id ?? null);
      if (remaining[0] && portal.token) {
        await loadConversation(remaining[0].id);
      }
    }
  }

  function replaceLastAssistantMessage(content: string) {
    setMessages((prev) => {
      const copy = [...prev];
      const last = copy[copy.length - 1];
      if (last && last.role === "assistant") {
        copy[copy.length - 1] = { ...last, content };
      }
      return copy;
    });
  }

  function copyMessage(content: string, idx: number) {
    void navigator.clipboard.writeText(content);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  }

  function copyMarkdown(content: string, idx: number) {
    void navigator.clipboard.writeText(content);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  }

  function insertIntoPlayground(content: string) {
    const payload = detectPlaygroundInsert(content);
    if (!payload) return;
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(PLAYGROUND_INSERT_KEY, JSON.stringify(payload));
      window.location.href = `/playground?method=${encodeURIComponent(payload.method)}`;
    }
  }

  const availableSolCredits = portal.onchainSnapshot.balances?.availableSolCredits;
  const projectContext = portal.selectedProject
    ? {
        projectName: portal.selectedProject.name,
        projectNames: portal.projects.map((project) => project.name),
        balance: availableSolCredits ? `${(Number(BigInt(availableSolCredits)) / 1e9).toFixed(4)} SOL` : undefined,
        totalBalanceSol: availableSolCredits ? Number(BigInt(availableSolCredits)) / 1e9 : undefined,
        requestCount: portal.selectedProject._count?.requestLogs,
        requestsLast7Days: portal.projectAnalytics.totals.requestLogs,
        gatewayStatus: assistantAvailable === false ? "unavailable" : "operational",
      }
    : undefined;

  async function sendMessage(content: string) {
    if (!content.trim() || isStreaming || isAssistantUnavailable || !portal.token) return;

    let conversationId = activeConversationId;
    if (!conversationId) {
      const created = await createAssistantConversation(content.trim().slice(0, 60), portal.token);
      conversationId = created.item.id;
      setActiveConversationId(conversationId);
      setConversations((current) => [created.item, ...current.filter((item) => item.id !== created.item.id)]);
    }

    const userMessage: Message = { role: "user", content: content.trim() };
    const nextMessages = [...messages, userMessage];
    setMessages([...nextMessages, { role: "assistant", content: "" }]);
    setInput("");
    setIsStreaming(true);

    try {
      const response = await fetch(new URL("/v1/assistant/chat", webEnv.apiBaseUrl), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${portal.token}`,
        },
        body: JSON.stringify({
          conversationId,
          messages: nextMessages,
          projectContext,
        }),
      });

      const returnedConversationId = response.headers.get("x-fyxvo-conversation-id");
      if (returnedConversationId) {
        setActiveConversationId(returnedConversationId);
      }

      const contentType = response.headers.get("content-type") ?? "";
      if (!response.ok) {
        const errorPayload = await parseAssistantErrorPayload(response);
        const errorContent = getAssistantErrorMessage(response.status, errorPayload);
        if (response.status === 503) {
          setAssistantAvailable(false);
          setAssistantStatusMessage(errorContent);
        }
        replaceLastAssistantMessage(errorContent);
        return;
      }

      if (!response.body || !contentType.includes("text/event-stream")) {
        const errorPayload = await parseAssistantErrorPayload(response);
        replaceLastAssistantMessage(getAssistantErrorMessage(response.status || 500, errorPayload));
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      let buffer = "";
      let streamError: string | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const { payloads, remainder } = extractSsePayloads(buffer);
        buffer = remainder;

        for (const payload of payloads) {
          if (payload === "[DONE]") continue;
          try {
            const event = JSON.parse(payload) as { text?: string; error?: string };
            if (event.text) {
              accumulated += event.text;
              replaceLastAssistantMessage(accumulated);
            }
            if (event.error) {
              streamError = event.error;
            }
          } catch {
            // skip malformed chunk
          }
        }
      }

      buffer += decoder.decode();
      const { payloads: trailingPayloads } = extractSsePayloads(`${buffer}\n\n`);
      for (const payload of trailingPayloads) {
        if (payload === "[DONE]") continue;
        try {
          const event = JSON.parse(payload) as { text?: string; error?: string };
          if (event.text) {
            accumulated += event.text;
            replaceLastAssistantMessage(accumulated);
          }
          if (event.error) {
            streamError = event.error;
          }
        } catch {
          // skip malformed chunk
        }
      }

      if (streamError && accumulated.length === 0) {
        replaceLastAssistantMessage(streamError);
      }

      await refreshConversationList();
    } catch {
      replaceLastAssistantMessage("Network error. Check your connection and try again.");
    } finally {
      setIsStreaming(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendMessage(input);
    }
  }

  const activeDocsSection = messages.length > 0 ? detectDocsSection(messages[messages.length - 1]?.content ?? "") : null;

  return (
    <div className="flex h-[calc(100vh-4rem)] -mx-4 -mt-8 flex-col sm:-mx-6 lg:-mx-8">
      <div className="flex min-h-0 flex-1">
        <aside
          className={`${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          } fixed inset-y-0 left-0 z-40 mt-16 w-[300px] border-r border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)] transition-transform lg:static lg:mt-0 lg:translate-x-0`}
        >
          <div className="flex h-full flex-col">
            <div className="border-b border-[var(--fyxvo-border)] px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-text-muted)]">Conversations</p>
                  <p className="mt-1 text-sm text-[var(--fyxvo-text-muted)]">Last 50 messages persist on the server.</p>
                </div>
                <Button size="sm" variant="secondary" onClick={() => void handleCreateConversation()}>
                  New
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              {conversations.length === 0 ? (
                <p className="px-2 py-4 text-sm text-[var(--fyxvo-text-muted)]">No conversations yet.</p>
              ) : (
                <div className="space-y-2">
                  {conversations.map((conversation) => (
                    <button
                      key={conversation.id}
                      onClick={() => void loadConversation(conversation.id)}
                      className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                        activeConversationId === conversation.id
                          ? "border-brand-500/40 bg-brand-500/10"
                          : "border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] hover:border-brand-500/20"
                      }`}
                    >
                      <div className="line-clamp-2 text-sm font-medium text-[var(--fyxvo-text)]">{conversation.title}</div>
                      <div className="mt-1 flex items-center justify-between gap-2 text-xs text-[var(--fyxvo-text-muted)]">
                        <span>{conversation.messageCount} messages</span>
                        <span>{relativeTime(conversation.lastMessageAt)}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </aside>

        {sidebarOpen ? (
          <button
            type="button"
            aria-label="Close conversation list"
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-30 mt-16 bg-black/30 lg:hidden"
          />
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="shrink-0 border-b border-[var(--fyxvo-border)] px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="mb-3 flex items-center gap-2 lg:hidden">
                  <Button size="sm" variant="secondary" onClick={() => setSidebarOpen(true)}>
                    Conversations
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => void handleCreateConversation()}>
                    New
                  </Button>
                </div>
                <PageHeader
                  eyebrow="AI Assistant · Claude"
                  title="Fyxvo Developer Assistant"
                  description="Ask about Solana development, live Fyxvo product behavior, and integration examples grounded in your workspace."
                />
                <p className="mt-2 text-xs text-[var(--fyxvo-text-muted)]">
                  AI responses may not always be accurate. Test all code before using in production.
                </p>
              </div>
              {messages.length > 0 && (
                <Button variant="ghost" size="sm" onClick={() => void handleClearConversation()} className="shrink-0 text-xs">
                  Clear
                </Button>
              )}
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto]">
              <div>
                {assistantStatusMessage ? (
                  <Notice
                    tone={isAssistantUnavailable ? "warning" : "neutral"}
                    title={isAssistantUnavailable ? "AI assistant unavailable" : "Assistant status"}
                  >
                    <span>{assistantStatusMessage}</span>
                  </Notice>
                ) : null}
                {!isAuthenticated ? (
                  <div className="mt-3">
                    <Notice tone="neutral" title="Connect your wallet to use the AI assistant">
                      <div className="flex flex-wrap items-center gap-3">
                        <span>You need an active wallet session to send messages.</span>
                        <WalletConnectButton compact />
                      </div>
                    </Notice>
                  </div>
                ) : null}
              </div>

              <div className="rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-text-muted)]">Assistant status</p>
                <div className="mt-2 space-y-1 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[var(--fyxvo-text-muted)]">Availability</span>
                    <span className={assistantAvailable === false ? "text-amber-500" : "text-emerald-500"}>
                      {assistantAvailable === false ? "Unavailable" : "Available"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[var(--fyxvo-text-muted)]">Model</span>
                    <span className="font-mono text-xs text-[var(--fyxvo-text)]">{rateLimitStatus?.model ?? "Claude"}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[var(--fyxvo-text-muted)]">Remaining this hour</span>
                    <span className="font-medium text-[var(--fyxvo-text)]">{rateLimitStatus?.messagesRemainingThisHour ?? "—"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
            {loadingConversation ? (
              <div className="mx-auto max-w-3xl space-y-3">
                {[0, 1, 2].map((item) => (
                  <div key={item} className="h-16 animate-pulse rounded-2xl bg-[var(--fyxvo-panel-soft)]" />
                ))}
              </div>
            ) : messages.length === 0 ? (
              <div className="mx-auto max-w-2xl space-y-6">
                <div className="rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-6 text-center">
                  <h3 className="font-display text-lg font-semibold text-[var(--fyxvo-text)]">How can I help?</h3>
                  <p className="mt-2 text-sm text-[var(--fyxvo-text-muted)]">
                    Ask about Solana development, Fyxvo integration, project state, or request debugging.
                  </p>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {SUGGESTED_QUESTIONS.map((question) => (
                    <button
                      key={question}
                      onClick={() => void sendMessage(question)}
                      disabled={!isAuthenticated || isAssistantUnavailable}
                      className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 py-3 text-left text-sm text-[var(--fyxvo-text-muted)] transition-colors hover:border-brand-500/30 hover:bg-brand-500/5 hover:text-[var(--fyxvo-text)] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mx-auto max-w-3xl space-y-6">
                {messages.map((message, index) => {
                  const docsSection = message.role === "assistant" ? detectDocsSection(message.content) : null;
                  const playgroundInsert = message.role === "assistant" ? detectPlaygroundInsert(message.content) : null;

                  return (
                    <div key={`${message.role}-${index}-${message.content.slice(0, 16)}`} className={message.role === "user" ? "flex justify-end" : "flex justify-start"}>
                      <div className="flex max-w-[92%] flex-col gap-2">
                        <div
                          className={
                            message.role === "user"
                              ? "rounded-2xl rounded-tr-md bg-brand-500 px-4 py-3 text-sm text-white"
                              : "rounded-2xl rounded-tl-md border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 py-3"
                          }
                        >
                          {message.role === "assistant" ? (
                            <MessageContent content={message.content} />
                          ) : (
                            <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
                          )}
                          {isStreaming && index === messages.length - 1 && message.role === "assistant" && message.content === "" ? (
                            <span className="inline-flex gap-1">
                              {[0, 1, 2].map((dot) => (
                                <span
                                  key={dot}
                                  className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--fyxvo-text-muted)]"
                                  style={{ animationDelay: `${dot * 0.15}s` }}
                                />
                              ))}
                            </span>
                          ) : null}
                        </div>

                        {message.content && message.role === "assistant" ? (
                          <div className="flex flex-wrap items-center gap-2 px-1">
                            <button
                              onClick={() => copyMessage(message.content, index)}
                              className="text-xs text-[var(--fyxvo-text-muted)] transition-colors hover:text-[var(--fyxvo-text)]"
                            >
                              {copiedIdx === index ? "Copied!" : "Copy"}
                            </button>
                            <button
                              onClick={() => copyMarkdown(message.content, index)}
                              className="text-xs text-[var(--fyxvo-text-muted)] transition-colors hover:text-[var(--fyxvo-text)]"
                            >
                              Copy as markdown
                            </button>
                            {playgroundInsert ? (
                              <button
                                onClick={() => insertIntoPlayground(message.content)}
                                className="text-xs text-[var(--fyxvo-brand)] transition-colors hover:text-brand-600"
                              >
                                Insert into playground
                              </button>
                            ) : null}
                            {docsSection ? (
                              <Link href={docsSection.href} className="text-xs text-[var(--fyxvo-brand)] transition-colors hover:text-brand-600">
                                {docsSection.label}
                              </Link>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>
            )}
          </div>

          <div className="shrink-0 border-t border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)]/95 px-4 py-4 backdrop-blur sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl">
              {rateLimitStatus && isAuthenticated ? (
                <div className="mb-2 flex items-center justify-between gap-3 text-xs text-[var(--fyxvo-text-muted)]">
                  <span>
                    {rateLimitStatus.messagesUsedThisHour}/{rateLimitStatus.limit} used this hour
                  </span>
                  <span>Resets {relativeTime(rateLimitStatus.resetAt)}</span>
                </div>
              ) : null}

              {activeDocsSection ? (
                <div className="mb-3 rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-3 py-2 text-xs text-[var(--fyxvo-text-muted)]">
                  Related docs ready:{" "}
                  <Link href={activeDocsSection.href} className="text-[var(--fyxvo-brand)] hover:text-brand-600">
                    {activeDocsSection.label}
                  </Link>
                </div>
              ) : null}

              <div className="flex items-end gap-3 rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-3 focus-within:border-brand-500/50">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    isAssistantUnavailable
                      ? "The AI assistant is currently unavailable"
                      : isAuthenticated
                        ? "Ask about Fyxvo, Solana RPC, pricing, or debugging…"
                        : "Connect wallet to chat"
                  }
                  disabled={!isAuthenticated || isStreaming || isAssistantUnavailable}
                  rows={1}
                  className="flex-1 resize-none bg-transparent text-sm text-[var(--fyxvo-text)] outline-none placeholder:text-[var(--fyxvo-text-muted)] disabled:opacity-50"
                  style={{ maxHeight: "200px" }}
                  onInput={(e) => {
                    const target = e.currentTarget;
                    target.style.height = "auto";
                    target.style.height = `${Math.min(target.scrollHeight, 200)}px`;
                  }}
                />
                <Button
                  size="sm"
                  onClick={() => void sendMessage(input)}
                  disabled={!input.trim() || !isAuthenticated || isStreaming || isAssistantUnavailable}
                >
                  {isStreaming ? "Streaming…" : "Send"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
