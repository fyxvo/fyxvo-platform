"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePortal } from "./portal-provider";
import { WalletConnectButton } from "./wallet-connect-button";
import { webEnv } from "../lib/env";

interface ConversationSummary {
  id: string;
  title?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

interface RateLimitStatus {
  remaining?: number;
  limit?: number;
  resetAt?: string;
}

function UserIcon() {
  return (
    <div className="w-7 h-7 rounded-full bg-[#f97316]/20 border border-[#f97316]/30 flex items-center justify-center shrink-0">
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-[#f97316]">
        <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
      </svg>
    </div>
  );
}

function AssistantIcon() {
  return (
    <div className="w-7 h-7 rounded-full bg-white/[0.06] border border-white/[0.08] flex items-center justify-center shrink-0">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4 text-[#f1f5f9]">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
      </svg>
    </div>
  );
}

export function AssistantWorkspace() {
  const portal = usePortal();
  const token = portal.token;

  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [rateLimit, setRateLimit] = useState<RateLimitStatus | null>(null);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load conversations and rate limit on mount / token change
  useEffect(() => {
    if (!token) return;

    async function loadInitialData() {
      try {
        const [convsRes, rlRes] = await Promise.allSettled([
          fetch(`${webEnv.apiBaseUrl}/v1/assistant/conversations`, {
            headers: { Authorization: `Bearer ${token}` },
          }).then((r) => r.json()),
          fetch(`${webEnv.apiBaseUrl}/v1/assistant/rate-limit-status`, {
            headers: { Authorization: `Bearer ${token}` },
          }).then((r) => r.json()),
        ]);

        if (convsRes.status === "fulfilled") {
          const raw = convsRes.value as { items?: ConversationSummary[] } | ConversationSummary[];
          setConversations(Array.isArray(raw) ? raw : (raw.items ?? []));
        }
        if (rlRes.status === "fulfilled") {
          setRateLimit(rlRes.value as RateLimitStatus);
        }
      } catch {
        // Ignore
      }
    }

    void loadInitialData();
  }, [token]);

  const loadConversation = useCallback(
    async (id: string) => {
      if (!token) return;
      try {
        const res = await fetch(`${webEnv.apiBaseUrl}/v1/assistant/conversations/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = (await res.json()) as {
          messages?: Array<{ role: string; content: string }>;
        };
        const msgs: ChatMessage[] = (data.messages ?? []).map((m) => ({
          role: m.role === "user" ? "user" : "assistant",
          content: m.content,
        }));
        setMessages(msgs);
        setActiveConversationId(id);
        setSidebarOpen(false);
      } catch {
        // Ignore
      }
    },
    [token]
  );

  const sendMessage = useCallback(async () => {
    if (!token || !input.trim() || streaming) return;

    const userMessage: ChatMessage = { role: "user", content: input.trim() };
    setInput("");
    setMessages((prev) => [...prev, userMessage]);
    setStreaming(true);

    const assistantMessage: ChatMessage = { role: "assistant", content: "", streaming: true };
    setMessages((prev) => [...prev, assistantMessage]);

    try {
      const allMessages = [...messages, userMessage].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await fetch(`${webEnv.apiBaseUrl}/v1/assistant/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          conversationId: activeConversationId,
          messages: allMessages,
        }),
      });

      // Capture conversation ID from header
      const newConvId = response.headers.get("x-fyxvo-conversation-id");
      if (newConvId && !activeConversationId) {
        setActiveConversationId(newConvId);
      }

      if (!response.body) {
        throw new Error("No response body.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") {
              break;
            }
            try {
              const parsed = JSON.parse(data) as { text?: string };
              if (parsed.text) {
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last && last.role === "assistant") {
                    updated[updated.length - 1] = {
                      ...last,
                      content: last.content + parsed.text,
                    };
                  }
                  return updated;
                });
              }
            } catch {
              // Skip malformed JSON
            }
          }
        }
      }
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last && last.role === "assistant") {
          updated[updated.length - 1] = {
            ...last,
            content: last.content || "Sorry, something went wrong. Please try again.",
            streaming: false,
          };
        }
        return updated;
      });
    } finally {
      setMessages((prev) =>
        prev.map((m, i) =>
          i === prev.length - 1 && m.role === "assistant" ? { ...m, streaming: false } : m
        )
      );
      setStreaming(false);

      // Refresh rate limit after send
      if (token) {
        fetch(`${webEnv.apiBaseUrl}/v1/assistant/rate-limit-status`, {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then((r) => r.json())
          .then((data) => setRateLimit(data as RateLimitStatus))
          .catch(() => null);
      }
    }
  }, [token, input, streaming, messages, activeConversationId]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  }

  function startNewConversation() {
    setMessages([]);
    setActiveConversationId(null);
    setSidebarOpen(false);
  }

  if (portal.walletPhase !== "authenticated") {
    return (
      <div
        style={{ backgroundColor: "#0a0a0f" }}
        className="min-h-screen flex items-center justify-center px-5"
      >
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-[#f97316]/10 border border-[#f97316]/20 flex items-center justify-center mx-auto mb-6">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-8 h-8 text-[#f97316]">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
          </div>
          <h1 className="font-display text-2xl font-semibold text-[#f1f5f9] mb-3">
            Connect your wallet to use the assistant
          </h1>
          <p className="text-sm leading-7 text-[#64748b] mb-8">
            The Fyxvo assistant is project-aware and requires authentication. Connect your Solana
            wallet to get help with onboarding, debugging, funding, and relay operations.
          </p>
          <WalletConnectButton />
        </div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: "#0a0a0f" }} className="flex h-[calc(100vh-4rem)] overflow-hidden">

      {/* Sidebar overlay on mobile */}
      {sidebarOpen ? (
        <div
          className="fixed inset-0 z-30 bg-black/60 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } fixed left-0 top-16 bottom-0 z-40 w-64 border-r border-white/[0.08] bg-[#0a0a0f] flex flex-col transition-transform md:relative md:top-0 md:translate-x-0 md:flex`}
      >
        {/* Sidebar header */}
        <div className="flex items-center justify-between p-4 border-b border-white/[0.08]">
          <h2 className="text-sm font-semibold text-[#f1f5f9]">Conversations</h2>
          <button
            type="button"
            onClick={startNewConversation}
            className="text-xs text-[#f97316] hover:text-[#f97316]/80 transition-colors font-medium"
          >
            + New
          </button>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto py-2">
          {conversations.length === 0 ? (
            <p className="px-4 py-3 text-xs text-[#64748b]">No conversations yet.</p>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv.id}
                type="button"
                onClick={() => void loadConversation(conv.id)}
                className={`w-full text-left px-4 py-3 text-sm transition-colors hover:bg-white/[0.04] ${
                  activeConversationId === conv.id
                    ? "bg-[#f97316]/10 text-[#f97316]"
                    : "text-[#64748b]"
                }`}
              >
                <p className="truncate font-medium">
                  {conv.title ?? `Conversation ${conv.id.slice(0, 8)}`}
                </p>
                {conv.updatedAt ? (
                  <p className="text-xs mt-0.5 opacity-60">
                    {new Date(conv.updatedAt).toLocaleDateString()}
                  </p>
                ) : null}
              </button>
            ))
          )}
        </div>
      </aside>

      {/* Main chat area */}
      <div className="flex flex-col flex-1 min-w-0">

        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08] bg-[#0a0a0f]/80 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="md:hidden text-[#64748b] hover:text-[#f1f5f9] transition-colors"
              aria-label="Open conversation sidebar"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-sm font-semibold text-[#f1f5f9]">Fyxvo Assistant</h1>
          </div>

          {rateLimit !== null && typeof rateLimit.remaining === "number" ? (
            <span className="text-xs text-[#64748b]">
              <span className={rateLimit.remaining < 5 ? "text-amber-400 font-semibold" : "text-[#f1f5f9]"}>
                {rateLimit.remaining}
              </span>
              {typeof rateLimit.limit === "number" ? ` / ${rateLimit.limit}` : ""} messages remaining
            </span>
          ) : null}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center pb-20">
              <div className="w-14 h-14 rounded-2xl bg-[#f97316]/10 border border-[#f97316]/20 flex items-center justify-center mb-5">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-7 h-7 text-[#f97316]">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
              </div>
              <h2 className="font-display text-xl font-semibold text-[#f1f5f9] mb-2">
                How can I help?
              </h2>
              <p className="text-sm text-[#64748b] max-w-sm">
                Ask about onboarding, funding, relay operations, debugging, or anything related to
                your Fyxvo projects.
              </p>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-3 max-w-3xl ${msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"}`}
              >
                {msg.role === "user" ? <UserIcon /> : <AssistantIcon />}
                <div
                  className={`rounded-2xl px-4 py-3 text-sm leading-7 font-sans max-w-[80%] ${
                    msg.role === "user"
                      ? "bg-[#f97316]/15 border border-[#f97316]/20 text-[#f1f5f9]"
                      : "bg-white/[0.04] border border-white/[0.08] text-[#f1f5f9]"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  {msg.streaming ? (
                    <span className="inline-block w-2 h-4 bg-[#f97316] animate-pulse rounded-sm ml-1 align-text-bottom" />
                  ) : null}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="border-t border-white/[0.08] bg-[#0a0a0f] px-4 py-4">
          <div className="mx-auto max-w-3xl">
            <div className="flex items-end gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 focus-within:border-[#f97316]/40 focus-within:ring-1 focus-within:ring-[#f97316]/20 transition-all">
              <textarea
                ref={textareaRef}
                rows={1}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  // Auto-resize
                  e.target.style.height = "auto";
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
                }}
                onKeyDown={handleKeyDown}
                placeholder="Ask about your project, funding, relay, or anything else…"
                disabled={streaming}
                className="flex-1 resize-none bg-transparent text-sm text-[#f1f5f9] placeholder:text-[#64748b] focus:outline-none disabled:opacity-60 max-h-40"
              />
              <button
                type="button"
                onClick={() => void sendMessage()}
                disabled={!input.trim() || streaming}
                aria-label="Send message"
                className="flex-shrink-0 w-8 h-8 rounded-xl bg-[#f97316] flex items-center justify-center text-white transition hover:bg-[#f97316]/90 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {streaming ? (
                  <span className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                  </svg>
                )}
              </button>
            </div>
            <p className="mt-2 text-center text-xs text-[#64748b]">
              Enter to send &middot; Shift+Enter for new line
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
