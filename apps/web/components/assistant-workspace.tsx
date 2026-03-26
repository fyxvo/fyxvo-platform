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

function shortRelative(value: string): string {
  const diffMs = Date.now() - new Date(value).getTime();
  if (diffMs < 60_000) return "just now";
  if (diffMs < 3_600_000) return `${Math.floor(diffMs / 60_000)}m ago`;
  if (diffMs < 86_400_000) return `${Math.floor(diffMs / 3_600_000)}h ago`;
  return `${Math.floor(diffMs / 86_400_000)}d ago`;
}

function formatTimestamp(value: string | undefined): string {
  if (!value) return "";
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
    <div className="my-4 overflow-hidden rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)] shadow-[0_0_0_1px_rgba(0,0,0,0.02)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--fyxvo-text-muted)]">
            {language}
          </span>
          <span className="rounded-full bg-[var(--fyxvo-panel)] px-2 py-1 text-[11px] text-[var(--fyxvo-text-muted)]">
            {wrap ? "Wrap on" : "Scroll on"}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => setWrap((current) => !current)}
            className={cn(
              "rounded-full border border-[var(--fyxvo-border)] px-3 py-1.5 text-[var(--fyxvo-text-muted)] transition hover:border-brand-500/30 hover:text-[var(--fyxvo-text)]",
              FOCUS_RING_CLASS
            )}
          >
            {wrap ? "Use horizontal scroll" : "Wrap long lines"}
          </button>
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard.writeText(code);
              setCopied(true);
              window.setTimeout(() => setCopied(false), 2000);
            }}
            className={cn(
              "rounded-full border border-[var(--fyxvo-border)] px-3 py-1.5 text-[var(--fyxvo-text-muted)] transition hover:border-brand-500/30 hover:text-[var(--fyxvo-text)]",
              FOCUS_RING_CLASS
            )}
          >
            {copied ? "Copied!" : "Copy"}
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
    <div className="rounded-[1.75rem] rounded-tl-lg border border-[var(--fyxvo-border)] bg-[linear-gradient(180deg,var(--fyxvo-panel-soft),var(--fyxvo-panel))] px-5 py-4 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
      <div className="flex items-center gap-3">
        <div className="flex gap-1.5">
          {[0, 1, 2].map((dot) => (
            <span
              key={dot}
              className="inline-block h-2.5 w-2.5 animate-bounce rounded-full bg-[var(--fyxvo-brand)]/75"
              style={{ animationDelay: `${dot * 0.16}s` }}
            />
          ))}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-2.5 w-24 animate-pulse rounded-full bg-[var(--fyxvo-border)]" />
          <div className="h-2.5 w-full animate-pulse rounded-full bg-[var(--fyxvo-border)]/80" />
          <div className="h-2.5 w-2/3 animate-pulse rounded-full bg-[var(--fyxvo-border)]/70" />
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
    <section className="rounded-[1.75rem] border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-5 shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
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
      "inline-flex items-center rounded-full border border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)] px-3 py-1.5 text-xs font-medium text-[var(--fyxvo-text-muted)] transition hover:border-brand-500/30 hover:text-[var(--fyxvo-text)]",
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
        "group rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)] px-4 py-4 transition hover:border-brand-500/30 hover:bg-brand-500/5",
        FOCUS_RING_CLASS
      )}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-500/10 text-[var(--fyxvo-brand)]">
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [contextDrawerOpen, setContextDrawerOpen] = useState(false);
  const [copiedActionId, setCopiedActionId] = useState<string | null>(null);
  const [debugMode, setDebugMode] = useState(false);
  const [returnBanner, setReturnBanner] = useState<string | null>(null);
  const [showOnboardingBanner, setShowOnboardingBanner] = useState(false);
  const [adminAssistantStats, setAdminAssistantStats] = useState<AssistantAdminStats | null>(null);
  const [feedbackDraft, setFeedbackDraft] = useState<{ messageId: string; rating: "up" | "down"; note: string } | null>(null);
  const [feedbackSubmitting, setFeedbackSubmitting] = useState<string | null>(null);

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

  useEffect(() => {
    threadBottomRef.current?.scrollIntoView({ behavior: messages.length > 0 ? "smooth" : "auto" });
  }, [messages]);

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
      listAssistantConversations(portal.token),
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
      setMessages([...data.item.messages]);
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
    setReturnBanner(null);
    setFeedbackDraft(null);
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

  async function sendMessage(content: string) {
    if (!content.trim() || composer.isStreaming || isAssistantUnavailable || !portal.token) return;

    let conversationId = activeConversationId;
    if (!conversationId) {
      const created = await createAssistantConversation(content.trim().slice(0, 60), portal.token);
      conversationId = created.item.id;
      setActiveConversationId(conversationId);
      setConversations((current) => [created.item, ...current.filter((item) => item.id !== created.item.id)]);
    }

    const userMessage: AssistantConversationMessage = {
      id: `local-user-${Date.now()}`,
      role: "user",
      content: content.trim(),
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

      if (streamError && accumulated.length === 0) {
        replaceLastAssistantMessage(streamError);
      }

      if (conversationId && portal.token) {
        const refreshed = await getAssistantConversation(conversationId, portal.token).catch(() => null);
        if (refreshed?.item) {
          setMessages([...refreshed.item.messages]);
        }
      }

      await refreshConversationState();
    } catch {
      replaceLastAssistantMessage("The assistant connection was interrupted before a response completed. Try again in a moment.");
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

  function toolCardsForMessage(message: AssistantConversationMessage) {
    const actions = inferActionLinks(
      message.content,
      message.suggestedActions,
      detectDocsSection(message.content, message.matchedDocsSection),
      detectPlaygroundInsert(message.content, message.playgroundPayload)
    );

    const cards: ReactNode[] = [];
    for (const action of actions.slice(0, 4)) {
      if (action.kind === "api_keys") {
        cards.push(
          <ToolCard
            key={action.id}
            title="Create or manage API keys"
            description="Open API key controls for the current project and keep gateway credentials scoped."
            href={action.href}
            icon={<KeyIcon className="h-4 w-4" />}
          />
        );
      } else if (action.kind === "funding") {
        cards.push(
          <ToolCard
            key={action.id}
            title="Fund your project"
            description="Move into the funding flow to top up devnet SOL and unlock relay traffic."
            href={action.href}
            icon={<FundingIcon className="h-4 w-4" />}
          />
        );
      } else if (action.kind === "playground") {
        cards.push(
          <ToolCard
            key={action.id}
            title="Open playground"
            description="Use the playground to send or simulate the next request with the assistant-prepared context."
            href={action.href}
            icon={<BeakerIcon className="h-4 w-4" />}
          />
        );
      } else if (action.kind === "analytics") {
        cards.push(
          <ToolCard
            key={action.id}
            title="View analytics"
            description="Jump into request volume, latency, and recent traces for the active project."
            href={action.href}
            icon={<ChartIcon className="h-4 w-4" />}
          />
        );
      } else if (action.kind === "invite") {
        cards.push(
          <ToolCard
            key={action.id}
            title="Invite teammate"
            description="Open team settings and add another wallet to this project workspace."
            href={action.href}
            icon={<SupportIcon className="h-4 w-4" />}
          />
        );
      }
    }

    return cards;
  }

  function renderMessageActions(message: AssistantConversationMessage) {
    if (!message.content || message.role !== "assistant") return null;

    const docsSection = detectDocsSection(message.content, message.matchedDocsSection);
    const docsLink = docsSection ? DOC_LINKS[docsSection] : null;
    const playgroundInsert = detectPlaygroundInsert(message.content, message.playgroundPayload);
    const curlSnippet = extractCurlSnippet(message.content);
    const jsSnippet = extractJavaScriptSnippet(message.content);
    const actions = inferActionLinks(message.content, message.suggestedActions, docsSection, playgroundInsert);
    const toolCards = toolCardsForMessage(message);
    const feedbackId = message.id;

    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <AssistantActionPill onClick={() => copyWithToast(message.content, `copy-${feedbackId}`)}>
            {copiedActionId === `copy-${feedbackId}` ? "Copied!" : "Copy"}
          </AssistantActionPill>
          <AssistantActionPill onClick={() => copyWithToast(message.content, `markdown-${feedbackId}`)}>
            {copiedActionId === `markdown-${feedbackId}` ? "Markdown copied!" : "Copy as markdown"}
          </AssistantActionPill>
          {curlSnippet ? (
            <AssistantActionPill onClick={() => copyWithToast(curlSnippet, `curl-${feedbackId}`)}>
              {copiedActionId === `curl-${feedbackId}` ? "curl copied!" : "Copy curl"}
            </AssistantActionPill>
          ) : null}
          {jsSnippet ? (
            <AssistantActionPill onClick={() => copyWithToast(jsSnippet, `js-${feedbackId}`)}>
              {copiedActionId === `js-${feedbackId}` ? "JS copied!" : "Copy JS example"}
            </AssistantActionPill>
          ) : null}
          {playgroundInsert ? (
            <AssistantActionPill onClick={() => insertIntoPlayground(message)}>Open in playground</AssistantActionPill>
          ) : null}
          {docsLink ? <AssistantActionPill href={docsLink.href}>{docsLink.label}</AssistantActionPill> : null}
          {actions
            .filter((action) => !docsLink || action.href !== docsLink.href)
            .slice(0, 3)
            .map((action) => (
              <AssistantActionPill key={action.id} href={action.href}>
                {action.label}
              </AssistantActionPill>
            ))}
        </div>

        {toolCards.length > 0 ? <div className="grid gap-3 md:grid-cols-2">{toolCards}</div> : null}

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)] px-4 py-3">
          <div className="flex items-center gap-2 text-xs text-[var(--fyxvo-text-muted)]">
            <span>Response feedback</span>
            {message.feedback ? <Badge tone={feedbackTone(message.feedback)}>{message.feedback.rating === "up" ? "Helpful" : "Needs work"}</Badge> : null}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Thumbs up"
              onClick={() => setFeedbackDraft({ messageId: message.id, rating: "up", note: message.feedback?.note ?? "" })}
              className="rounded-full border border-[var(--fyxvo-border)] px-3 py-1.5 text-xs text-[var(--fyxvo-text-muted)] transition hover:border-brand-500/30 hover:text-[var(--fyxvo-text)]"
            >
              👍
            </button>
            <button
              type="button"
              aria-label="Thumbs down"
              onClick={() => setFeedbackDraft({ messageId: message.id, rating: "down", note: message.feedback?.note ?? "" })}
              className="rounded-full border border-[var(--fyxvo-border)] px-3 py-1.5 text-xs text-[var(--fyxvo-text-muted)] transition hover:border-brand-500/30 hover:text-[var(--fyxvo-text)]"
            >
              👎
            </button>
          </div>
        </div>

        {feedbackDraft?.messageId === message.id ? (
          <div className="rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)] px-4 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-[var(--fyxvo-text)]">
                  {feedbackDraft.rating === "up" ? "What worked well?" : "What should be better?"}
                </div>
                <div className="mt-1 text-xs text-[var(--fyxvo-text-muted)]">
                  Optional note for assistant quality review. No hidden reasoning is exposed.
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
              className="mt-3 w-full rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 py-3 text-sm text-[var(--fyxvo-text)] outline-none placeholder:text-[var(--fyxvo-text-muted)] focus:border-brand-500/40"
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

  const rightPanel = (
    <div className="space-y-4">
      <SectionCard
        title="Workspace context"
        description="Grounded project information used to keep assistant answers specific to your current setup."
      >
        {selectedProject ? (
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
        )}
      </SectionCard>

      <SectionCard title="Usage and availability" description="Current model, capacity window, and live gateway context.">
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
            <span className="text-[var(--fyxvo-text)]">{rateLimitReset ? shortRelative(rateLimitReset) : "—"}</span>
          </div>
          <div className="rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)] px-4 py-3 text-xs text-[var(--fyxvo-text-muted)]">
            Pricing now: {PRICING_LAMPORTS.standard.toLocaleString()} lamports standard,{" "}
            {PRICING_LAMPORTS.priority.toLocaleString()} priority, plus {FREE_TIER_REQUESTS.toLocaleString()} free starter requests per project.
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Quick actions" description="Jump straight into the next developer task.">
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
      </SectionCard>

      <SectionCard title="Related docs" description="Stable section links the assistant can target directly.">
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
      </SectionCard>

      {adminAssistantStats ? (
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
                        <span>{shortRelative(entry.createdAt)}</span>
                      </div>
                      {entry.note ? <p className="mt-2 leading-5 text-[var(--fyxvo-text)]">{entry.note}</p> : null}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </SectionCard>
      ) : null}
    </div>
  );

  return (
    <div className="-mx-4 -mt-8 min-h-[calc(100dvh-4rem)] bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.12),transparent_28%),radial-gradient(circle_at_top_right,rgba(14,165,233,0.08),transparent_24%),linear-gradient(180deg,var(--fyxvo-bg),var(--fyxvo-bg-elevated))] sm:-mx-6 lg:-mx-8">
      <div className="mx-auto h-full max-w-[1800px] px-3 pb-4 pt-3 sm:px-5 lg:px-6">
        <div className="grid h-full gap-4 xl:grid-cols-[320px,minmax(0,1fr),320px]">
          <aside
            className="hidden xl:flex xl:min-h-0 xl:flex-col xl:rounded-[2rem] xl:border xl:border-[var(--fyxvo-border)] xl:bg-[var(--fyxvo-panel)] xl:shadow-[0_20px_70px_rgba(15,23,42,0.08)]"
            aria-label="Assistant conversations"
          >
            <div className="border-b border-[var(--fyxvo-border)] px-5 py-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-text-muted)]">Conversations</p>
                  <p className="mt-1 text-sm text-[var(--fyxvo-text-muted)]">Server-backed history for the latest 50 messages.</p>
                </div>
                <Button size="sm" variant="secondary" onClick={() => void handleCreateConversation()}>
                  New
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-4">
              {conversations.length === 0 ? (
                <div className="rounded-[1.5rem] border border-dashed border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)] px-4 py-5 text-sm text-[var(--fyxvo-text-muted)]">
                  <p className="font-medium text-[var(--fyxvo-text)]">No saved conversations yet</p>
                  <p className="mt-1">Start a new thread and Fyxvo will keep it available across refreshes.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {conversations.map((conversation) => (
                    <button
                      key={conversation.id}
                      type="button"
                      onClick={() => void loadConversation(conversation.id)}
                      aria-current={activeConversationId === conversation.id ? "page" : undefined}
                      className={cn(
                        "w-full rounded-[1.35rem] border px-4 py-4 text-left transition",
                        FOCUS_RING_CLASS,
                        activeConversationId === conversation.id
                          ? "border-brand-500/30 bg-brand-500/10"
                          : "border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)] hover:border-brand-500/20"
                      )}
                    >
                      <div className="line-clamp-2 text-sm font-semibold text-[var(--fyxvo-text)]">{conversation.title}</div>
                      <div className="mt-2 flex items-center justify-between gap-2 text-xs text-[var(--fyxvo-text-muted)]">
                        <span>{conversation.messageCount} messages</span>
                        <span>{shortRelative(conversation.lastMessageAt)}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </aside>

          <div className="flex min-h-0 flex-col rounded-[2rem] border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] shadow-[0_20px_70px_rgba(15,23,42,0.08)]">
            <div className="sticky top-0 z-20 border-b border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)]/95 px-4 pb-4 pt-4 backdrop-blur sm:px-6 sm:pt-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="mb-3 flex items-center gap-2 xl:hidden">
                    <Button size="sm" variant="secondary" onClick={() => setSidebarOpen(true)}>
                      <MenuIcon className="h-4 w-4" />
                      Conversations
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => setContextDrawerOpen(true)} className="lg:hidden">
                      <SparklesIcon className="h-4 w-4" />
                      Context
                    </Button>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <BrandLogo href="/assistant" iconClassName="h-12 w-12" className="gap-3" />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h1 className="font-display text-2xl font-semibold tracking-tight text-[var(--fyxvo-text)] sm:text-3xl">
                          Fyxvo Assistant
                        </h1>
                        <Badge tone="neutral" className="normal-case tracking-normal">
                          {rateLimitStatus?.model ?? "Claude"}
                        </Badge>
                      </div>
                      <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--fyxvo-text-muted)]">
                        Workspace-aware help for onboarding, Solana RPC examples, debugging, docs, and live Fyxvo project state.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={assistantAvailable === false ? "warning" : "success"} className="normal-case tracking-normal">
                    {assistantAvailable === false ? "Unavailable" : "Available"}
                  </Badge>
                  <Badge tone="neutral" className="normal-case tracking-normal">
                    {usageRemaining ?? "—"} messages left
                  </Badge>
                  {messages.length > 0 || activeConversationId ? (
                    <Button size="sm" variant="secondary" onClick={() => void handleClearConversation()}>
                      Clear
                    </Button>
                  ) : null}
                  <Button size="sm" onClick={() => void handleCreateConversation()}>
                    New conversation
                  </Button>
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
                <div className="mt-4 rounded-[1.5rem] border border-brand-500/20 bg-brand-500/10 px-4 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="max-w-2xl">
                      <div className="text-sm font-semibold text-[var(--fyxvo-text)]">What the assistant can help with</div>
                      <div className="mt-1 text-sm leading-6 text-[var(--fyxvo-text-muted)]">
                        It can explain Fyxvo and Solana RPC workflows, use real project context when available, and prepare examples for docs or playground. It cannot guarantee code correctness, and every response should be tested before production use.
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" onClick={dismissOnboardingBanner}>
                      Dismiss
                    </Button>
                  </div>
                </div>
              ) : null}

              {returnBanner ? (
                <div className="mt-4 rounded-[1.5rem] border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-200">
                  Returned from Playground with your prepared request ready.
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

            <div className="xl:hidden">
              <details className="border-b border-[var(--fyxvo-border)]">
                <summary className={cn("cursor-pointer list-none px-4 py-3 text-sm font-semibold text-[var(--fyxvo-text)] sm:px-6", FOCUS_RING_CLASS)}>
                  Workspace context and quick actions
                </summary>
                <div className="px-4 pb-4 sm:px-6">{rightPanel}</div>
              </details>
            </div>

            <div className="flex min-h-0 flex-1 flex-col">
              <div
                className="flex-1 overflow-y-auto px-4 py-5 sm:px-6"
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
                  <div className="mx-auto max-w-4xl space-y-6">
                    <div className="rounded-[2rem] border border-[var(--fyxvo-border)] bg-[linear-gradient(180deg,var(--fyxvo-panel-soft),var(--fyxvo-panel))] px-6 py-8 text-center shadow-[0_20px_60px_rgba(15,23,42,0.05)]">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-brand-500/10 text-[var(--fyxvo-brand)]">
                        <SparklesIcon className="h-6 w-6" />
                      </div>
                      <h2 className="mt-4 font-display text-2xl font-semibold tracking-tight text-[var(--fyxvo-text)]">
                        Ask about onboarding, debugging, relay behavior, or live project state
                      </h2>
                      <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-[var(--fyxvo-text-muted)]">
                        The assistant can help you reach first traffic faster, explain current platform behavior honestly, and prepare examples you can send straight into the playground.
                      </p>
                    </div>

                    {isAssistantUnavailable ? (
                      <div className="rounded-[1.75rem] border border-amber-500/20 bg-amber-500/10 px-5 py-5">
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

                    <div className="grid gap-4 lg:grid-cols-2">
                      {PROMPT_GROUPS.map((group) => (
                        <section key={group.title} className="rounded-[1.75rem] border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-5 py-5">
                          <div className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-text-muted)]">{group.title}</div>
                          <div className="mt-4 space-y-2">
                            {group.items.map((prompt) => (
                              <button
                                key={prompt}
                                type="button"
                                onClick={() => {
                                  if (isAuthenticated && !isAssistantUnavailable) {
                                    void sendMessage(prompt);
                                  } else {
                                    setComposer((current) => ({ ...current, input: prompt }));
                                  }
                                }}
                                className={cn(
                                  "w-full rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)] px-4 py-3 text-left text-sm text-[var(--fyxvo-text-muted)] transition hover:border-brand-500/30 hover:bg-brand-500/5 hover:text-[var(--fyxvo-text)]",
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
                ) : (
                  <div className="mx-auto max-w-4xl space-y-7 sm:space-y-8">
                    {messages.map((message, index) => (
                      <div key={`${message.id}-${index}`} className={message.role === "user" ? "flex justify-end" : "flex justify-start"}>
                        <div className={cn("max-w-[95%] space-y-2.5 sm:max-w-[88%]", message.role === "user" ? "items-end" : "items-start")}>
                          <div className={cn("flex items-center gap-2 px-1 text-xs text-[var(--fyxvo-text-muted)]", message.role === "user" ? "justify-end" : "justify-start")}>
                            <span>{message.role === "user" ? "You" : "Fyxvo Assistant"}</span>
                            {message.createdAt ? <span>•</span> : null}
                            {message.createdAt ? <span>{formatTimestamp(message.createdAt)}</span> : null}
                          </div>

                          {composer.isStreaming && index === messages.length - 1 && message.role === "assistant" && message.content === "" ? (
                            <ThinkingBubble />
                          ) : (
                            <div
                              className={cn(
                                "rounded-[1.85rem] px-5 py-4 shadow-[0_18px_60px_rgba(15,23,42,0.06)]",
                                message.role === "user"
                                  ? "rounded-tr-lg bg-[linear-gradient(180deg,var(--fyxvo-brand),#ea580c)] text-white"
                                  : "rounded-tl-lg border border-[var(--fyxvo-border)] bg-[linear-gradient(180deg,var(--fyxvo-panel-soft),var(--fyxvo-panel))]"
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

              <div className="border-t border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)]/95 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4 backdrop-blur sm:px-6">
                <div className="mx-auto max-w-4xl">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--fyxvo-text-muted)]">
                    <div className="flex flex-wrap items-center gap-3">
                      <span>
                        {rateLimitStatus ? `${rateLimitStatus.messagesUsedThisHour}/${rateLimitStatus.limit} used this hour` : "Usage window unavailable"}
                      </span>
                      <span>Enter to send · Shift+Enter for newline</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span>{usageRemaining ?? "—"} messages remaining</span>
                      <span>{rateLimitReset ? `Resets ${shortRelative(rateLimitReset)}` : "Reset time unavailable"}</span>
                    </div>
                  </div>

                  <div className="rounded-[1.85rem] border border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)] p-3 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
                    <div className="flex items-end gap-3">
                      <button
                        type="button"
                        disabled
                        className={cn(
                          "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] text-[var(--fyxvo-text-muted)] opacity-70",
                          FOCUS_RING_CLASS
                        )}
                        aria-label="Attachments coming soon"
                        title="Attachments coming soon"
                      >
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M21.4 11.1l-8.6 8.6a5 5 0 11-7.1-7.1l9.2-9.2a3.5 3.5 0 015 5L9.8 18.5a2 2 0 11-2.8-2.8l8.5-8.5" />
                        </svg>
                      </button>
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
                          disabled={!isAuthenticated || composer.isStreaming || isAssistantUnavailable}
                          rows={1}
                          className={cn(
                            "max-h-[220px] min-h-[52px] w-full resize-none bg-transparent px-1 py-2 text-sm leading-6 text-[var(--fyxvo-text)] outline-none placeholder:text-[var(--fyxvo-text-muted)] disabled:opacity-60",
                            FOCUS_RING_CLASS
                          )}
                        />
                        <div className="flex flex-wrap items-center gap-2 px-1 pb-1 text-[11px] text-[var(--fyxvo-text-muted)]">
                          <span>Attachment support is coming soon.</span>
                          {!selectedProject ? <span>No project context selected yet.</span> : null}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => void sendMessage(composer.input)}
                        disabled={!composer.input.trim() || !isAuthenticated || composer.isStreaming || isAssistantUnavailable}
                        className={cn("h-11 shrink-0 rounded-2xl px-5", FOCUS_RING_CLASS)}
                      >
                        {composer.isStreaming ? "Streaming…" : "Send"}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <aside className="hidden xl:block">
            <div className="sticky top-6 max-h-[calc(100dvh-7rem)] overflow-y-auto pr-1">{rightPanel}</div>
          </aside>
        </div>

        <div
          className={cn(
            "fixed inset-0 z-[70] xl:hidden transition-opacity duration-200 ease-out",
            sidebarOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
          )}
        >
          <button
            type="button"
            aria-label="Close conversation list"
            onClick={() => setSidebarOpen(false)}
            className="absolute inset-0 bg-black/45"
          />
          <aside className={cn("absolute inset-y-0 left-0 w-[min(86vw,22rem)] bg-[var(--fyxvo-bg)] shadow-2xl transition-transform duration-200 ease-out", sidebarOpen ? "translate-x-0" : "-translate-x-full")}>
            <div className="flex h-full flex-col px-4 pb-[env(safe-area-inset-bottom)] pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-[var(--fyxvo-text)]">Conversations</div>
                  <div className="text-xs text-[var(--fyxvo-text-muted)]">Your saved assistant threads</div>
                </div>
                <button type="button" onClick={() => setSidebarOpen(false)} aria-label="Close" className={cn("rounded-full border border-[var(--fyxvo-border)] p-2 text-[var(--fyxvo-text-muted)]", FOCUS_RING_CLASS)}>
                  <CloseIcon className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-4">
                <Button size="sm" onClick={() => void handleCreateConversation()}>
                  New conversation
                </Button>
              </div>
              <div className="mt-4 flex-1 overflow-y-auto">
                <div className="space-y-2">
                  {conversations.map((conversation) => (
                    <button
                      key={conversation.id}
                      type="button"
                      onClick={() => void loadConversation(conversation.id)}
                      aria-current={activeConversationId === conversation.id ? "page" : undefined}
                      className={cn(
                        "w-full rounded-2xl border px-4 py-4 text-left",
                        FOCUS_RING_CLASS,
                        activeConversationId === conversation.id
                          ? "border-brand-500/30 bg-brand-500/10"
                          : "border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)]"
                      )}
                    >
                      <div className="line-clamp-2 text-sm font-semibold text-[var(--fyxvo-text)]">{conversation.title}</div>
                      <div className="mt-1 text-xs text-[var(--fyxvo-text-muted)]">{shortRelative(conversation.lastMessageAt)}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </aside>
        </div>

        <div
          className={cn(
            "fixed inset-0 z-[70] lg:hidden transition-opacity duration-200 ease-out",
            contextDrawerOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
          )}
        >
          <button
            type="button"
            aria-label="Close assistant context"
            onClick={() => setContextDrawerOpen(false)}
            className="absolute inset-0 bg-black/45"
          />
          <aside className={cn("absolute inset-y-0 right-0 w-[min(88vw,24rem)] bg-[var(--fyxvo-bg)] shadow-2xl transition-transform duration-200 ease-out", contextDrawerOpen ? "translate-x-0" : "translate-x-full")}>
            <div className="flex h-full flex-col px-4 pb-[env(safe-area-inset-bottom)] pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-[var(--fyxvo-text)]">Assistant context</div>
                  <div className="text-xs text-[var(--fyxvo-text-muted)]">Usage, project state, and quick actions</div>
                </div>
                <button type="button" onClick={() => setContextDrawerOpen(false)} aria-label="Close" className={cn("rounded-full border border-[var(--fyxvo-border)] p-2 text-[var(--fyxvo-text-muted)]", FOCUS_RING_CLASS)}>
                  <CloseIcon className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-4 flex-1 overflow-y-auto">{rightPanel}</div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
