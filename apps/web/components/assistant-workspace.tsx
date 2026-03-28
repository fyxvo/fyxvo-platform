"use client";

import { Button } from "@fyxvo/ui";
import { useEffect, useRef, useState } from "react";
import {
  clearAssistantConversation,
  getLatestAssistantConversation,
  listAssistantConversations,
} from "../lib/api";
import { API_BASE } from "../lib/env";
import { usePortal } from "../lib/portal-context";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

function parseMarkdownBlocks(content: string): Array<{ type: "text" | "code"; value: string; lang?: string }> {
  const blocks: Array<{ type: "text" | "code"; value: string; lang?: string }> = [];
  const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      const text = content.slice(lastIndex, match.index);
      if (text.trim()) blocks.push({ type: "text", value: text });
    }
    blocks.push({ type: "code", value: match[2] ?? "", lang: match[1] ?? "" });
    lastIndex = match.index + match[0].length;
  }

  const remaining = content.slice(lastIndex);
  if (remaining.trim()) blocks.push({ type: "text", value: remaining });

  if (blocks.length === 0 && content.trim()) {
    blocks.push({ type: "text", value: content });
  }

  return blocks;
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  const blocks = parseMarkdownBlocks(message.content);

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
          isUser
            ? "bg-[var(--fyxvo-brand)] text-white"
            : "bg-[var(--fyxvo-panel)] border border-[var(--fyxvo-border)] text-[var(--fyxvo-text)]"
        }`}
      >
        {blocks.map((block, i) => {
          if (block.type === "code") {
            return (
              <div key={i} className="my-2 relative group">
                <div className="flex items-center justify-between rounded-t-lg bg-[var(--fyxvo-panel-soft)] px-3 py-1.5 border border-[var(--fyxvo-border)]">
                  <span className="text-xs text-[var(--fyxvo-text-muted)] font-mono">
                    {block.lang ?? ""}
                  </span>
                  <button
                    type="button"
                    aria-label="Copy"
                    onClick={() => void navigator.clipboard.writeText(block.value)}
                    className="text-xs text-[var(--fyxvo-text-muted)] hover:text-[var(--fyxvo-text)] px-2 py-0.5 rounded"
                  >
                    Copy
                  </button>
                </div>
                <pre className="overflow-x-auto rounded-b-lg bg-[var(--fyxvo-bg)] p-3 text-xs text-[var(--fyxvo-text)] border border-t-0 border-[var(--fyxvo-border)]">
                  <code>{block.value}</code>
                </pre>
              </div>
            );
          }
          return (
            <span key={i} className="whitespace-pre-wrap">
              {block.value}
            </span>
          );
        })}
        {message.role === "assistant" && (
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              aria-label="Copy"
              onClick={() => void navigator.clipboard.writeText(message.content)}
              className="text-xs text-[var(--fyxvo-text-muted)] hover:text-[var(--fyxvo-text)] px-2 py-0.5 rounded transition-colors"
            >
              Copy
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function AssistantWorkspace() {
  const { token, walletPhase, selectedProject, projects } = usePortal();
  const isAuthenticated = walletPhase === "authenticated" && !!token;

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load latest conversation when authenticated
  useEffect(() => {
    if (!isAuthenticated || !token) return;

    void (async () => {
      try {
        await listAssistantConversations(token);
        const { item } = await getLatestAssistantConversation(token);
        if (item?.messages) {
          setMessages(item.messages.map((m) => ({ id: m.id, role: m.role, content: m.content })));
          setConversationId(item.id);
        }
      } catch {
        // ignore
      }
    })();
  }, [isAuthenticated, token]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || streaming) return;
    if (!token) {
      setSendError("Authenticate with a wallet before sending assistant messages.");
      return;
    }

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: input.trim(),
    };
    const outgoingMessages = [
      ...messages.filter((message) => message.content.trim().length > 0),
      userMessage,
    ].map((message) => ({
      role: message.role,
      content: message.content,
    }));

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setStreaming(true);
    setSendError(null);

    const assistantMessageId = `assistant-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: assistantMessageId, role: "assistant", content: "" },
    ]);

    try {
      const res = await fetch(`${API_BASE}/v1/assistant/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          conversationId: conversationId ?? undefined,
          messages: outgoingMessages,
          projectContext: selectedProject
            ? {
                projectId: selectedProject.id,
                projectName: selectedProject.name,
                projectNames: projects.map((project) => project.name),
              }
            : undefined,
        }),
      });

      if (!res.ok) throw new Error(`Chat error: ${res.status}`);

      // Extract conversation ID from header
      const headerConvId = res.headers.get("x-fyxvo-conversation-id");
      if (headerConvId) setConversationId(headerConvId);

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";
      let streamCompleted = false;

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
              streamCompleted = true;
              setStreaming(false);
              reader.cancel();
              break;
            }
            try {
              const parsed = JSON.parse(data) as { text?: string };
              if (parsed.text) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMessageId
                      ? { ...m, content: m.content + parsed.text }
                      : m
                  )
                );
              }
            } catch {
              // ignore parse errors
            }
          }
        }
      }

      if (!streamCompleted) {
        setStreaming(false);
      }
    } catch {
      setSendError("Assistant request failed. Please try again.");
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMessageId
            ? { ...m, content: "An error occurred. Please try again." }
            : m
        )
      );
    } finally {
      setStreaming(false);
    }
  };

  const handleClear = async () => {
    if (!conversationId || !token) return;
    await clearAssistantConversation(conversationId, token);
    setMessages([]);
    setConversationId(null);
  };

  const hasMessages = messages.length > 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Messages area */}
      <div className="flex flex-col gap-3 min-h-[200px]">
        {!hasMessages ? (
          <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
            {!isAuthenticated ? (
              <p className="text-[var(--fyxvo-text-muted)] text-sm">
                Getting started
              </p>
            ) : (
              <p className="text-[var(--fyxvo-text-muted)] text-sm">
                Ask about onboarding, debugging, relay behavior, or live project state
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Composer */}
      {isAuthenticated ? (
        <div className="flex flex-col gap-2">
          {sendError ? (
            <p className="text-sm text-rose-400">{sendError}</p>
          ) : null}
          <div className="flex gap-2">
            <textarea
              aria-label="Message Fyxvo Assistant"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void handleSend();
                }
              }}
              rows={3}
              placeholder="Ask anything about your project, RPC, or relay setup…"
              className="flex-1 resize-none rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 py-3 text-sm text-[var(--fyxvo-text)] placeholder:text-[var(--fyxvo-text-muted)] outline-none focus:border-[var(--fyxvo-brand)] focus:ring-2 focus:ring-[var(--fyxvo-brand)]/30"
            />
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="flex gap-2">
              {hasMessages || conversationId ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void handleClear()}
                >
                  Clear
                </Button>
              ) : null}
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => void handleSend()}
              loading={streaming}
              disabled={!input.trim() || streaming}
            >
              Send
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
