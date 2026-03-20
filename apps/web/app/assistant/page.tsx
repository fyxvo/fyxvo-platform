"use client";

import { useRef, useState, useEffect } from "react";
import { Button } from "@fyxvo/ui";
import { PageHeader } from "../../components/page-header";
import { usePortal } from "../../components/portal-provider";
import { webEnv } from "../../lib/env";

interface Message {
  role: "user" | "assistant";
  content: string;
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

export default function AssistantPage() {
  const portal = usePortal();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
    if (!content.trim() || isStreaming) return;
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

      if (!response.ok || !response.body) {
        setMessages((prev) => {
          const copy = [...prev];
          const last = copy[copy.length - 1];
          if (last && last.role === "assistant") {
            copy[copy.length - 1] = { ...last, content: "Sorry, I couldn't reach the AI service. Please try again." };
          }
          return copy;
        });
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") continue;
          try {
            const event = JSON.parse(data) as { text?: string; error?: string };
            if (event.text) {
              accumulated += event.text;
              setMessages((prev) => {
                const copy = [...prev];
                const last = copy[copy.length - 1];
                if (last && last.role === "assistant") {
                  copy[copy.length - 1] = { ...last, content: accumulated };
                }
                return copy;
              });
            }
          } catch {
            // skip
          }
        }
      }
    } catch {
      setMessages((prev) => {
        const copy = [...prev];
        const last = copy[copy.length - 1];
        if (last && last.role === "assistant") {
          copy[copy.length - 1] = { ...last, content: "Network error. Check your connection and try again." };
        }
        return copy;
      });
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

  const isAuthenticated = portal.walletPhase === "authenticated";

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col space-y-0 -mt-8 -mx-4 sm:-mx-6 lg:-mx-8">
      {/* Header */}
      <div className="shrink-0 border-b border-[var(--fyxvo-border)] px-4 py-4 sm:px-6 lg:px-8">
        <PageHeader
          eyebrow="AI Assistant"
          title="Fyxvo Developer Assistant"
          description="Ask anything about Solana development or using Fyxvo. Powered by Claude."
        />
        <p className="mt-2 text-xs text-[var(--fyxvo-text-muted)]">
          AI responses may not always be accurate. Test all code before using in production.
        </p>
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
                  disabled={!isAuthenticated}
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
              <div key={i} className={message.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div
                  className={
                    message.role === "user"
                      ? "max-w-[80%] rounded-2xl rounded-tr-md bg-brand-500 px-4 py-3 text-sm text-white"
                      : "max-w-[90%] rounded-2xl rounded-tl-md border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 py-3"
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
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="shrink-0 border-t border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)]/95 backdrop-blur px-4 py-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-end gap-3 rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-3 focus-within:border-brand-500/50">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isAuthenticated ? "Ask anything about Solana or Fyxvo… (Enter to send, Shift+Enter for newline)" : "Connect wallet to chat"}
              disabled={!isAuthenticated || isStreaming}
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
              disabled={!input.trim() || !isAuthenticated || isStreaming}
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
