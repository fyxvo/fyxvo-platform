"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button, Input, Notice } from "@fyxvo/ui";
import { usePortal } from "../../components/portal-provider";
import { webEnv } from "../../lib/env";
import type {
  AssistantConversationMessage,
  AssistantRateLimitStatus,
} from "../../lib/types";

// ---------------------------------------------------------------------------
// Suggested starter prompts
// ---------------------------------------------------------------------------

const STARTER_PROMPTS = [
  "How do I create and fund a project?",
  "What is the difference between standard and priority relay?",
  "How do I interpret a getBalance response?",
  "What does a 429 error mean and how do I handle it?",
];

// ---------------------------------------------------------------------------
// Message bubble component
// ---------------------------------------------------------------------------

function MessageBubble({ message }: { readonly message: AssistantConversationMessage }) {
  const isUser = message.role === "user";
  const timestamp = new Date(message.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      {/* Avatar */}
      <div
        className={`mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
          isUser
            ? "bg-[var(--fyxvo-brand)] text-white"
            : "border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] text-[var(--fyxvo-text-muted)]"
        }`}
      >
        {isUser ? "Y" : "F"}
      </div>

      {/* Bubble */}
      <div className={`max-w-[80%] space-y-1 ${isUser ? "items-end" : "items-start"} flex flex-col`}>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-[var(--fyxvo-text-muted)]">
            {isUser ? "You" : "Fyxvo Assistant"}
          </span>
          <span className="font-mono text-xs text-[var(--fyxvo-text-soft)]">{timestamp}</span>
          {message.responseTimeMs && !isUser && (
            <span className="font-mono text-xs text-[var(--fyxvo-text-soft)]">
              {message.responseTimeMs}ms
            </span>
          )}
        </div>

        <div
          className={`rounded-xl px-4 py-3 text-sm leading-6 ${
            isUser
              ? "bg-[var(--fyxvo-brand)] text-white"
              : "border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] text-[var(--fyxvo-text)]"
          }`}
          style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
        >
          {message.content}
        </div>

        {/* Suggested actions */}
        {message.suggestedActions && message.suggestedActions.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {message.suggestedActions.map((action) => (
              <a
                key={action.id}
                href={action.href}
                className="inline-flex items-center rounded-full border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-3 py-1 text-xs text-[var(--fyxvo-text-muted)] hover:text-[var(--fyxvo-text)] transition-colors"
              >
                {action.label}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function AssistantPage() {
  const portal = usePortal();

  const [messages, setMessages] = useState<AssistantConversationMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [rateLimit, setRateLimit] = useState<AssistantRateLimitStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Fetch rate limit on mount
  useEffect(() => {
    async function fetchRateLimit() {
      if (!portal.token) return;
      try {
        const res = await fetch(new URL("/v1/assistant/rate-limit", webEnv.apiBaseUrl), {
          headers: { authorization: `Bearer ${portal.token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setRateLimit(data as AssistantRateLimitStatus);
        }
      } catch {
        // non-critical
      }
    }
    void fetchRateLimit();
  }, [portal.token]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || sending) return;
    const userMessage = input.trim();
    setInput("");
    setSending(true);
    setError(null);

    const tempUserMsg: AssistantConversationMessage = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: userMessage,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      let convId = conversationId;

      if (!convId) {
        const createRes = await fetch(
          new URL("/v1/assistant/conversations", webEnv.apiBaseUrl),
          {
            method: "POST",
            headers: {
              "content-type": "application/json",
              ...(portal.token ? { authorization: `Bearer ${portal.token}` } : {}),
            },
            body: JSON.stringify({ title: userMessage.slice(0, 60) }),
          },
        );
        if (createRes.ok) {
          const conv = await createRes.json();
          convId = conv.id as string;
          setConversationId(convId);
        }
      }

      const endpoint = convId
        ? new URL(
            `/v1/assistant/conversations/${convId}/messages`,
            webEnv.apiBaseUrl,
          )
        : new URL("/v1/assistant/chat", webEnv.apiBaseUrl);

      const msgRes = await fetch(endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(portal.token ? { authorization: `Bearer ${portal.token}` } : {}),
        },
        body: JSON.stringify({ content: userMessage }),
      });

      if (!msgRes.ok) {
        const errData = await msgRes.json().catch(() => ({})) as Record<string, unknown>;
        throw new Error(
          typeof errData.error === "string"
            ? errData.error
            : `Request failed: ${msgRes.status}`,
        );
      }

      const data = await msgRes.json() as Record<string, unknown>;

      if (data.message || data.content) {
        const msgData = data.message as Record<string, unknown> | undefined;
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        const assistantMsg = {
          id: typeof data.id === "string" ? data.id : `assist-${Date.now()}`,
          role: "assistant" as const,
          content:
            (msgData?.content as string) ??
            (data.content as string) ??
            "",
          createdAt:
            (msgData?.createdAt as string) ??
            (data.createdAt as string) ??
            new Date().toISOString(),
          responseTimeMs:
            (msgData?.responseTimeMs as number | null) ?? null,
        } as AssistantConversationMessage;

        setMessages((prev) => [
          ...prev.filter((m) => m.id !== tempUserMsg.id),
          tempUserMsg,
          assistantMsg,
        ]);

        // Refresh rate limit after each message
        if (portal.token) {
          fetch(new URL("/v1/assistant/rate-limit", webEnv.apiBaseUrl), {
            headers: { authorization: `Bearer ${portal.token}` },
          })
            .then((r) => r.json())
            .then((d) => setRateLimit(d as AssistantRateLimitStatus))
            .catch(() => undefined);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id));
    } finally {
      setSending(false);
    }
  }, [input, sending, conversationId, portal.token]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  }

  const isAuthenticated = portal.walletPhase === "authenticated";
  const hasMessages = messages.length > 0;

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)] px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <div>
            <h1 className="font-display text-xl font-semibold tracking-tight text-[var(--fyxvo-text)]">
              Assistant
            </h1>
            <p className="text-xs leading-5 text-[var(--fyxvo-text-muted)]">
              Ask questions about the Fyxvo API, pricing, or Solana devnet infrastructure.
            </p>
          </div>
          {rateLimit && (
            <div className="text-right">
              <p className="font-mono text-xs text-[var(--fyxvo-text-soft)]">
                {rateLimit.messagesRemainingThisHour} / {rateLimit.limit} remaining
              </p>
              <p className="text-xs text-[var(--fyxvo-text-muted)]">this hour</p>
            </div>
          )}
        </div>
      </div>

      {/* Auth notice */}
      {!isAuthenticated && (
        <div className="flex-shrink-0 border-b border-[var(--fyxvo-border)] px-6 py-3">
          <div className="mx-auto max-w-3xl">
            <Notice tone="neutral">
              Connect a wallet to enable conversation history and higher rate limits. The assistant
              is still available without authentication.
            </Notice>
          </div>
        </div>
      )}

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-6 py-6">
          {!hasMessages ? (
            /* Empty / welcome state */
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)]">
                <span className="font-display text-lg font-bold text-[var(--fyxvo-brand)]">F</span>
              </div>
              <h2 className="font-display text-2xl font-semibold tracking-tight text-[var(--fyxvo-text)]">
                Fyxvo Assistant
              </h2>
              <p className="mt-3 max-w-sm text-sm leading-6 text-[var(--fyxvo-text-muted)]">
                Ask anything about the Fyxvo platform. The assistant understands API endpoints,
                pricing tiers, wallet authentication, RPC methods, and common developer questions.
              </p>

              {/* Starter prompts */}
              <div className="mt-8 flex flex-wrap justify-center gap-2">
                {STARTER_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => {
                      setInput(prompt);
                      textareaRef.current?.focus();
                    }}
                    className="rounded-full border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 py-2 text-sm text-[var(--fyxvo-text-muted)] hover:border-[var(--fyxvo-brand)]/40 hover:text-[var(--fyxvo-text)] transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Message list */
            <div className="space-y-6">
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}

              {sending && (
                <div className="flex gap-3">
                  <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] text-xs font-semibold text-[var(--fyxvo-text-muted)]">
                    F
                  </div>
                  <div className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 py-3">
                    <div className="flex gap-1">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--fyxvo-text-muted)] [animation-delay:0ms]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--fyxvo-text-muted)] [animation-delay:150ms]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--fyxvo-text-muted)] [animation-delay:300ms]" />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="flex-shrink-0 border-t border-[var(--fyxvo-border)] bg-rose-500/5 px-6 py-3">
          <div className="mx-auto max-w-3xl">
            <p className="text-sm text-rose-400">{error}</p>
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="flex-shrink-0 border-t border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)] px-6 py-4">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-end gap-3">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question... (Enter to send, Shift+Enter for a new line)"
              rows={1}
              className="flex-1 resize-none rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 py-3 text-sm text-[var(--fyxvo-text)] placeholder-[var(--fyxvo-text-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--fyxvo-brand)]/40 leading-6"
              style={{ minHeight: "2.75rem", maxHeight: "10rem", overflowY: "auto" }}
              disabled={sending}
            />
            <button
              onClick={() => void sendMessage()}
              disabled={sending || !input.trim()}
              className="flex-shrink-0 rounded-xl bg-[var(--fyxvo-brand)] px-4 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40 transition-opacity"
            >
              Send
            </button>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <p className="text-xs text-[var(--fyxvo-text-soft)]">
              {rateLimit
                ? `${rateLimit.messagesRemainingThisHour} messages remaining this hour`
                : "Responses are generated by the Fyxvo backend."}
            </p>
            <p className="font-mono text-xs text-[var(--fyxvo-text-soft)]">
              {input.length} chars
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
