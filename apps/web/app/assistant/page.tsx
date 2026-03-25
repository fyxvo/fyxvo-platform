"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { Button, Notice } from "@fyxvo/ui";
import { WalletConnectButton } from "../../components/wallet-connect-button";
import { PageHeader } from "../../components/page-header";
import { usePortal } from "../../components/portal-provider";
import { webEnv } from "../../lib/env";
import { fetchApiStatus, getAssistantRateLimitStatus } from "../../lib/api";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface AssistantErrorPayload {
  code?: string;
  error?: string;
  message?: string;
  retryAfterMs?: number;
}

const SUGGESTED_QUESTIONS = [
  "How do I connect to the Fyxvo gateway in TypeScript?",
  "What's the difference between standard and priority relay?",
  "How do I use getProgramAccounts efficiently?",
  "Show me how to send a transaction with Fyxvo",
  "What are the current pricing tiers?",
  "How do I debug an RPC error?",
  "How do I migrate from Helius to Fyxvo?",
  "What methods are compute-heavy and why?",
];

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
          className="text-xs text-[var(--fyxvo-text-muted)] hover:text-[var(--fyxvo-text)] transition-colors"
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
  const parts = content.split(/(```[\w]*\n[\s\S]*?```)/g);
  return (
    <div className="space-y-2">
      {parts.map((part, i) => {
        if (part.startsWith("```")) {
          const lines = part.split("\n");
          const lang = lines[0]?.slice(3) ?? "";
          const code = lines.slice(1, -1).join("\n");
          return <CodeBlock key={i} code={code} language={lang || "code"} />;
        }
        const inlineParts = part.split(/(`[^`]+`)/g);
        return (
          <p key={i} className="text-sm leading-relaxed text-[var(--fyxvo-text)] whitespace-pre-wrap">
            {inlineParts.map((ip, j) =>
              ip.startsWith("`") && ip.endsWith("`") ? (
                <code key={j} className="rounded bg-[var(--fyxvo-panel-soft)] px-1 py-0.5 font-mono text-xs text-[var(--fyxvo-brand)]">
                  {ip.slice(1, -1)}
                </code>
              ) : (
                ip
              )
            )}
          </p>
        );
      })}
    </div>
  );
}

const HISTORY_KEY = "fyxvo.assistant.history";

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

function getAssistantErrorMessage(
  status: number,
  payload: AssistantErrorPayload | null | undefined
): string {
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

export default function AssistantPage() {
  const portal = usePortal();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [rateLimitStatus, setRateLimitStatus] = useState<{ messagesUsedThisHour: number; limit: number } | null>(null);
  const [assistantAvailable, setAssistantAvailable] = useState<boolean | null>(null);
  const [assistantStatusMessage, setAssistantStatusMessage] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Persist/restore last 20 messages
  useEffect(() => {
    try {
      const stored = localStorage.getItem(HISTORY_KEY);
      if (stored) setMessages(JSON.parse(stored) as Message[]);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (messages.length === 0) return;
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(messages.slice(-20)));
    } catch { /* ignore */ }
  }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const clearConversation = useCallback(() => {
    setMessages([]);
    try { localStorage.removeItem(HISTORY_KEY); } catch { /* ignore */ }
  }, []);

  const replaceLastAssistantMessage = useCallback((content: string) => {
    setMessages((prev) => {
      const copy = [...prev];
      const last = copy[copy.length - 1];
      if (last && last.role === "assistant") {
        copy[copy.length - 1] = { ...last, content };
      }
      return copy;
    });
  }, []);

  const isAuthenticated = portal.walletPhase === "authenticated";
  const isAssistantUnavailable = assistantAvailable === false;

  // Check whether the AI service is configured before the user starts typing.
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
        setAssistantStatusMessage(
          "Fyxvo could not verify assistant availability right now. You can still try sending a message."
        );
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Load rate limit status when authenticated
  useEffect(() => {
    if (!portal.token || !isAuthenticated) return;
    getAssistantRateLimitStatus(portal.token)
      .then((s) => setRateLimitStatus({ messagesUsedThisHour: s.messagesUsedThisHour, limit: s.limit }))
      .catch(() => undefined);
  }, [portal.token, isAuthenticated, messages.length]);

  function copyMessage(content: string, idx: number) {
    void navigator.clipboard.writeText(content);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  }

  const availableSolCredits = portal.onchainSnapshot.balances?.availableSolCredits;
  const projectContext = portal.selectedProject
    ? {
        projectName: portal.selectedProject.name,
        balance: availableSolCredits
          ? `${(Number(BigInt(availableSolCredits)) / 1e9).toFixed(4)} SOL`
          : undefined,
        requestCount: portal.selectedProject._count?.requestLogs,
      }
    : undefined;

  async function sendMessage(content: string) {
    if (!content.trim() || isStreaming || isAssistantUnavailable) return;
    if (!portal.token) return;

    const userMessage: Message = { role: "user", content: content.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsStreaming(true);

    const assistantMessage: Message = { role: "assistant", content: "" };
    setMessages([...newMessages, assistantMessage]);

    try {
      const response = await fetch(new URL("/v1/assistant/chat", webEnv.apiBaseUrl), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${portal.token}`,
        },
        body: JSON.stringify({ messages: newMessages, projectContext }),
      });

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
        replaceLastAssistantMessage(
          getAssistantErrorMessage(response.status || 500, errorPayload)
        );
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
            // skip
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
          // skip
        }
      }

      if (streamError && accumulated.length === 0) {
        replaceLastAssistantMessage(streamError);
      }
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

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col space-y-0 -mt-8 -mx-4 sm:-mx-6 lg:-mx-8">
      {/* Header */}
      <div className="shrink-0 border-b border-[var(--fyxvo-border)] px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <PageHeader
              eyebrow="AI Assistant · Claude"
              title="Fyxvo Developer Assistant"
              description="Ask anything about Solana development or using Fyxvo. Powered by Claude."
            />
            <p className="mt-2 text-xs text-[var(--fyxvo-text-muted)]">
              AI responses may not always be accurate. Test all code before using in production.
            </p>
          </div>
          {messages.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearConversation} className="shrink-0 text-xs text-[var(--fyxvo-text-muted)] hover:text-[var(--fyxvo-text)]">
              Clear
            </Button>
          )}
        </div>
        {assistantStatusMessage && (
          <div className="mt-4">
            <Notice
              tone={isAssistantUnavailable ? "warning" : "neutral"}
              title={isAssistantUnavailable ? "AI assistant unavailable" : "Assistant status"}
            >
              <span>{assistantStatusMessage}</span>
            </Notice>
          </div>
        )}
        {!isAuthenticated && (
          <div className="mt-4">
            <Notice tone="neutral" title="Connect your wallet to use the AI assistant">
              <div className="flex items-center gap-3 flex-wrap">
                <span>You need an active wallet session to send messages.</span>
                <WalletConnectButton compact />
              </div>
            </Notice>
          </div>
        )}
      </div>

      {/* Message thread */}
      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
        {messages.length === 0 ? (
          <div className="mx-auto max-w-2xl space-y-6">
            <div className="rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-6 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-500/10">
                <svg className="h-6 w-6 text-[var(--fyxvo-brand)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="font-display text-lg font-semibold text-[var(--fyxvo-text)]">How can I help?</h3>
              <p className="mt-2 text-sm text-[var(--fyxvo-text-muted)]">
                Ask about Solana development, Fyxvo integration, or generating code for your project.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => void sendMessage(q)}
                  disabled={!isAuthenticated || isAssistantUnavailable}
                  className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 py-3 text-left text-sm text-[var(--fyxvo-text-muted)] transition-colors hover:border-brand-500/30 hover:bg-brand-500/5 hover:text-[var(--fyxvo-text)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {q}
                </button>
              ))}
            </div>
            {!isAuthenticated && (
              <p className="text-center text-sm text-[var(--fyxvo-text-muted)]">
                Connect your wallet to use the AI assistant.
              </p>
            )}
          </div>
        ) : (
          <div className="mx-auto max-w-3xl space-y-6">
            {messages.map((message, i) => (
              <div key={i} className={message.role === "user" ? "flex justify-end" : "flex justify-start group"}>
                <div className="flex flex-col gap-1 max-w-[90%]">
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
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                    )}
                    {isStreaming && i === messages.length - 1 && message.role === "assistant" && message.content === "" && (
                      <span className="inline-flex gap-1">
                        {[0, 1, 2].map((d) => (
                          <span
                            key={d}
                            className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--fyxvo-text-muted)] animate-bounce"
                            style={{ animationDelay: `${d * 0.15}s` }}
                          />
                        ))}
                      </span>
                    )}
                  </div>
                  {message.content && !isStreaming && (
                    <button
                      onClick={() => copyMessage(message.content, i)}
                      className="self-start text-xs text-[var(--fyxvo-text-muted)] opacity-0 group-hover:opacity-100 transition-opacity hover:text-[var(--fyxvo-text)] px-1"
                    >
                      {copiedIdx === i ? "Copied!" : "Copy"}
                    </button>
                  )}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="shrink-0 border-t border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)]/95 backdrop-blur px-4 py-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          {rateLimitStatus && isAuthenticated && (
            <div className="mb-2 flex items-center justify-end gap-2">
              <div className="flex items-center gap-1.5">
                <div className="h-1.5 w-24 rounded-full bg-[var(--fyxvo-border)]">
                  <div
                    className={`h-full rounded-full transition-all ${
                      rateLimitStatus.messagesUsedThisHour >= rateLimitStatus.limit * 0.8 ? "bg-amber-500" : "bg-brand-500"
                    }`}
                    style={{ width: `${Math.min(100, (rateLimitStatus.messagesUsedThisHour / rateLimitStatus.limit) * 100)}%` }}
                  />
                </div>
                <span className="text-xs text-[var(--fyxvo-text-muted)]">
                  {rateLimitStatus.messagesUsedThisHour}/{rateLimitStatus.limit} this hour
                </span>
              </div>
            </div>
          )}
          <div className="flex items-end gap-3 rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-3 focus-within:border-brand-500/50">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isAssistantUnavailable
                  ? "The AI assistant is currently unavailable"
                  : isAuthenticated
                    ? "Ask anything about Solana or Fyxvo… (Enter to send, Shift+Enter for newline)"
                    : "Connect wallet to chat"
              }
              disabled={!isAuthenticated || isStreaming || isAssistantUnavailable}
              rows={1}
              className="flex-1 resize-none bg-transparent text-sm text-[var(--fyxvo-text)] placeholder-[var(--fyxvo-text-muted)] outline-none disabled:opacity-50"
              style={{ maxHeight: "200px" }}
              onInput={(e) => {
                const t = e.currentTarget;
                t.style.height = "auto";
                t.style.height = `${Math.min(t.scrollHeight, 200)}px`;
              }}
            />
            <Button
              size="sm"
              onClick={() => void sendMessage(input)}
              disabled={!input.trim() || !isAuthenticated || isStreaming || isAssistantUnavailable}
              className="shrink-0"
            >
              {isStreaming ? (
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
                </svg>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
