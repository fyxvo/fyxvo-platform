"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Badge, Button, Notice, cn } from "@fyxvo/ui";
import { FREE_TIER_REQUESTS, PRICING_LAMPORTS } from "@fyxvo/config/pricing";
import { BrandLogo } from "./brand-logo";
import { WalletConnectButton } from "./wallet-connect-button";
import { usePortal } from "./portal-provider";
import {
  BeakerIcon,
  BookIcon,
  ChartIcon,
  CloseIcon,
  FundingIcon,
  HomeIcon,
  KeyIcon,
  MenuIcon,
  SparklesIcon,
  SupportIcon,
} from "./icons";
import { webEnv } from "../lib/env";
import {
  clearAssistantConversation,
  createAssistantConversation,
  fetchApiHealth,
  fetchApiStatus,
  getAdminAssistantStats,
  getAssistantConversation,
  getAssistantRateLimitStatus,
  getLatestAssistantConversation,
  listAssistantConversations,
  submitAssistantFeedback,
  updateAssistantConversation,
} from "../lib/api";
import type {
  AssistantActionLink,
  AssistantAdminStats,
  AssistantConversationMessage,
  AssistantConversationSummary,
  AssistantMessageFeedback,
  AssistantPlaygroundPayload,
  AssistantRateLimitStatus,
} from "../lib/types";

type AssistantErrorPayload = {
  code?: string;
  error?: string;
  message?: string;
  retryAfterMs?: number;
};

type ComposerState = {
  input: string;
  isStreaming: boolean;
};

type AssistantTab = "home" | "messages" | "help";

const HISTORY_KEY = "fyxvo.assistant.cache";
const PLAYGROUND_INSERT_KEY = "fyxvo.playground.assistantInsert";
const PLAYGROUND_RETURN_KEY = "fyxvo.assistant.returnNotice";
const DEBUG_MODE_KEY = "fyxvo.assistant.debug";
const FOCUS_RING_CLASS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--fyxvo-brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--fyxvo-panel)]";

const PROMPT_GROUPS = [
  {
    title: "Getting started",
    items: [
      "How do I make my first request with Fyxvo",
      "Based on my current project state, what should I do next to reach first real traffic?",
    ],
  },
  {
    title: "Funding and pricing",
    items: [
      "How do I fund a project on devnet",
      "What pricing is live right now?",
    ],
  },
  {
    title: "RPC and relay",
    items: [
      "What is the difference between standard and priority relay",
      "Give me a curl example for getLatestBlockhash using my Fyxvo endpoint.",
    ],
  },
  {
    title: "Debugging",
    items: [
      "Why would I see a 429 from Fyxvo and what should I do next?",
      "How does simulation mode work in Fyxvo right now?",
    ],
  },
  {
    title: "Analytics",
    items: [
      "How do I use Fyxvo analytics to debug latency and error spikes?",
      "What should I check first if my project traffic is lower than expected?",
    ],
  },
] as const;

const DOC_LINKS = {
  quickstart: { href: "/docs#quickstart", label: "Open quickstart" },
  authentication: { href: "/docs#authentication", label: "Open auth docs" },
  funding: { href: "/docs#funding", label: "Open funding docs" },
  "priority-relay": { href: "/docs#priority-relay", label: "Open priority relay docs" },
  analytics: { href: "/docs#analytics", label: "Open analytics docs" },
  webhooks: { href: "/docs#webhooks", label: "Open webhook docs" },
  "simulation-mode": { href: "/docs#simulation-mode", label: "Open simulation docs" },
  pricing: { href: "/pricing", label: "Open pricing" },
} as const;

type DocsSectionKey = keyof typeof DOC_LINKS;

function stableTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  }).format(date);
}

function shortRelative(value: string, hydrated: boolean): string {
  if (!hydrated) return stableTimestamp(value);
  const diffMs = Date.now() - new Date(value).getTime();
  if (diffMs < 60_000) return "just now";
  if (diffMs < 3_600_000) return `${Math.floor(diffMs / 60_000)}m ago`;
  if (diffMs < 86_400_000) return `${Math.floor(diffMs / 3_600_000)}h ago`;
  return `${Math.floor(diffMs / 86_400_000)}d ago`;
}

function formatTimestamp(value: string | undefined, hydrated: boolean): string {
  if (!value) return "";
  if (!hydrated) return stableTimestamp(value);
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

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
    return payload?.message ?? "The AI assistant is temporarily unavailable. Your previous conversations are still here, and you can keep using docs, playground, and analytics.";
  }

  if (status === 500) {
    return payload?.message ?? "The AI assistant ran into an internal error. Please try again shortly.";
  }

  if (status === 400) {
    return payload?.message ?? "That request could not be processed. Please rephrase your message.";
  }

  return payload?.message ?? payload?.error ?? "The AI assistant request failed. Please try again.";
}

function firstCodeBlock(content: string): { language: string; code: string } | null {
  const match = content.match(/```([\w-]*)\n([\s\S]*?)```/);
  if (!match) return null;
  return {
    language: match[1]?.trim() || "code",
    code: match[2]?.trim() ?? "",
  };
}

function extractCurlSnippet(content: string): string | null {
  const block = firstCodeBlock(content);
  if (block?.code.toLowerCase().includes("curl")) return block.code;
  const match = content.match(/curl[\s\S]+?(?=\n\n|$)/i);
  return match?.[0]?.trim() ?? null;
}

function extractJavaScriptSnippet(content: string): string | null {
  const blocks = [...content.matchAll(/```([\w-]*)\n([\s\S]*?)```/g)];
  for (const block of blocks) {
    const language = block[1]?.toLowerCase() ?? "";
    if (["js", "javascript", "ts", "typescript"].includes(language)) {
      return block[2]?.trim() ?? null;
    }
  }
  return null;
}

function detectDocsSection(content: string, matchedDocsSection?: string | null): DocsSectionKey | null {
  if (matchedDocsSection && matchedDocsSection in DOC_LINKS) {
    return matchedDocsSection as DocsSectionKey;
  }

  const lower = content.toLowerCase();
  if (lower.includes("pricing") || lower.includes("lamport")) return "pricing";
  if (lower.includes("webhook")) return "webhooks";
  if (lower.includes("api key") || lower.includes("x-api-key") || lower.includes("authentication")) return "authentication";
  if (lower.includes("fund") || lower.includes("treasury") || lower.includes("devnet sol")) return "funding";
  if (lower.includes("priority")) return "priority-relay";
  if (lower.includes("analytics") || lower.includes("latency") || lower.includes("request")) return "analytics";
  if (lower.includes("simulation")) return "simulation-mode";
  if (lower.includes("quickstart") || lower.includes("first request")) return "quickstart";
  return null;
}

function detectPlaygroundInsert(content: string, payload?: AssistantPlaygroundPayload | null): AssistantPlaygroundPayload | null {
  if (payload?.method) return payload;

  const block = firstCodeBlock(content)?.code ?? content;
  const methodMatch =
    block.match(/"method"\s*:\s*"([^"]+)"/) ??
    block.match(/\b(getHealth|getSlot|getLatestBlockhash|getBalance|getAccountInfo|getEpochInfo|simulateTransaction|getVersion)\b/);
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
  return {
    method,
    params,
    snippet: block,
    mode: /\/priority\b|priority relay|priority endpoint/i.test(block) ? "priority" : "standard",
    simulate:
      /simulate=true|simulation mode|simulated response|method-not-simulated/i.test(block) || method === "simulateTransaction",
  };
}

function inferActionLinks(
  content: string,
  suggestedActions: readonly AssistantActionLink[] | undefined,
  docsSection: DocsSectionKey | null,
  playgroundInsert: AssistantPlaygroundPayload | null,
): AssistantActionLink[] {
  const lower = content.toLowerCase();
  const map = new Map<string, AssistantActionLink>();

  const add = (action: AssistantActionLink | null) => {
    if (!action) return;
    map.set(action.id, action);
  };

  for (const action of suggestedActions ?? []) {
    add(action);
  }

  if (docsSection) {
    const docs = DOC_LINKS[docsSection];
    add({ id: `docs_${docsSection}`, label: docs.label, href: docs.href, kind: "docs" });
  }

  if (playgroundInsert) {
    add({ id: "open_playground", label: "Open in playground", href: "/playground", kind: "playground" });
  }

  if (lower.includes("fund")) {
    add({ id: "open_funding", label: "Open funding page", href: "/funding", kind: "funding" });
  }

  if (lower.includes("api key") || lower.includes("x-api-key")) {
    add({ id: "open_api_keys", label: "Open API keys", href: "/api-keys", kind: "api_keys" });
  }

  if (lower.includes("analytics") || lower.includes("latency")) {
    add({ id: "open_analytics", label: "Open analytics", href: "/analytics", kind: "analytics" });
  }

  if (lower.includes("team") || lower.includes("invite")) {
    add({ id: "open_settings", label: "Invite teammate", href: "/settings", kind: "invite" });
  }

  return [...map.values()];
}

function renderInlineText(text: string): ReactNode[] {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
  return parts.filter(Boolean).map((part, index) => {
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={`${part}-${index}`}
          className="rounded-md bg-[var(--fyxvo-panel)] px-1.5 py-0.5 font-mono text-[0.8em] text-[var(--fyxvo-brand)]"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={`${part}-${index}`} className="font-semibold text-[var(--fyxvo-text)]">
          {part.slice(2, -2)}
        </strong>
      );
    }

    return <span key={`${part}-${index}`}>{part}</span>;
  });
}

function codeColor(token: string, language: string): string {
  const normalized = language.toLowerCase();
  if (/^["'`].*["'`]$/.test(token)) return "text-emerald-600 dark:text-emerald-300";
  if (/^(true|false|null|undefined)$/.test(token)) return "text-amber-600 dark:text-amber-300";
  if (/^\d/.test(token)) return "text-sky-600 dark:text-sky-300";
  if (/^(const|let|await|async|return|import|from|new|if|else|try|catch|export|function|class|type)$/.test(token)) {
    return "text-fuchsia-600 dark:text-fuchsia-300";
  }
  if (normalized === "bash" && /^-{1,2}[a-z0-9-]+/i.test(token)) return "text-fuchsia-600 dark:text-fuchsia-300";
  if ((normalized === "bash" || normalized === "sh") && /^https?:\/\//.test(token)) return "text-sky-600 dark:text-sky-300";
  if (token === "curl") return "text-fuchsia-600 dark:text-fuchsia-300";
  return "text-[var(--fyxvo-text)]";
}

function highlightCode(code: string, language: string): ReactNode[] {
  return code.split("\n").map((line, lineIndex) => {
    const tokens = line.match(/"[^"]*"|'[^']*'|`[^`]*`|https?:\/\/\S+|--?[a-z0-9-]+|\b(?:const|let|await|async|return|import|from|new|if|else|try|catch|export|function|class|type|true|false|null|undefined)\b|\b\d+(?:\.\d+)?\b|\s+|./gi) ?? [line];
    return (
      <span key={`line-${lineIndex}`} className="block">
        {tokens.map((token, tokenIndex) => (
          <span key={`token-${lineIndex}-${tokenIndex}`} className={codeColor(token, language)}>
            {token}
          </span>
        ))}
      </span>
    );
  });
}

function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false);
  const [wrap, setWrap] = useState(false);

  return (
    <div className="my-4 overflow-hidden rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">
            {language}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <button
            type="button"
            onClick={() => setWrap((current) => !current)}
            className={cn(
              "rounded-md border border-[var(--fyxvo-border)] px-2.5 py-1 text-[var(--fyxvo-text-muted)] transition-colors duration-150 hover:border-brand-500/25 hover:text-[var(--fyxvo-text)]",
              FOCUS_RING_CLASS
            )}
          >
            {wrap ? "Scroll" : "Wrap"}
          </button>
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard.writeText(code);
              setCopied(true);
              window.setTimeout(() => setCopied(false), 2000);
            }}
            className={cn(
              "rounded-md border border-[var(--fyxvo-border)] px-2.5 py-1 text-[var(--fyxvo-text-muted)] transition-colors duration-150 hover:border-brand-500/25 hover:text-[var(--fyxvo-text)]",
              FOCUS_RING_CLASS
            )}
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>
      <pre
        className={cn(
          "select-text overflow-x-auto px-4 py-4 font-mono text-[13px] leading-6",
          wrap ? "whitespace-pre-wrap break-words" : "whitespace-pre"
        )}
      >
        <code>{highlightCode(code, language)}</code>
      </pre>
    </div>
  );
}

function MarkdownContent({ content }: { content: string }) {
  const lines = content.split("\n");
  const blocks: ReactNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index] ?? "";

    if (!line.trim()) {
      index += 1;
      continue;
    }

    if (line.startsWith("```")) {
      const language = line.slice(3).trim() || "code";
      const body: string[] = [];
      index += 1;
      while (index < lines.length && !(lines[index] ?? "").startsWith("```")) {
        body.push(lines[index] ?? "");
        index += 1;
      }
      index += 1;
      blocks.push(<CodeBlock key={`code-${blocks.length}`} code={body.join("\n")} language={language} />);
      continue;
    }

    const nextLine = lines[index + 1] ?? "";
    if (line.includes("|") && /^\s*\|?[:\- ]+\|/.test(nextLine)) {
      const header = line.split("|").map((cell) => cell.trim()).filter(Boolean);
      const rows: string[][] = [];
      index += 2;
      while (index < lines.length && (lines[index] ?? "").includes("|")) {
        rows.push((lines[index] ?? "").split("|").map((cell) => cell.trim()).filter(Boolean));
        index += 1;
      }
      blocks.push(
        <div key={`table-${blocks.length}`} className="overflow-x-auto rounded-2xl border border-[var(--fyxvo-border)]">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[var(--fyxvo-panel-soft)] text-[var(--fyxvo-text)]">
              <tr>
                {header.map((cell) => (
                  <th key={cell} className="px-4 py-3 font-semibold">
                    {cell}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)]">
              {rows.map((row, rowIndex) => (
                <tr key={`row-${rowIndex}`}>
                  {row.map((cell, cellIndex) => (
                    <td key={`cell-${rowIndex}-${cellIndex}`} className="px-4 py-3 text-[var(--fyxvo-text-muted)]">
                      {renderInlineText(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    if (/^[-*]\s+/.test(line) || /^\d+\.\s+/.test(line)) {
      const ordered = /^\d+\.\s+/.test(line);
      const items: string[] = [];
      while (index < lines.length && (/^[-*]\s+/.test(lines[index] ?? "") || /^\d+\.\s+/.test(lines[index] ?? ""))) {
        items.push((lines[index] ?? "").replace(/^([-*]|\d+\.)\s+/, ""));
        index += 1;
      }
      const ListTag = ordered ? "ol" : "ul";
      blocks.push(
        <ListTag
          key={`list-${blocks.length}`}
          className={cn("space-y-2 pl-5 text-sm leading-7 text-[var(--fyxvo-text-muted)]", ordered ? "list-decimal" : "list-disc")}
        >
          {items.map((item, itemIndex) => (
            <li key={`item-${itemIndex}`}>{renderInlineText(item)}</li>
          ))}
        </ListTag>
      );
      continue;
    }

    if (/^#{1,3}\s/.test(line)) {
      const level = line.match(/^#+/)?.[0].length ?? 2;
      const text = line.replace(/^#{1,3}\s/, "");
      const HeadingTag = level === 1 ? "h2" : level === 2 ? "h3" : "h4";
      blocks.push(
        <HeadingTag
          key={`heading-${blocks.length}`}
          className={cn(
            "font-display tracking-tight text-[var(--fyxvo-text)]",
            level === 1 ? "text-xl font-semibold" : level === 2 ? "text-lg font-semibold" : "text-base font-semibold"
          )}
        >
          {text}
        </HeadingTag>
      );
      index += 1;
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quoted: string[] = [];
      while (index < lines.length && /^>\s?/.test(lines[index] ?? "")) {
        quoted.push((lines[index] ?? "").replace(/^>\s?/, ""));
        index += 1;
      }
      blocks.push(
        <blockquote
          key={`quote-${blocks.length}`}
          className="rounded-r-2xl border-l-2 border-brand-500/50 bg-brand-500/5 px-4 py-3 text-sm leading-7 text-[var(--fyxvo-text-muted)]"
        >
          {quoted.map((item, itemIndex) => (
            <p key={`quote-line-${itemIndex}`}>{renderInlineText(item)}</p>
          ))}
        </blockquote>
      );
      continue;
    }

    const paragraph: string[] = [];
    while (index < lines.length && lines[index]?.trim() && !/^```/.test(lines[index] ?? "")) {
      const current = lines[index] ?? "";
      if (
        /^[-*]\s+/.test(current) ||
        /^\d+\.\s+/.test(current) ||
        /^#{1,3}\s/.test(current) ||
        /^>\s?/.test(current)
      ) {
        break;
      }
      paragraph.push(current);
      index += 1;
    }
    blocks.push(
      <p key={`paragraph-${blocks.length}`} className="text-sm leading-7 text-[var(--fyxvo-text-soft)]">
        {renderInlineText(paragraph.join(" "))}
      </p>
    );
  }

  return <div className="space-y-4">{blocks}</div>;
}

function ThinkingBubble() {
  return (
    <div className="rounded-2xl rounded-tl-sm border border-[var(--fyxvo-border)] bg-[linear-gradient(180deg,var(--fyxvo-panel-soft),var(--fyxvo-panel))] px-5 py-4 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
      <div className="flex items-center gap-3">
        <div className="flex gap-1">
          {[0, 1, 2].map((dot) => (
            <span
              key={dot}
              className="inline-block h-2 w-2 animate-bounce rounded-full bg-[var(--fyxvo-brand)]/60"
              style={{ animationDelay: `${dot * 0.15}s`, animationDuration: "0.9s" }}
            />
          ))}
        </div>
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="h-2 w-20 animate-pulse rounded-full bg-[var(--fyxvo-border)]" />
          <div className="h-2 w-full animate-pulse rounded-full bg-[var(--fyxvo-border)]/70" />
          <div className="h-2 w-3/5 animate-pulse rounded-full bg-[var(--fyxvo-border)]/50" />
        </div>
      </div>
    </div>
  );
}

function SectionCard({
  title,
  description,
  children,
  action,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-5 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-[var(--fyxvo-text)]">{title}</h3>
          {description ? <p className="mt-1 text-xs leading-5 text-[var(--fyxvo-text-muted)]">{description}</p> : null}
        </div>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function AssistantActionPill({
  children,
  onClick,
  href,
}: {
  children: ReactNode;
  onClick?: () => void;
  href?: string;
}) {
  const className =
    cn(
      "inline-flex items-center rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)] px-3 py-1.5",
      "text-xs font-medium text-[var(--fyxvo-text-muted)]",
      "transition-colors duration-150 hover:border-brand-500/25 hover:text-[var(--fyxvo-text)]",
      FOCUS_RING_CLASS
    );

  if (href) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {children}
    </button>
  );
}

function ToolCard({
  title,
  description,
  href,
  icon,
}: {
  title: string;
  description: string;
  href: string;
  icon: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)] px-4 py-3.5 transition-colors duration-150 hover:border-brand-500/25 hover:bg-brand-500/5",
        FOCUS_RING_CLASS
      )}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-brand-500/15 bg-brand-500/8 text-[var(--fyxvo-brand)]">
          {icon}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-[var(--fyxvo-text)]">{title}</div>
          <div className="mt-1 text-xs leading-5 text-[var(--fyxvo-text-muted)]">{description}</div>
        </div>
      </div>
    </Link>
  );
}

function feedbackTone(feedback: AssistantMessageFeedback | null | undefined) {
  if (!feedback) return "neutral";
  return feedback.rating === "up" ? "success" : "warning";
}

export function AssistantWorkspace() {
  const portal = usePortal();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const threadBottomRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<AssistantConversationMessage[]>([]);
  const [conversations, setConversations] = useState<AssistantConversationSummary[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [composer, setComposer] = useState<ComposerState>({ input: "", isStreaming: false });
  const [assistantAvailable, setAssistantAvailable] = useState<boolean | null>(null);
  const [assistantStatusMessage, setAssistantStatusMessage] = useState<string | null>(null);
  const [rateLimitStatus, setRateLimitStatus] = useState<AssistantRateLimitStatus | null>(null);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [conversationQuery, setConversationQuery] = useState("");
  const [conversationSearchLoading, setConversationSearchLoading] = useState(false);
  const [conversationUpdatingId, setConversationUpdatingId] = useState<string | null>(null);
  const [conversationRenamingId, setConversationRenamingId] = useState<string | null>(null);
  const [conversationRenameValue, setConversationRenameValue] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<AssistantTab>("home");
  const [copiedActionId, setCopiedActionId] = useState<string | null>(null);
  const [debugMode, setDebugMode] = useState(false);
  const [returnBanner, setReturnBanner] = useState<string | null>(null);
  const [showOnboardingBanner, setShowOnboardingBanner] = useState(false);
  const [adminAssistantStats, setAdminAssistantStats] = useState<AssistantAdminStats | null>(null);
  const [feedbackDraft, setFeedbackDraft] = useState<{ messageId: string; rating: "up" | "down"; note: string } | null>(null);
  const [feedbackSubmitting, setFeedbackSubmitting] = useState<string | null>(null);
  const [lastSubmittedPrompt, setLastSubmittedPrompt] = useState<string | null>(null);
  const [assistantRequestIssue, setAssistantRequestIssue] = useState<{ message: string; retryable: boolean } | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  const isAuthenticated = portal.walletPhase === "authenticated";
  const isAssistantUnavailable = assistantAvailable === false;
  const selectedProject = portal.selectedProject;
  const activeAssistantMessage = [...messages].reverse().find((message) => message.role === "assistant" && message.content);
  const availableSolCredits = portal.onchainSnapshot.balances?.availableSolCredits;

  const latestActiveApiKey = useMemo(() => {
    if (!selectedProject) return null;
    return portal.apiKeys
      .filter((apiKey) => apiKey.projectId === selectedProject.id && apiKey.status === "ACTIVE")
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())[0] ?? null;
  }, [portal.apiKeys, selectedProject]);

  const latestApiKeyMasked = latestActiveApiKey ? `${latestActiveApiKey.prefix}••••` : "None yet";
  const projectActivated = portal.onchainSnapshot.projectAccountExists;
  const fundedSol = availableSolCredits ? Number(BigInt(availableSolCredits)) / 1_000_000_000 : 0;
  const requestsLast7Days = portal.projectAnalytics.totals.requestLogs;
  const usageRemaining = rateLimitStatus?.messagesRemainingThisHour ?? null;
  const rateLimitReset = rateLimitStatus?.resetAt ?? rateLimitStatus?.windowResetAt ?? null;
  const activeConversationSummary = conversations.find((conversation) => conversation.id === activeConversationId) ?? null;
  const pinnedConversations = useMemo(
    () => conversations.filter((conversation) => conversation.pinned && !conversation.archivedAt),
    [conversations]
  );
  const recentConversations = useMemo(
    () => conversations.filter((conversation) => !conversation.pinned && !conversation.archivedAt),
    [conversations]
  );
  const archivedConversations = useMemo(
    () => conversations.filter((conversation) => Boolean(conversation.archivedAt)),
    [conversations]
  );

  useEffect(() => {
    threadBottomRef.current?.scrollIntoView({ behavior: messages.length > 0 ? "smooth" : "auto" });
  }, [messages]);

  useEffect(() => {
    if (messages.length > 0) {
      setActiveTab("messages");
    }
  }, [messages.length]);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    const storedDebugMode = typeof window !== "undefined" ? window.localStorage.getItem(DEBUG_MODE_KEY) : null;
    if (storedDebugMode === "1") {
      setDebugMode(true);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(DEBUG_MODE_KEY, debugMode ? "1" : "0");
  }, [debugMode]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const stored = window.localStorage.getItem(HISTORY_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as {
          activeConversationId?: string | null;
          messages?: AssistantConversationMessage[];
        };
        if (parsed.activeConversationId) setActiveConversationId(parsed.activeConversationId);
        if (parsed.messages?.length) setMessages(parsed.messages.slice(-50));
      }
    } catch {
      // ignore local cache corruption
    }

    const pendingReturnBanner = window.sessionStorage.getItem(PLAYGROUND_RETURN_KEY);
    if (pendingReturnBanner) {
      setReturnBanner(pendingReturnBanner);
      window.sessionStorage.removeItem(PLAYGROUND_RETURN_KEY);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(HISTORY_KEY, JSON.stringify({ activeConversationId, messages: messages.slice(-50) }));
    } catch {
      // ignore cache write failures
    }
  }, [activeConversationId, messages]);

  useEffect(() => {
    let cancelled = false;

    Promise.allSettled([fetchApiHealth(), fetchApiStatus()])
      .then(([healthResult, statusResult]) => {
        if (cancelled) return;

        const availability =
          statusResult.status === "fulfilled" && typeof statusResult.value.assistantAvailable === "boolean"
            ? statusResult.value.assistantAvailable
            : healthResult.status === "fulfilled" && typeof healthResult.value.assistantAvailable === "boolean"
              ? healthResult.value.assistantAvailable
              : null;

        setAssistantAvailable(availability);
        setAssistantStatusMessage(
          availability === false
            ? "The AI assistant is temporarily unavailable. Your saved conversations remain available, and you can keep working from docs, playground, and analytics."
            : availability === null
              ? "Fyxvo could not verify assistant availability right now. You can still try sending a message."
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
      listAssistantConversations(portal.token, { limit: 20, includeArchived: true }),
      getLatestAssistantConversation(portal.token),
      getAssistantRateLimitStatus(portal.token),
      portal.user?.role === "OWNER" || portal.user?.role === "ADMIN" ? getAdminAssistantStats(portal.token) : Promise.resolve(null),
    ])
      .then(([conversationData, latestData, rateData, adminData]) => {
        if (cancelled) return;
        setConversations(conversationData.items);
        setRateLimitStatus(rateData);
        setAssistantAvailable(rateData.assistantAvailable);
        const latestConversation = latestData.item;
        if (latestConversation) {
          setActiveConversationId((current) => current ?? latestConversation.id);
          setMessages((current) => (current.length > 0 ? current : [...latestConversation.messages]));
        }
        if (adminData?.item) {
          setAdminAssistantStats(adminData.item);
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [portal.token, portal.user?.role, isAuthenticated]);

  useEffect(() => {
    if (!portal.token || !isAuthenticated) return;
    let cancelled = false;
    const timeoutId = window.setTimeout(() => {
      setConversationSearchLoading(true);
      void listAssistantConversations(portal.token!, { limit: 20, query: conversationQuery, includeArchived: true })
        .then((data) => {
          if (cancelled) return;
          setConversations(data.items);
        })
        .catch(() => undefined)
        .finally(() => {
          if (!cancelled) {
            setConversationSearchLoading(false);
          }
        });
    }, conversationQuery.trim() ? 180 : 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [portal.token, isAuthenticated, conversationQuery]);

  useEffect(() => {
    if (!portal.user?.id || typeof window === "undefined") return;
    const key = `fyxvo.assistant.onboardingDismissed:${portal.user.id}`;
    setShowOnboardingBanner(window.localStorage.getItem(key) !== "1");
  }, [portal.user?.id]);

  useEffect(() => {
    const target = textareaRef.current;
    if (!target) return;
    target.style.height = "auto";
    target.style.height = `${Math.min(target.scrollHeight, 220)}px`;
  }, [composer.input]);

  async function refreshConversationState() {
    if (!portal.token) return;
    const [conversationData, rateData] = await Promise.all([
      listAssistantConversations(portal.token, { limit: 20, query: conversationQuery, includeArchived: true }),
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
      setMessages([...data.item.messages]);
      setActiveConversationId(conversationId);
      setActiveTab("messages");
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
    setActiveTab("messages");
    setSidebarOpen(false);
    setReturnBanner(null);
    setFeedbackDraft(null);
    setConversationRenamingId(null);
    setConversationRenameValue("");
  }

  async function handleToggleConversationPinned(conversation: AssistantConversationSummary) {
    if (!portal.token) return;
    setConversationUpdatingId(conversation.id);
    try {
      const data = await updateAssistantConversation(
        conversation.id,
        { pinned: !conversation.pinned },
        portal.token
      );
      setConversations((current) =>
        [...current.filter((item) => item.id !== conversation.id), data.item].sort((left, right) => {
          if (left.pinned !== right.pinned) return left.pinned ? -1 : 1;
          return new Date(right.lastMessageAt).getTime() - new Date(left.lastMessageAt).getTime();
        })
      );
    } finally {
      setConversationUpdatingId(null);
    }
  }

  async function handleRenameConversation(conversation: AssistantConversationSummary) {
    if (!portal.token || !conversationRenameValue.trim()) return;
    setConversationUpdatingId(conversation.id);
    try {
      const data = await updateAssistantConversation(
        conversation.id,
        { title: conversationRenameValue.trim() },
        portal.token
      );
      setConversations((current) =>
        current.map((item) => (item.id === conversation.id ? data.item : item))
      );
      setConversationRenamingId(null);
      setConversationRenameValue("");
    } finally {
      setConversationUpdatingId(null);
    }
  }

  async function handleToggleConversationArchived(conversation: AssistantConversationSummary) {
    if (!portal.token) return;
    setConversationUpdatingId(conversation.id);
    try {
      await updateAssistantConversation(
        conversation.id,
        { archived: !conversation.archivedAt },
        portal.token
      );
      const refreshed = await listAssistantConversations(portal.token, {
        limit: 20,
        query: conversationQuery,
        includeArchived: true,
      });
      setConversations(refreshed.items);

      if (!conversation.archivedAt) {
        if (activeConversationId === conversation.id) {
          const nextConversation = refreshed.items.find((item) => !item.archivedAt && item.id !== conversation.id) ?? null;
          if (nextConversation) {
            await loadConversation(nextConversation.id);
          } else {
            setActiveConversationId(null);
            setMessages([]);
          }
        }
      } else {
        const restored = refreshed.items.find((item) => item.id === conversation.id);
        if (restored) {
          setActiveConversationId(restored.id);
        }
      }
    } finally {
      setConversationUpdatingId(null);
    }
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
      if (remaining[0]) {
        await loadConversation(remaining[0].id);
      }
    }
  }

  function replaceLastAssistantMessage(content: string) {
    setMessages((previous) => {
      const nextMessages = [...previous];
      const lastMessage = nextMessages[nextMessages.length - 1];
      if (lastMessage && lastMessage.role === "assistant") {
        nextMessages[nextMessages.length - 1] = { ...lastMessage, content };
      }
      return nextMessages;
    });
  }

  function copyWithToast(value: string, id: string) {
    void navigator.clipboard.writeText(value);
    setCopiedActionId(id);
    window.setTimeout(() => setCopiedActionId((current) => (current === id ? null : current)), 2000);
  }

  function insertIntoPlayground(message: AssistantConversationMessage) {
    const payload = detectPlaygroundInsert(message.content, message.playgroundPayload);
    if (!payload || typeof window === "undefined") return;
    window.sessionStorage.setItem(PLAYGROUND_INSERT_KEY, JSON.stringify(payload));
    const params = new URLSearchParams({ method: payload.method });
    if (payload.mode) params.set("mode", payload.mode);
    if (payload.simulate) params.set("simulate", "true");
    for (const [key, value] of Object.entries(payload.params ?? {})) {
      if (value) params.set(key, value);
    }
    window.location.href = `/playground?${params.toString()}`;
  }

  function handleRetryLastPrompt() {
    if (!lastSubmittedPrompt || composer.isStreaming) return;
    void sendMessage(lastSubmittedPrompt);
  }

  async function sendMessage(content: string) {
    const trimmedContent = content.trim();
    if (!trimmedContent || composer.isStreaming || !portal.token) return;
    setActiveTab("messages");
    setLastSubmittedPrompt(trimmedContent);
    setAssistantRequestIssue(null);

    let conversationId = activeConversationId;
    let accumulated = "";

    const userMessage: AssistantConversationMessage = {
      id: `local-user-${Date.now()}`,
      role: "user",
      content: trimmedContent,
      createdAt: new Date().toISOString(),
    };
    const nextMessages = [...messages, userMessage];
    setMessages([
      ...nextMessages,
      {
        id: `local-assistant-${Date.now()}`,
        role: "assistant",
        content: "",
        createdAt: new Date().toISOString(),
      },
    ]);
    setComposer({ input: "", isStreaming: true });
    setFeedbackDraft(null);

    try {
      if (!conversationId) {
        const created = await createAssistantConversation(trimmedContent.slice(0, 60), portal.token);
        conversationId = created.item.id;
        setActiveConversationId(conversationId);
        setConversations((current) => [created.item, ...current.filter((item) => item.id !== created.item.id)]);
      }

      const projectContext = selectedProject
        ? {
            projectId: selectedProject.id,
            projectName: selectedProject.name,
            projectNames: portal.projects.map((project) => project.name),
            balance: fundedSol > 0 ? `${fundedSol.toFixed(4)} SOL` : undefined,
            totalBalanceSol: fundedSol,
            requestCount: selectedProject._count?.requestLogs,
            requestsLast7Days,
            gatewayStatus: isAssistantUnavailable ? "unavailable" : "operational",
            activationStatus: projectActivated ? "activated" : "needs activation",
            latestApiKeyMasked: latestActiveApiKey ? `${latestActiveApiKey.prefix}••••` : undefined,
            simulationModeAvailable: true,
            activeAnnouncements: portal.adminOverview?.recentErrors?.slice(0, 1).map((entry) => entry.route) ?? undefined,
          }
        : undefined;

      const response = await fetch(new URL("/v1/assistant/chat", webEnv.apiBaseUrl), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${portal.token}`,
        },
        body: JSON.stringify({
          conversationId,
          messages: nextMessages.map((message) => ({ role: message.role, content: message.content })),
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
        setAssistantRequestIssue({ message: errorContent, retryable: true });
        replaceLastAssistantMessage(errorContent);
        return;
      }

      if (!response.body || !contentType.includes("text/event-stream")) {
        const errorPayload = await parseAssistantErrorPayload(response);
        const errorContent = getAssistantErrorMessage(response.status || 500, errorPayload);
        setAssistantRequestIssue({ message: errorContent, retryable: true });
        replaceLastAssistantMessage(errorContent);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
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
            // ignore malformed payload fragments
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
          // ignore malformed payload fragments
        }
      }

      if (streamError) {
        setAssistantRequestIssue({ message: streamError, retryable: true });
        replaceLastAssistantMessage(
          accumulated.length > 0 ? `${accumulated}\n\n_${streamError}_` : streamError
        );
      }

      if (conversationId && portal.token) {
        const refreshed = await getAssistantConversation(conversationId, portal.token).catch(() => null);
        if (refreshed?.item) {
          setMessages([...refreshed.item.messages]);
        }
      }

      setAssistantRequestIssue(null);
      await refreshConversationState();
    } catch {
      const interruptionMessage =
        accumulated.length > 0
          ? `${accumulated}\n\n_The response stream was interrupted before it finished. Retry to continue._`
          : "The assistant connection was interrupted before a response completed. Try again in a moment.";
      setAssistantRequestIssue({
        message: "The assistant stream was interrupted before the reply finished.",
        retryable: true,
      });
      replaceLastAssistantMessage(interruptionMessage);
    } finally {
      setComposer((current) => ({ ...current, isStreaming: false }));
    }
  }

  function dismissOnboardingBanner() {
    if (typeof window === "undefined" || !portal.user?.id) return;
    window.localStorage.setItem(`fyxvo.assistant.onboardingDismissed:${portal.user.id}`, "1");
    setShowOnboardingBanner(false);
  }

  async function handleFeedbackSubmit() {
    if (!feedbackDraft || !portal.token || !activeConversationId) return;
    setFeedbackSubmitting(feedbackDraft.messageId);
    try {
      const result = await submitAssistantFeedback(
        {
          conversationId: activeConversationId,
          messageId: feedbackDraft.messageId,
          rating: feedbackDraft.rating,
          note: feedbackDraft.note,
        },
        portal.token
      );

      setMessages((current) =>
        current.map((message) =>
          message.id === feedbackDraft.messageId ? { ...message, feedback: result.item } : message
        )
      );
      setFeedbackDraft(null);
    } finally {
      setFeedbackSubmitting(null);
    }
  }

  function renderMessageActions(message: AssistantConversationMessage) {
    if (!message.content || message.role !== "assistant") return null;

    const docsSection = detectDocsSection(message.content, message.matchedDocsSection);
    const docsLink = docsSection ? DOC_LINKS[docsSection] : null;
    const playgroundInsert = detectPlaygroundInsert(message.content, message.playgroundPayload);
    const curlSnippet = extractCurlSnippet(message.content);
    const jsSnippet = extractJavaScriptSnippet(message.content);
    const actions = inferActionLinks(message.content, message.suggestedActions, docsSection, playgroundInsert);
    const feedbackId = message.id;
    const copyActions = [
      {
        id: `copy-${feedbackId}`,
        label: copiedActionId === `copy-${feedbackId}` ? "Copied!" : "Copy reply",
        onClick: () => copyWithToast(message.content, `copy-${feedbackId}`),
      },
      {
        id: `markdown-${feedbackId}`,
        label: copiedActionId === `markdown-${feedbackId}` ? "Markdown copied!" : "Copy as markdown",
        onClick: () => copyWithToast(message.content, `markdown-${feedbackId}`),
      },
      ...(curlSnippet
        ? [{
            id: `curl-${feedbackId}`,
            label: copiedActionId === `curl-${feedbackId}` ? "curl copied!" : "Copy curl",
            onClick: () => copyWithToast(curlSnippet, `curl-${feedbackId}`),
          }]
        : []),
      ...(jsSnippet
        ? [{
            id: `js-${feedbackId}`,
            label: copiedActionId === `js-${feedbackId}` ? "JS copied!" : "Copy JS example",
            onClick: () => copyWithToast(jsSnippet, `js-${feedbackId}`),
          }]
        : []),
    ];
    const navigationActions: Array<{ id: string; label: string; href?: string; onClick?: () => void }> = [
      ...(playgroundInsert
        ? [{ id: `playground-${feedbackId}`, label: "Open in playground", onClick: () => insertIntoPlayground(message) }]
        : []),
      ...(docsLink ? [{ id: `docs-${feedbackId}`, label: docsLink.label, href: docsLink.href }] : []),
      ...actions
        .filter((action) => !docsLink || action.href !== docsLink.href)
        .slice(0, 3)
        .map((action) => ({
          id: action.id,
          label: action.label,
          href: action.href,
        })),
    ];
    const hasUtilitySection = copyActions.length > 0 || navigationActions.length > 0;

    return (
      <div className="space-y-3">
        {hasUtilitySection ? (
          <details className="group overflow-hidden rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)]">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-medium text-[var(--fyxvo-text)]">
              <div>
                <div>Helpful actions</div>
                <div className="mt-1 text-xs font-normal text-[var(--fyxvo-text-muted)]">
                  Open the right page or copy examples without covering the answer.
                </div>
              </div>
              <span className="text-xs text-[var(--fyxvo-text-muted)] transition group-open:rotate-180">▾</span>
            </summary>
            <div className="border-t border-[var(--fyxvo-border)] px-4 py-4">
              <div className="grid gap-4 md:grid-cols-2">
                {navigationActions.length > 0 ? (
                  <div className="space-y-2">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--fyxvo-text-muted)]">
                      Where to go
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {navigationActions.map((action) =>
                        action.href ? (
                          <AssistantActionPill key={action.id} href={action.href}>
                            {action.label}
                          </AssistantActionPill>
                        ) : (
                          <AssistantActionPill
                            key={action.id}
                            {...(action.onClick ? { onClick: action.onClick } : {})}
                          >
                            {action.label}
                          </AssistantActionPill>
                        )
                      )}
                    </div>
                  </div>
                ) : null}

                {copyActions.length > 0 ? (
                  <div className="space-y-2">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--fyxvo-text-muted)]">
                      Copy and reuse
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {copyActions.map((action) => (
                        <AssistantActionPill key={action.id} onClick={action.onClick}>
                          {action.label}
                        </AssistantActionPill>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </details>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)] px-4 py-2.5">
          <div className="flex items-center gap-2 text-xs text-[var(--fyxvo-text-muted)]">
            <span>Feedback</span>
            {message.feedback ? <Badge tone={feedbackTone(message.feedback)}>{message.feedback.rating === "up" ? "Helpful" : "Needs work"}</Badge> : null}
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              aria-label="Mark as helpful"
              onClick={() => setFeedbackDraft({ messageId: message.id, rating: "up", note: message.feedback?.note ?? "" })}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg border transition-colors duration-150",
                FOCUS_RING_CLASS,
                feedbackDraft?.messageId === message.id && feedbackDraft.rating === "up"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
                  : "border-[var(--fyxvo-border)] text-[var(--fyxvo-text-muted)] hover:border-emerald-500/30 hover:text-emerald-500"
              )}
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true">
                <path d="M5 7V13M5 7L7.5 2C8.5 2 9.5 2.5 9.5 4V6H13C13.5 6 14 6.5 13.8 7L12.5 12C12.3 12.7 11.7 13 11 13H5M5 7H3C2.4 7 2 7.4 2 8V12C2 12.6 2.4 13 3 13H5" />
              </svg>
            </button>
            <button
              type="button"
              aria-label="Mark as needing improvement"
              onClick={() => setFeedbackDraft({ messageId: message.id, rating: "down", note: message.feedback?.note ?? "" })}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg border transition-colors duration-150",
                FOCUS_RING_CLASS,
                feedbackDraft?.messageId === message.id && feedbackDraft.rating === "down"
                  ? "border-amber-500/30 bg-amber-500/10 text-amber-500"
                  : "border-[var(--fyxvo-border)] text-[var(--fyxvo-text-muted)] hover:border-amber-500/30 hover:text-amber-500"
              )}
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true">
                <path d="M11 9V3M11 9L8.5 14C7.5 14 6.5 13.5 6.5 12V10H3C2.5 10 2 9.5 2.2 9L3.5 4C3.7 3.3 4.3 3 5 3H11M11 9H13C13.6 9 14 8.6 14 8V4C14 3.4 13.6 3 13 3H11" />
              </svg>
            </button>
          </div>
        </div>

        {feedbackDraft?.messageId === message.id ? (
          <div className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)] px-4 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-[var(--fyxvo-text)]">
                  {feedbackDraft.rating === "up" ? "What worked well?" : "What should be better?"}
                </div>
                <div className="mt-1 text-xs text-[var(--fyxvo-text-muted)]">
                  Optional note for assistant quality review.
                </div>
              </div>
              <Badge tone={feedbackDraft.rating === "up" ? "success" : "warning"}>
                {feedbackDraft.rating === "up" ? "Helpful" : "Needs work"}
              </Badge>
            </div>
            <textarea
              value={feedbackDraft.note}
              onChange={(event) => setFeedbackDraft((current) => (current ? { ...current, note: event.target.value } : current))}
              rows={3}
              placeholder="Optional note"
              className="mt-3 w-full rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 py-3 text-sm text-[var(--fyxvo-text)] outline-none placeholder:text-[var(--fyxvo-text-muted)] transition-colors duration-150 focus:border-brand-500/40"
            />
            <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setFeedbackDraft(null)}>
                Cancel
              </Button>
              <Button size="sm" onClick={() => void handleFeedbackSubmit()} disabled={feedbackSubmitting === message.id}>
                {feedbackSubmitting === message.id ? "Saving…" : "Submit feedback"}
              </Button>
            </div>
          </div>
        ) : null}

        {debugMode ? (
          <div className="rounded-2xl border border-dashed border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)] px-4 py-3 text-xs text-[var(--fyxvo-text-muted)]">
            <div className="font-semibold text-[var(--fyxvo-text)]">Developer debug mode</div>
            <div className="mt-2 grid gap-2 md:grid-cols-2">
              <div>Project context: {selectedProject ? selectedProject.name : "No project context"}</div>
              <div>Docs section: {message.matchedDocsSection ?? "none"}</div>
              <div>Prompt category: {message.promptCategory ?? "unknown"}</div>
              <div>
                Inferred actions: {(message.suggestedActions ?? []).map((action) => action.label).join(", ") || "none"}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  const workspaceContextContent = selectedProject ? (
    <div className="space-y-3 text-sm">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[var(--fyxvo-text-muted)]">Current project</span>
        <span className="font-medium text-[var(--fyxvo-text)]">{selectedProject.name}</span>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-[var(--fyxvo-text-muted)]">Activation</span>
        <Badge tone={projectActivated ? "success" : "warning"}>{projectActivated ? "Activated" : "Needs activation"}</Badge>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-[var(--fyxvo-text-muted)]">Funded SOL</span>
        <span className="font-medium text-[var(--fyxvo-text)]">{fundedSol.toFixed(4)} SOL</span>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-[var(--fyxvo-text-muted)]">Requests last 7d</span>
        <span className="font-medium text-[var(--fyxvo-text)]">{requestsLast7Days.toLocaleString()}</span>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-[var(--fyxvo-text-muted)]">Latest API key</span>
        <span className="font-mono text-xs text-[var(--fyxvo-text)]">{latestApiKeyMasked}</span>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-[var(--fyxvo-text-muted)]">Gateway status</span>
        <Badge tone={assistantAvailable === false ? "warning" : "success"}>{assistantAvailable === false ? "Unavailable" : "Operational"}</Badge>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-[var(--fyxvo-text-muted)]">Simulation mode</span>
        <span className="font-medium text-[var(--fyxvo-text)]">Available in Playground</span>
      </div>
    </div>
  ) : (
    <div className="rounded-2xl border border-dashed border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)] px-4 py-4 text-sm text-[var(--fyxvo-text-muted)]">
      No project context is selected. The assistant can still help with docs, RPC examples, and platform guidance.
    </div>
  );

  const usageAvailabilityContent = (
    <div className="space-y-3 text-sm">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[var(--fyxvo-text-muted)]">Model</span>
        <span className="font-mono text-xs text-[var(--fyxvo-text)]">{rateLimitStatus?.model ?? "Claude"}</span>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-[var(--fyxvo-text-muted)]">Availability</span>
        <Badge tone={assistantAvailable === false ? "warning" : "success"}>
          {assistantAvailable === false ? "Unavailable" : "Available"}
        </Badge>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-[var(--fyxvo-text-muted)]">Messages remaining</span>
        <span className="font-medium text-[var(--fyxvo-text)]">{usageRemaining ?? "—"}</span>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-[var(--fyxvo-text-muted)]">Window reset</span>
        <span className="text-[var(--fyxvo-text)]">{rateLimitReset ? shortRelative(rateLimitReset, isHydrated) : "—"}</span>
      </div>
      <div className="rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)] px-4 py-3 text-xs text-[var(--fyxvo-text-muted)]">
        Pricing now: {PRICING_LAMPORTS.standard.toLocaleString()} lamports standard,{" "}
        {PRICING_LAMPORTS.priority.toLocaleString()} priority, plus {FREE_TIER_REQUESTS.toLocaleString()} free starter requests per project.
      </div>
    </div>
  );

  const quickActionsContent = (
    <div className="grid gap-3">
      <ToolCard
        title="Open playground"
        description="Run or simulate gateway requests with your current project selected."
        href="/playground"
        icon={<BeakerIcon className="h-4 w-4" />}
      />
      <ToolCard
        title="Manage API keys"
        description="Review or create scoped gateway credentials for your project."
        href="/api-keys"
        icon={<KeyIcon className="h-4 w-4" />}
      />
      <ToolCard
        title="Review funding"
        description="Check devnet SOL balance and continue the funding flow if needed."
        href="/funding"
        icon={<FundingIcon className="h-4 w-4" />}
      />
      <ToolCard
        title="View analytics"
        description="Trace recent request volume, latency, and error spikes."
        href="/analytics"
        icon={<ChartIcon className="h-4 w-4" />}
      />
    </div>
  );

  const relatedDocsContent = (
    <div className="grid gap-2">
      {Object.entries(DOC_LINKS).map(([key, item]) => (
        <Link
          key={key}
          href={item.href}
          className="flex items-center justify-between rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)] px-4 py-3 text-sm text-[var(--fyxvo-text-muted)] transition hover:border-brand-500/30 hover:text-[var(--fyxvo-text)]"
        >
          <span>{item.label}</span>
          <BookIcon className="h-4 w-4" />
        </Link>
      ))}
    </div>
  );

  const developerDebugContent = (
    <div className="space-y-3 text-xs text-[var(--fyxvo-text-muted)]">
      <div className="flex items-center justify-between gap-3">
        <span>Current project context</span>
        <span className="text-[var(--fyxvo-text)]">{selectedProject ? selectedProject.name : "None"}</span>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span>Latest docs match</span>
        <span className="text-[var(--fyxvo-text)]">
          {activeAssistantMessage?.matchedDocsSection ?? detectDocsSection(activeAssistantMessage?.content ?? "") ?? "None"}
        </span>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span>Inferred actions</span>
        <span className="text-[var(--fyxvo-text)]">
          {(activeAssistantMessage?.suggestedActions ?? []).map((action) => action.label).join(", ") || "None"}
        </span>
      </div>
    </div>
  );

  function renderConversationRow(conversation: AssistantConversationSummary, compact = false) {
    const isActive = activeConversationId === conversation.id;
    const isRenaming = conversationRenamingId === conversation.id;
    const archived = Boolean(conversation.archivedAt);

    return (
      <div
        key={conversation.id}
        className={cn(
          "rounded-xl border px-3.5 py-3 transition-colors duration-150",
          isActive
            ? "border-brand-500/25 bg-brand-500/8"
            : compact
              ? "border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)]"
              : "border-transparent hover:border-[var(--fyxvo-border)] hover:bg-[var(--fyxvo-panel-soft)]"
        )}
      >
        {isRenaming ? (
          <div className="space-y-2">
            <input
              type="text"
              value={conversationRenameValue}
              onChange={(event) => setConversationRenameValue(event.target.value)}
              aria-label="Rename conversation"
              className={cn(
                "h-10 w-full rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)] px-3 text-sm text-[var(--fyxvo-text)] outline-none transition-colors placeholder:text-[var(--fyxvo-text-muted)]",
                "focus:border-brand-500/40",
                FOCUS_RING_CLASS
              )}
            />
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setConversationRenamingId(null);
                  setConversationRenameValue("");
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => void handleRenameConversation(conversation)}
                disabled={!conversationRenameValue.trim() || conversationUpdatingId === conversation.id}
              >
                {conversationUpdatingId === conversation.id ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => void loadConversation(conversation.id)}
              aria-current={isActive ? "page" : undefined}
              className={cn("min-h-[44px] w-full text-left", FOCUS_RING_CLASS)}
            >
              <div className="flex items-center gap-2">
                <div className="line-clamp-2 text-sm font-medium text-[var(--fyxvo-text)]">{conversation.title}</div>
                {conversation.pinned ? <Badge tone="neutral">Pinned</Badge> : null}
                {archived ? <Badge tone="warning">Archived</Badge> : null}
              </div>
              <div className="mt-1.5 flex items-center justify-between gap-2 text-[11px] text-[var(--fyxvo-text-muted)]">
                <span>{conversation.messageCount} msg</span>
                <span>{shortRelative(conversation.lastMessageAt, isHydrated)}</span>
              </div>
            </button>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                aria-label={conversation.pinned ? "Unpin conversation" : "Pin conversation"}
                disabled={conversationUpdatingId === conversation.id || archived}
                onClick={() => void handleToggleConversationPinned(conversation)}
                className={cn(
                  "rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors",
                  FOCUS_RING_CLASS,
                  conversation.pinned
                    ? "border-brand-500/30 bg-brand-500/10 text-[var(--fyxvo-brand)]"
                    : "border-[var(--fyxvo-border)] text-[var(--fyxvo-text-muted)] hover:text-[var(--fyxvo-text)] disabled:opacity-50"
                )}
              >
                {conversationUpdatingId === conversation.id ? "…" : conversation.pinned ? "Pinned" : "Pin"}
              </button>
              <button
                type="button"
                aria-label="Rename conversation"
                disabled={conversationUpdatingId === conversation.id}
                onClick={() => {
                  setConversationRenamingId(conversation.id);
                  setConversationRenameValue(conversation.title);
                }}
                className={cn(
                  "rounded-lg border border-[var(--fyxvo-border)] px-2.5 py-1 text-[11px] font-medium text-[var(--fyxvo-text-muted)] transition-colors hover:text-[var(--fyxvo-text)]",
                  FOCUS_RING_CLASS
                )}
              >
                Rename
              </button>
              <button
                type="button"
                aria-label={archived ? "Restore conversation" : "Archive conversation"}
                disabled={conversationUpdatingId === conversation.id}
                onClick={() => void handleToggleConversationArchived(conversation)}
                className={cn(
                  "rounded-lg border border-[var(--fyxvo-border)] px-2.5 py-1 text-[11px] font-medium text-[var(--fyxvo-text-muted)] transition-colors hover:text-[var(--fyxvo-text)]",
                  FOCUS_RING_CLASS
                )}
              >
                {conversationUpdatingId === conversation.id ? "…" : archived ? "Restore" : "Archive"}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderConversationSection(
    title: string,
    items: readonly AssistantConversationSummary[],
    compact = false
  ) {
    if (items.length === 0) return null;
    return (
      <div className="space-y-2">
        <div className="px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">
          {title}
        </div>
        <div className="space-y-2">
          {items.map((conversation) => renderConversationRow(conversation, compact))}
        </div>
      </div>
    );
  }

  const adminAssistantInsightSection = adminAssistantStats ? (
    <SectionCard title="Admin assistant insight" description="Assistant usage and feedback summary for admin sessions.">
      <div className="space-y-3 text-sm">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)] px-4 py-3">
            <div className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-text-muted)]">Requests today</div>
            <div className="mt-2 text-lg font-semibold text-[var(--fyxvo-text)]">{adminAssistantStats.requestsToday}</div>
          </div>
          <div className="rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)] px-4 py-3">
            <div className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-text-muted)]">Avg response</div>
            <div className="mt-2 text-lg font-semibold text-[var(--fyxvo-text)]">{adminAssistantStats.averageResponseTimeMs}ms</div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)] px-4 py-3">
            <div className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-text-muted)]">Failures today</div>
            <div className="mt-2 text-lg font-semibold text-[var(--fyxvo-text)]">{adminAssistantStats.failedRequestsToday}</div>
          </div>
          <div className="rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)] px-4 py-3">
            <div className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-text-muted)]">500s today</div>
            <div className="mt-2 text-lg font-semibold text-[var(--fyxvo-text)]">{adminAssistantStats.internalFailuresToday}</div>
          </div>
          <div className="rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)] px-4 py-3">
            <div className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-text-muted)]">429s today</div>
            <div className="mt-2 text-lg font-semibold text-[var(--fyxvo-text)]">{adminAssistantStats.rateLimitHitsToday}</div>
          </div>
        </div>
        <div className="rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)] px-4 py-3">
          <div className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-text-muted)]">Feedback</div>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge tone="success">{adminAssistantStats.feedback.positive} helpful</Badge>
            <Badge tone="warning">{adminAssistantStats.feedback.negative} needs work</Badge>
            <Badge tone="neutral">{adminAssistantStats.feedback.withNotes} notes</Badge>
          </div>
          {adminAssistantStats.feedback.recent.length > 0 ? (
            <div className="mt-3 space-y-2">
              {adminAssistantStats.feedback.recent.slice(0, 3).map((entry) => (
                <div key={entry.id} className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-3 py-3 text-xs text-[var(--fyxvo-text-muted)]">
                  <div className="flex items-center justify-between gap-3">
                    <Badge tone={entry.rating === "up" ? "success" : "warning"}>{entry.rating === "up" ? "up" : "down"}</Badge>
                    <span>{shortRelative(entry.createdAt, isHydrated)}</span>
                  </div>
                  {entry.note ? <p className="mt-2 leading-5 text-[var(--fyxvo-text)]">{entry.note}</p> : null}
                </div>
              ))}
            </div>
          ) : null}
        </div>
        {adminAssistantStats.recentFailures.length > 0 ? (
          <div className="rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)] px-4 py-3">
            <div className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-text-muted)]">Recent failures</div>
            <div className="mt-3 space-y-2">
              {adminAssistantStats.recentFailures.map((entry) => (
                <div key={`${entry.statusCode}-${entry.createdAt}`} className="flex items-center justify-between gap-3 text-xs text-[var(--fyxvo-text-muted)]">
                  <span className="font-medium text-[var(--fyxvo-text)]">{entry.statusCode}</span>
                  <span>{entry.durationMs}ms</span>
                  <span>{shortRelative(entry.createdAt, isHydrated)}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </SectionCard>
  ) : null;

  const rightPanel = (
    <div className="space-y-4">
      <SectionCard
        title="Workspace context"
        description="Grounded project information used to keep assistant answers specific to your current setup."
      >
        {workspaceContextContent}
      </SectionCard>

      <SectionCard title="Usage and availability" description="Current model, capacity window, and live gateway context.">
        {usageAvailabilityContent}
      </SectionCard>

      <SectionCard title="Quick actions" description="Jump straight into the next developer task.">
        {quickActionsContent}
      </SectionCard>

      <SectionCard title="Related docs" description="Stable section links the assistant can target directly.">
        {relatedDocsContent}
      </SectionCard>

      <SectionCard
        title="Developer debug mode"
        description="Compact diagnostics for context, docs matches, and inferred quick actions. No chain of thought is shown."
        action={
          <button
            type="button"
            onClick={() => setDebugMode((current) => !current)}
            className={cn(
              "inline-flex rounded-full border px-3 py-1.5 text-xs font-medium transition",
              debugMode
                ? "border-brand-500/40 bg-brand-500/10 text-[var(--fyxvo-brand)]"
                : "border-[var(--fyxvo-border)] text-[var(--fyxvo-text-muted)] hover:text-[var(--fyxvo-text)]"
            )}
          >
            {debugMode ? "Enabled" : "Enable"}
          </button>
        }
      >
        {developerDebugContent}
      </SectionCard>

      {adminAssistantInsightSection}
    </div>
  );

  const homePanel = (
    <div className="grid h-full min-h-0 gap-4 overflow-y-auto px-4 py-4 sm:px-6 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="rounded-[1.75rem] bg-[linear-gradient(160deg,rgba(249,115,22,0.18),rgba(15,23,42,0.06)_45%,rgba(255,255,255,0.02))] p-6 shadow-[0_10px_40px_rgba(15,23,42,0.08)] ring-1 ring-white/10">
        <div className="max-w-xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">
            <SparklesIcon className="h-3.5 w-3.5 text-[var(--fyxvo-brand)]" />
            Guided support
          </div>
          <h2 className="mt-5 text-3xl font-semibold tracking-tight text-[var(--fyxvo-text)] sm:text-4xl">
            Ask Fyxvo about setup, funding, relay flow, or live project state.
          </h2>
          <p className="mt-3 text-sm leading-7 text-[var(--fyxvo-text-muted)] sm:text-base">
            A calmer, more guided assistant experience for real developer work. Start with a prompt, jump to the right tool,
            or open an existing conversation when you want to continue.
          </p>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)]/70 px-4 py-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">Availability</div>
            <div className="mt-2 text-lg font-semibold text-[var(--fyxvo-text)]">
              {assistantAvailable === false ? "Unavailable" : "Operational"}
            </div>
          </div>
          <div className="rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)]/70 px-4 py-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">Messages left</div>
            <div className="mt-2 text-lg font-semibold text-[var(--fyxvo-text)]">{usageRemaining ?? "—"}</div>
          </div>
          <div className="rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)]/70 px-4 py-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">Current project</div>
            <div className="mt-2 truncate text-lg font-semibold text-[var(--fyxvo-text)]">{selectedProject?.name ?? "None selected"}</div>
          </div>
        </div>

        <div className="mt-8">
          <div className="text-sm font-semibold text-[var(--fyxvo-text)]">Suggested ways to start</div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {PROMPT_GROUPS.map((group) => (
              <section key={group.title} className="rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)]/70 px-4 py-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">{group.title}</div>
                <div className="mt-3 space-y-2">
                  {group.items.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => {
                        setComposer((current) => ({ ...current, input: prompt }));
                        setActiveTab("messages");
                      }}
                      className={cn(
                        "w-full rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)] px-4 py-3 text-left text-sm text-[var(--fyxvo-text-muted)] transition",
                        "hover:border-brand-500/30 hover:bg-brand-500/5 hover:text-[var(--fyxvo-text)]",
                        FOCUS_RING_CLASS
                      )}
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="rounded-[1.75rem] border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] px-5 py-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-[var(--fyxvo-text)]">Recent conversations</div>
              <div className="mt-1 text-xs text-[var(--fyxvo-text-muted)]">Open a thread fast, or start a new one.</div>
            </div>
            <Button size="sm" variant="secondary" onClick={() => void handleCreateConversation()}>
              New
            </Button>
          </div>
          <div className="mt-4 space-y-3">
            {conversations.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)] px-4 py-6 text-sm text-[var(--fyxvo-text-muted)]">
                No conversations yet. Start with a guided prompt or ask your own question below.
              </div>
            ) : (
              <>
                {renderConversationSection("Pinned", pinnedConversations, true)}
                {renderConversationSection("Recent", recentConversations.slice(0, 4), true)}
              </>
            )}
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] px-5 py-5">
          <div className="text-sm font-semibold text-[var(--fyxvo-text)]">Helpful destinations</div>
          <div className="mt-1 text-xs text-[var(--fyxvo-text-muted)]">Jump straight into the product surface that matches the question.</div>
          <div className="mt-4 grid gap-3">
            {quickActionsContent}
          </div>
        </div>
      </section>
    </div>
  );

  const messagesPanel = (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--fyxvo-border)] px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-[var(--fyxvo-text)]">
            {activeConversationSummary?.title ?? "New conversation"}
          </div>
          <div className="mt-1 text-xs text-[var(--fyxvo-text-muted)]">
            {activeConversationSummary?.messageCount ?? messages.length} messages
            {rateLimitReset ? ` • Resets ${shortRelative(rateLimitReset, isHydrated)}` : ""}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={() => setSidebarOpen(true)}>
            History
          </Button>
          {(messages.length > 0 || activeConversationId) ? (
            <Button size="sm" variant="ghost" onClick={() => void handleClearConversation()}>
              Clear
            </Button>
          ) : null}
        </div>
      </div>

      <div
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6"
        role="log"
        aria-live="polite"
        aria-relevant="additions text"
        aria-label="Assistant conversation thread"
      >
        {loadingConversation ? (
          <div className="mx-auto max-w-3xl space-y-3">
            {[0, 1, 2].map((item) => (
              <div key={item} className="h-24 animate-pulse rounded-[1.75rem] bg-[var(--fyxvo-panel-soft)]" />
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="mx-auto max-w-3xl space-y-6">
            <div className="rounded-[1.75rem] border border-[var(--fyxvo-border)] bg-[linear-gradient(180deg,var(--fyxvo-panel-soft),var(--fyxvo-panel))] px-6 py-10 text-center shadow-[0_4px_20px_rgba(15,23,42,0.05)]">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-brand-500/20 bg-brand-500/8 text-[var(--fyxvo-brand)]">
                <SparklesIcon className="h-5 w-5" />
              </div>
              <h2 className="mt-5 text-xl font-semibold tracking-tight text-[var(--fyxvo-text)] sm:text-2xl">
                Ask about onboarding, debugging, relay behavior, or live project state
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[var(--fyxvo-text-muted)]">
                Start with one focused question. Fyxvo Assistant keeps the reply readable first, then gives you the next useful action.
              </p>
            </div>

            {isAssistantUnavailable ? (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/8 px-5 py-5">
                <h3 className="text-sm font-semibold text-[var(--fyxvo-text)]">Assistant temporarily unavailable</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--fyxvo-text-muted)]">
                  Your previous conversations are still available. You can keep using docs, playground, and analytics while the assistant service recovers.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <AssistantActionPill href="/docs">Open docs</AssistantActionPill>
                  <AssistantActionPill href="/playground">Open playground</AssistantActionPill>
                  <AssistantActionPill href="/analytics">Open analytics</AssistantActionPill>
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="mx-auto max-w-4xl space-y-7 sm:space-y-8">
            {messages.map((message, index) => (
              <div key={`${message.id}-${index}`} className={message.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div className={cn("max-w-full space-y-2.5 sm:max-w-[92%] lg:max-w-[86%] xl:max-w-[82%]", message.role === "user" ? "items-end" : "items-start")}>
                  <div className={cn("flex items-center gap-2 px-1 text-xs text-[var(--fyxvo-text-muted)]", message.role === "user" ? "justify-end" : "justify-start")}>
                    <span>{message.role === "user" ? "You" : "Fyxvo Assistant"}</span>
                    {message.createdAt ? <span>•</span> : null}
                    {message.createdAt ? <span>{formatTimestamp(message.createdAt, isHydrated)}</span> : null}
                  </div>

                  {composer.isStreaming && index === messages.length - 1 && message.role === "assistant" && message.content === "" ? (
                    <ThinkingBubble />
                  ) : (
                    <div
                      className={cn(
                        "rounded-2xl px-5 py-4",
                        message.role === "user"
                          ? "rounded-tr-sm bg-[linear-gradient(145deg,var(--fyxvo-brand),#ea580c)] text-white shadow-[0_8px_24px_rgba(249,115,22,0.22)]"
                          : "rounded-tl-sm border border-[var(--fyxvo-border)] bg-[linear-gradient(180deg,var(--fyxvo-panel-soft),var(--fyxvo-panel))] shadow-[0_4px_16px_rgba(15,23,42,0.06)]"
                      )}
                    >
                      {message.role === "assistant" ? (
                        <MarkdownContent content={message.content} />
                      ) : (
                        <p className="whitespace-pre-wrap text-sm leading-7">{message.content}</p>
                      )}
                    </div>
                  )}

                  {renderMessageActions(message)}
                </div>
              </div>
            ))}
            <div ref={threadBottomRef} />
          </div>
        )}
      </div>
    </div>
  );

  const helpPanel = (
    <div className="h-full min-h-0 overflow-y-auto px-4 py-4 sm:px-6">
      <div className="mx-auto max-w-5xl space-y-4">
        <div className="rounded-[1.75rem] border border-[var(--fyxvo-border)] bg-[linear-gradient(160deg,rgba(249,115,22,0.14),rgba(15,23,42,0.04))] px-6 py-6">
          <h2 className="text-2xl font-semibold tracking-tight text-[var(--fyxvo-text)]">Help and context</h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--fyxvo-text-muted)]">
            Use project context, docs links, and product shortcuts when you need to move from an answer into action.
          </p>
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          {rightPanel}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-[100dvh] bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.14),transparent_24%),radial-gradient(circle_at_top_right,rgba(14,165,233,0.08),transparent_18%),linear-gradient(180deg,var(--fyxvo-bg),var(--fyxvo-bg-elevated))] px-3 py-3 sm:px-5 sm:py-5">
      <div className="mx-auto flex min-h-[calc(100dvh-1.5rem)] max-w-[1100px] items-center justify-center sm:min-h-[calc(100dvh-2.5rem)]">
        <div className="flex h-[min(900px,calc(100dvh-1.5rem))] w-full flex-col overflow-hidden rounded-[2rem] border border-[var(--fyxvo-border)] bg-[color:var(--fyxvo-panel)] shadow-[0_28px_90px_rgba(15,23,42,0.24)] sm:h-[min(900px,calc(100dvh-2.5rem))]">
          <div className="border-b border-[var(--fyxvo-border)] bg-[linear-gradient(145deg,rgba(249,115,22,0.22),rgba(15,23,42,0.08)_55%,rgba(255,255,255,0.04))] px-4 py-4 sm:px-6 sm:py-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <BrandLogo href="/dashboard" iconClassName="h-9 w-9 sm:h-10 sm:w-10" className="gap-0" />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="truncate text-xl font-semibold tracking-tight text-[var(--fyxvo-text)] sm:text-2xl">
                        Fyxvo Assistant
                      </h1>
                      <Badge tone="neutral" className="normal-case tracking-normal">
                        {rateLimitStatus?.model ?? "Claude"}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-[var(--fyxvo-text-muted)]">
                      Guided help for setup, RPC examples, debugging, and live project context.
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={assistantAvailable === false ? "warning" : "success"} className="normal-case tracking-normal">
                  {assistantAvailable === false ? "Unavailable" : "Available"}
                </Badge>
                <Badge tone="neutral" className="normal-case tracking-normal">
                  {usageRemaining ?? "—"} left
                </Badge>
                <Button size="sm" variant="secondary" onClick={() => setSidebarOpen(true)}>
                  <MenuIcon className="mr-2 h-4 w-4" />
                  History
                </Button>
                <Button size="sm" onClick={() => void handleCreateConversation()}>New</Button>
              </div>
            </div>

            {assistantStatusMessage ? (
              <div className="mt-4">
                <Notice tone={isAssistantUnavailable ? "warning" : "neutral"} title={isAssistantUnavailable ? "Assistant availability" : "Assistant status"}>
                  <span>{assistantStatusMessage}</span>
                </Notice>
              </div>
            ) : null}

            {showOnboardingBanner ? (
              <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="max-w-2xl">
                    <div className="text-sm font-semibold text-[var(--fyxvo-text)]">What the assistant can do</div>
                    <div className="mt-1 text-sm leading-6 text-[var(--fyxvo-text-muted)]">
                      It can explain live Fyxvo behavior, use project context when available, and point you to the right product area without overloading the page.
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={dismissOnboardingBanner}>Dismiss</Button>
                </div>
              </div>
            ) : null}

            {returnBanner ? (
              <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/8 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-200">
                Returned from Playground with your prepared request ready.
              </div>
            ) : null}

            {assistantRequestIssue ? (
              <div className="mt-4">
                <Notice tone="warning" title="Assistant request needs attention">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span>{assistantRequestIssue.message}</span>
                    {assistantRequestIssue.retryable && lastSubmittedPrompt ? (
                      <Button size="sm" variant="secondary" onClick={handleRetryLastPrompt} disabled={composer.isStreaming}>
                        Retry last prompt
                      </Button>
                    ) : null}
                  </div>
                </Notice>
              </div>
            ) : null}

            {!isAuthenticated ? (
              <div className="mt-4">
                <Notice tone="neutral" title="Connect your wallet to use the assistant">
                  <div className="flex flex-wrap items-center gap-3">
                    <span>You need an active wallet session before sending assistant messages.</span>
                    <WalletConnectButton compact />
                  </div>
                </Notice>
              </div>
            ) : null}
          </div>

          <div className="min-h-0 flex-1">
            {activeTab === "home" ? homePanel : activeTab === "messages" ? messagesPanel : helpPanel}
          </div>

          <div className="border-t border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)]/96 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-4 backdrop-blur sm:px-6">
            <div className="mx-auto max-w-4xl">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--fyxvo-text-muted)]">
                <div className="flex flex-wrap items-center gap-3">
                  <span>
                    {rateLimitStatus ? `${rateLimitStatus.messagesUsedThisHour}/${rateLimitStatus.limit} used this hour` : "Usage window unavailable"}
                  </span>
                  <span className="hidden sm:inline">Enter to send · Shift+Enter for newline</span>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <span>{usageRemaining ?? "—"} remaining</span>
                  <span className="hidden sm:inline">{selectedProject ? selectedProject.name : "No project selected"}</span>
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)] p-3 shadow-[0_6px_20px_rgba(15,23,42,0.06)] transition-[border-color] duration-150 focus-within:border-[var(--fyxvo-border-strong)]">
                <div className="flex items-end gap-3">
                  <div className="min-w-0 flex-1">
                    <textarea
                      ref={textareaRef}
                      aria-label="Message Fyxvo Assistant"
                      value={composer.input}
                      onChange={(event) => setComposer((current) => ({ ...current, input: event.target.value }))}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey) {
                          event.preventDefault();
                          void sendMessage(composer.input);
                        }
                      }}
                      placeholder={
                        isAssistantUnavailable
                          ? "The AI assistant is temporarily unavailable"
                          : isAuthenticated
                            ? "Ask about Fyxvo, Solana RPC, debugging, funding, or analytics…"
                            : "Connect wallet to chat"
                      }
                      disabled={!isAuthenticated || composer.isStreaming}
                      rows={2}
                      className={cn(
                        "max-h-[220px] min-h-[52px] w-full resize-none bg-transparent px-1 py-2 text-sm leading-6 text-[var(--fyxvo-text)] outline-none placeholder:text-[var(--fyxvo-text-muted)] disabled:opacity-60",
                        FOCUS_RING_CLASS
                      )}
                    />
                    <div className="flex flex-wrap items-center gap-2 px-1 pb-1 text-[11px] text-[var(--fyxvo-text-muted)]">
                      <span>Paste trace IDs, curl examples, error messages, or wallet addresses directly into the chat.</span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => void sendMessage(composer.input)}
                    disabled={!composer.input.trim() || !isAuthenticated || composer.isStreaming}
                    className={cn("h-11 w-11 shrink-0 rounded-2xl px-0 sm:w-auto sm:px-5", FOCUS_RING_CLASS)}
                    aria-label="Send"
                  >
                    {composer.isStreaming ? (
                      <span className="hidden sm:inline">Streaming…</span>
                    ) : (
                      <>
                        <span className="hidden sm:inline">Send</span>
                        <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4 sm:hidden" aria-hidden="true">
                          <path d="M14.5 8l-12 7V1l12 7z" />
                        </svg>
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2">
                {[
                  { id: "home", label: "Home", icon: HomeIcon },
                  { id: "messages", label: "Messages", icon: SparklesIcon },
                  { id: "help", label: "Help", icon: SupportIcon },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const selected = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id as AssistantTab)}
                      className={cn(
                        "flex min-h-[52px] items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-medium transition",
                        FOCUS_RING_CLASS,
                        selected
                          ? "border-brand-500/30 bg-brand-500/10 text-[var(--fyxvo-brand)]"
                          : "border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)] text-[var(--fyxvo-text-muted)] hover:text-[var(--fyxvo-text)]"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Left drawer — conversations (mobile) ─────────────────── */}
      <div
        className={cn(
          "fixed inset-0 z-[70] transition-opacity duration-200 ease-out",
          sidebarOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        )}
      >
        <button
          type="button"
          aria-label="Close conversation list"
          onClick={() => setSidebarOpen(false)}
          className="absolute inset-0 bg-black/45"
        />
        <aside
          className={cn(
            "absolute inset-y-0 left-0 w-[min(88vw,24rem)] bg-[var(--fyxvo-bg-elevated)] shadow-2xl transition-transform duration-250 ease-out",
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="flex h-full flex-col px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-[var(--fyxvo-text)]">Conversations</div>
                <div className="text-xs text-[var(--fyxvo-text-muted)]">Your saved assistant threads</div>
              </div>
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                aria-label="Close"
                className={cn("rounded-full border border-[var(--fyxvo-border)] p-2 text-[var(--fyxvo-text-muted)]", FOCUS_RING_CLASS)}
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4">
              <Button size="sm" onClick={() => void handleCreateConversation()}>New conversation</Button>
            </div>
            <div className="mt-4">
              <input
                type="search"
                value={conversationQuery}
                onChange={(event) => setConversationQuery(event.target.value)}
                placeholder="Search conversations"
                aria-label="Search assistant conversations"
                className={cn(
                  "h-10 w-full rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-3 text-sm text-[var(--fyxvo-text)] outline-none transition-colors placeholder:text-[var(--fyxvo-text-muted)]",
                  "focus:border-brand-500/40",
                  FOCUS_RING_CLASS
                )}
              />
            </div>
            <div className="mt-4 flex-1 min-h-0 overflow-y-auto overscroll-contain">
              {conversationSearchLoading ? (
                <div className="rounded-2xl border border-dashed border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 py-5 text-sm text-[var(--fyxvo-text-muted)]">
                  Searching conversations…
                </div>
              ) : conversations.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 py-5 text-sm text-[var(--fyxvo-text-muted)]">
                  {conversationQuery.trim()
                    ? "No conversations match that search yet."
                    : "Start a new conversation and it will appear here."}
                </div>
              ) : (
                <div className="space-y-4">
                  {renderConversationSection("Pinned", pinnedConversations, true)}
                  {renderConversationSection(conversationQuery.trim() ? "Matching conversations" : "Recent", recentConversations, true)}
                  {renderConversationSection("Archived", archivedConversations, true)}
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
