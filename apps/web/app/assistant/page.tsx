"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Notice } from "@fyxvo/ui";

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
// Minimal markdown renderer (code blocks, inline code, bold, bullets)
// ---------------------------------------------------------------------------

function renderMarkdown(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const lines = text.split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i] ?? "";

    // Fenced code block
    if (line.startsWith("```")) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !(lines[i] ?? "").startsWith("```")) {
        codeLines.push(lines[i] ?? "");
        i++;
      }
      nodes.push(
        <pre
          key={`code-${i}`}
          className="my-2 overflow-x-auto rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)] px-4 py-3 font-mono text-xs leading-6 text-[var(--fyxvo-text)]"
        >
          {codeLines.join("\n")}
        </pre>,
      );
      i++;
      continue;
    }

    // Empty line
    if (line.trim() === "") {
      nodes.push(<br key={`br-${i}`} />);
      i++;
      continue;
    }

    // Heading
    const headingMatch = /^(#{1,3})\s+(.+)$/.exec(line);
    if (headingMatch) {
      nodes.push(
        <p key={`h-${i}`} className="font-semibold text-[var(--fyxvo-text)]">
          {headingMatch[2] ?? ""}
        </p>,
      );
      i++;
      continue;
    }

    // Bullet
    const bulletMatch = /^[-*]\s+(.+)$/.exec(line);
    if (bulletMatch) {
      nodes.push(
        <div key={`li-${i}`} className="flex gap-2">
          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--fyxvo-text-muted)]" />
          <span>{renderInline(bulletMatch[1] ?? "")}</span>
        </div>,
      );
      i++;
      continue;
    }

    // Regular paragraph line
    nodes.push(<span key={`p-${i}`}>{renderInline(line)}</span>);
    nodes.push("\n");
    i++;
  }

  return nodes;
}

function renderInline(text: string): React.ReactNode[] {
  const result: React.ReactNode[] = [];
  // Matches: `code`, **bold**, *italic*
  const regex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) {
      result.push(text.slice(last, match.index));
    }
    const chunk = match[0];
    if (chunk.startsWith("`")) {
      result.push(
        <code
          key={match.index}
          className="rounded bg-[var(--fyxvo-panel-soft)] px-1 py-0.5 font-mono text-xs text-[var(--fyxvo-text)]"
        >
          {chunk.slice(1, -1)}
        </code>,
      );
    } else if (chunk.startsWith("**")) {
      result.push(
        <strong key={match.index} className="font-semibold text-[var(--fyxvo-text)]">
          {chunk.slice(2, -2)}
        </strong>,
      );
    } else {
      result.push(
        <em key={match.index} className="italic">
          {chunk.slice(1, -1)}
        </em>,
      );
    }
    last = match.index + chunk.length;
  }

  if (last < text.length) {
    result.push(text.slice(last));
  }

  return result;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Message bubble
// ---------------------------------------------------------------------------

function MessageBubble({
  message,
  streaming,
}: {
  readonly message: ChatMessage;
  readonly streaming?: boolean;
}) {
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
          {streaming && (
            <span className="font-mono text-xs text-[var(--fyxvo-text-soft)] animate-pulse">
              typing…
            </span>
          )}
        </div>

        <div
          className={`rounded-xl px-4 py-3 text-sm leading-6 ${
            isUser
              ? "bg-[var(--fyxvo-brand)] text-white"
              : "border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] text-[var(--fyxvo-text)]"
          }`}
        >
          {isUser ? (
            <span style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{message.content}</span>
          ) : (
            <div style={{ wordBreak: "break-word" }}>{renderMarkdown(message.content)}</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function AssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [streamingContent, setStreamingContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom on new messages or streaming updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || sending) return;
    const userMessage = input.trim();
    setInput("");
    setSending(true);
    setError(null);

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: userMessage,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: userMessage, history }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(errData.error ?? `Request failed: ${res.status}`);
      }

      if (!res.body) throw new Error("No response body.");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accText = "";
      let buffer = "";

      setStreamingContent("");

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const data = line.slice(5).trim();
          if (data === "[DONE]") continue;
          try {
            const parsed = JSON.parse(data) as {
              type?: string;
              delta?: { type?: string; text?: string };
            };
            if (parsed.type === "content_block_delta" && parsed.delta?.type === "text_delta") {
              accText += parsed.delta.text ?? "";
              setStreamingContent(accText);
            }
          } catch {
            // ignore malformed SSE lines
          }
        }
      }

      const assistantMsg: ChatMessage = {
        id: `assist-${Date.now()}`,
        role: "assistant",
        content: accText || "(no response)",
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
      setStreamingContent(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message.");
      setMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
      setStreamingContent(null);
    } finally {
      setSending(false);
    }
  }, [input, sending, messages]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  }

  const hasMessages = messages.length > 0;

  // Synthetic streaming message for display
  const streamingMsg: ChatMessage | null =
    streamingContent !== null
      ? {
          id: "streaming",
          role: "assistant",
          content: streamingContent,
          createdAt: new Date().toISOString(),
        }
      : null;

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)] px-6 py-4">
        <div className="mx-auto max-w-3xl">
          <h1 className="font-display text-xl font-semibold tracking-tight text-[var(--fyxvo-text)]">
            Assistant
          </h1>
          <p className="text-xs leading-5 text-[var(--fyxvo-text-muted)]">
            Ask questions about the Fyxvo API, pricing, or Solana devnet infrastructure.
          </p>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-6 py-6">
          {!hasMessages && streamingContent === null ? (
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

              {streamingMsg && (
                <MessageBubble message={streamingMsg} streaming />
              )}

              {sending && streamingContent === null && (
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
            <Notice tone="warning">{error}</Notice>
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
              placeholder="Ask a question… (Enter to send, Shift+Enter for a new line)"
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
          <p className="mt-2 text-xs text-[var(--fyxvo-text-soft)]">
            Responses are generated by the Fyxvo backend.{" "}
            <span className="font-mono">{input.length} chars</span>
          </p>
        </div>
      </div>
    </div>
  );
}
