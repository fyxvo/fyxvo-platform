"use client";

import { useEffect, useState } from "react";
import type React from "react";
import { usePortal } from "../../components/portal-provider";
import { PageHeader } from "../../components/page-header";
import { webEnv } from "../../lib/env";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TicketCategory = "BUG_REPORT" | "SUPPORT_REQUEST" | "ONBOARDING_FRICTION" | "PRODUCT_FEEDBACK";
type TicketPriority = "low" | "normal" | "high" | "urgent";
type TicketStatus = "open" | "in_progress" | "resolved" | "closed";

type SupportCategory =
  | "getting-started"
  | "api-keys"
  | "funding"
  | "gateway"
  | "analytics"
  | "webhooks"
  | "team"
  | "other";

interface SupportTicket {
  readonly id: string;
  readonly subject: string;
  readonly category: string;
  readonly status: TicketStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly resolvedAt: string | null;
  readonly adminResponse: string | null;
  readonly adminRespondedAt: string | null;
  readonly projectId: string | null;
  readonly projectName: string | null;
  readonly projectSlug: string | null;
}

interface FaqItem {
  readonly category: SupportCategory;
  readonly question: string;
  readonly answer: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATEGORY_LABELS: Record<TicketCategory, string> = {
  BUG_REPORT: "Bug Report",
  SUPPORT_REQUEST: "Support Request",
  ONBOARDING_FRICTION: "Onboarding Friction",
  PRODUCT_FEEDBACK: "Product Feedback",
};

function supportCategoryLabel(value: string): string {
  if (value in CATEGORY_LABELS) {
    return CATEGORY_LABELS[value as TicketCategory];
  }
  if (value === "technical") return "Technical";
  if (value === "billing") return "Billing";
  if (value === "security") return "Security";
  return "General";
}

const PRIORITY_LABELS: Record<TicketPriority, string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
  urgent: "Urgent",
};

const STATUS_STYLES: Record<TicketStatus, { label: string; className: string }> = {
  open: { label: "Open", className: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  in_progress: { label: "In Progress", className: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" },
  resolved: { label: "Resolved", className: "bg-green-500/10 text-green-500 border-green-500/20" },
  closed: {
    label: "Closed",
    className:
      "bg-[var(--fyxvo-text-muted)]/10 text-[var(--fyxvo-text-muted)] border-[var(--fyxvo-text-muted)]/20",
  },
};

const DOCS_FAQ: FaqItem[] = [
  {
    category: "getting-started",
    question: "How do I create my first project?",
    answer:
      'Connect a wallet, open the Dashboard, and create a project. Fyxvo will prepare the project record and guide you through the activation transaction so the project becomes live on devnet.',
  },
  {
    category: "getting-started",
    question: "What is fyxvo and what does it do?",
    answer:
      "Fyxvo is a Solana devnet control plane for funded RPC access. It combines project activation, funding, API keys, request traces, alerts, and assistant workflows around a managed relay.",
  },
  {
    category: "getting-started",
    question: "Which Solana networks are supported?",
    answer:
      "The current hosted deployment is devnet-only. Mainnet is not publicly launched yet, and the product copy, pricing, and operational flow are all aligned to the devnet private alpha.",
  },
  {
    category: "api-keys",
    question: "How do I generate an API key?",
    answer:
      'Open your project workspace and create a key from the API key controls. Keys are project-scoped, carry explicit scopes, and can be revoked or rotated whenever you need to change access.',
  },
  {
    category: "api-keys",
    question: "My API key stopped working — what should I check?",
    answer:
      "Check that the key is still active, the project has funded balance available, and the request is using the correct relay path. Also confirm the key is being sent in the x-api-key header.",
  },
  {
    category: "api-keys",
    question: "Can I restrict an API key to specific IP addresses?",
    answer:
      "IP-based restrictions are not part of the default public alpha flow today. If you need tighter access controls around key usage, reach out and we can talk through the current options.",
  },
  {
    category: "funding",
    question: "How do I top up my project balance?",
    answer:
      "Connect your wallet, open the funding flow for the project, and sign the top-up transaction with devnet SOL. The balance updates after confirmation and becomes available to the relay immediately afterward.",
  },
  {
    category: "funding",
    question: "What does 0.05 SOL get me in request volume?",
    answer:
      "At the standard 1,000-lamport rate, 0.05 SOL covers roughly 50,000 standard requests. Compute-heavy and priority traffic consume more, so your exact runway depends on the mix you send.",
  },
  {
    category: "funding",
    question: "Is there a free tier or trial?",
    answer:
      "There is no free tier in the current alpha. The live path is to fund a project with devnet SOL so request accounting, alerts, and relay behavior all reflect the real product flow.",
  },
  {
    category: "gateway",
    question: "What RPC methods does the gateway support?",
    answer:
      "Fyxvo supports the standard Solana JSON-RPC flow through the relay, with request classification layered on top for standard, compute-heavy, and priority traffic. The docs call out the main paths and examples.",
  },
  {
    category: "gateway",
    question: "What is the rate limit on the gateway?",
    answer:
      "Rate controls are enforced at the project and key level. The exact ceiling depends on the current alpha posture and the route you are using, so if you need sustained higher throughput it is best to contact us directly.",
  },
  {
    category: "analytics",
    question: "How do I view request analytics for my project?",
    answer:
      "Open the Analytics view for your project. You can review request volume, success and failure rates, method breakdowns, latency trends, and related operational signals from the same workspace.",
  },
  {
    category: "webhooks",
    question: "How do webhooks work on fyxvo?",
    answer:
      "Fyxvo can send project events such as low balance, key changes, and delivery failures to an HTTPS endpoint you configure. Add the destination in project settings, choose the events you want, and test deliveries from the workspace.",
  },
  {
    category: "webhooks",
    question: "How do I verify webhook signatures?",
    answer:
      "Each delivery includes an x-fyxvo-signature header. Compute the HMAC-SHA256 digest of the raw request body with your webhook secret and compare it to that header before accepting the payload.",
  },
  {
    category: "team",
    question: "Can I invite team members to my project?",
    answer:
      "Yes. Project owners can invite teammates from settings, review pending invitations, and manage collaboration around keys, notes, webhooks, alerts, and other project operations.",
  },
];

interface SupportCategoryDef {
  readonly id: SupportCategory;
  readonly label: string;
  readonly icon: React.ReactNode;
}

const SUPPORT_CATEGORIES: SupportCategoryDef[] = [
  {
    id: "getting-started",
    label: "Getting Started",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" />
        <path d="M10 7v3l2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "api-keys",
    label: "API Keys",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path
          d="M8 10a4 4 0 1 1 8 0 4 4 0 0 1-8 0Z"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path d="M4 16l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M3 15h2v2H3z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: "funding",
    label: "Funding & Billing",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <rect x="2" y="5" width="16" height="11" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M2 9h16" stroke="currentColor" strokeWidth="1.5" />
        <path d="M6 13h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "gateway",
    label: "Gateway & RPC",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path
          d="M3 10a7 7 0 1 1 14 0A7 7 0 0 1 3 10Z"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path d="M10 6v4l3 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "analytics",
    label: "Analytics",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <rect x="3" y="11" width="3" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
        <rect x="8.5" y="7" width="3" height="10" rx="1" stroke="currentColor" strokeWidth="1.5" />
        <rect x="14" y="3" width="3" height="14" rx="1" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    id: "webhooks",
    label: "Webhooks & Alerts",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path
          d="M4 10a6 6 0 0 1 6-6"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M16 10a6 6 0 0 1-6 6"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <circle cx="10" cy="10" r="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M10 4V2M10 18v-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "team",
    label: "Team & Collaboration",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <circle cx="8" cy="7" r="3" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M2 17c0-3.314 2.686-5 6-5s6 1.686 6 5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path d="M14 5a3 3 0 1 1 0 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M18 17c0-2-1.343-4-4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "other",
    label: "Other",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M10 9c0-1.105.895-2 2-2s2 .895 2 2c0 .828-.504 1.544-1.232 1.857L10 14"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <circle cx="10" cy="16" r="1" fill="currentColor" />
      </svg>
    ),
  },
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { readonly status: TicketStatus }) {
  const { label, className } = STATUS_STYLES[status];
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

const SUBJECT_MIN = 10;
const SUBJECT_MAX = 200;
const DESC_MIN = 50;
const DESC_MAX = 5000;

function isSubjectValid(v: string) {
  return v.trim().length >= SUBJECT_MIN && v.trim().length <= SUBJECT_MAX;
}
function isDescriptionValid(v: string) {
  return v.trim().length >= DESC_MIN && v.trim().length <= DESC_MAX;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function SupportPage() {
  const portal = usePortal();

  // Ticket form state
  const [category, setCategory] = useState<TicketCategory>("SUPPORT_REQUEST");
  const [priority, setPriority] = useState<TicketPriority>("normal");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [subjectBlurred, setSubjectBlurred] = useState(false);
  const [descriptionBlurred, setDescriptionBlurred] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [statusFilter, setStatusFilter] = useState<TicketStatus | "all">("all");

  // Search state
  const [searchQuery, setSearchQuery] = useState("");

  // Category selection state
  const [selectedSupportCategory, setSelectedSupportCategory] = useState<SupportCategory | null>(null);

  const formValid = isSubjectValid(subject) && isDescriptionValid(description);

  const subjectError =
    subjectBlurred && !isSubjectValid(subject)
      ? subject.trim().length < SUBJECT_MIN
        ? `Subject must be at least ${SUBJECT_MIN} characters`
        : `Subject must be at most ${SUBJECT_MAX} characters`
      : null;

  const descError =
    descriptionBlurred && !isDescriptionValid(description)
      ? description.trim().length < DESC_MIN
        ? `Description must be at least ${DESC_MIN} characters`
        : `Description must be at most ${DESC_MAX} characters`
      : null;

  // Search results: require 3+ chars
  const searchResults: FaqItem[] =
    searchQuery.trim().length >= 3
      ? DOCS_FAQ.filter(
          (item) =>
            item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.category.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : [];

  // FAQs for selected support category (show first 3)
  const categoryFaqs: FaqItem[] =
    selectedSupportCategory !== null
      ? DOCS_FAQ.filter((item) => item.category === selectedSupportCategory).slice(0, 3)
      : [];

  const user = portal.user;

  useEffect(() => {
    if (!portal.token) return;
    fetch(new URL("/v1/support/tickets", webEnv.apiBaseUrl), {
      headers: { authorization: `Bearer ${portal.token}` },
      cache: "no-store",
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((body: { tickets?: SupportTicket[] } | null) => {
        setTickets(body?.tickets ?? []);
      })
      .catch(() => undefined);
  }, [portal.token]);

  if (portal.walletPhase !== "authenticated" || !portal.token) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-sm text-[var(--fyxvo-text-muted)]">
          Sign in to submit a support ticket.
        </p>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formValid) return;
    if (!portal.token || !user) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch(new URL("/v1/support/tickets", webEnv.apiBaseUrl), {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${portal.token}`,
        },
        body: JSON.stringify({
          projectId: portal.selectedProject?.id,
          category:
            category === "SUPPORT_REQUEST"
              ? "technical"
              : category === "BUG_REPORT"
                ? "technical"
                : category === "ONBOARDING_FRICTION"
                  ? "general"
                  : "general",
          priority,
          subject,
          description,
        }),
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const newTicket = (await response.json()) as SupportTicket;

      setTickets((prev) => [newTicket, ...prev]);
      setSubject("");
      setDescription("");
      setSubjectBlurred(false);
      setDescriptionBlurred(false);
      setCategory("SUPPORT_REQUEST");
      setPriority("normal");
      setSubmitted(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to submit ticket. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const filteredTickets = tickets.filter((ticket) => statusFilter === "all" || ticket.status === statusFilter);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Help"
        title="Support"
        description="Search answers, submit a ticket, and track support updates."
      />

      {submitted && (
        <div className="rounded-lg border border-green-500/20 bg-green-500/5 px-4 py-3 text-sm text-green-500">
          Your ticket has been submitted. Our team will follow up via the contact on file.
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Search box */}
      {/* ------------------------------------------------------------------ */}
      <div className="rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg-elevated)]">
        <div className="border-b border-[var(--fyxvo-border)] px-6 py-4">
          <h2 className="text-sm font-semibold text-[var(--fyxvo-text)]">Search Help Articles</h2>
          <p className="mt-0.5 text-xs text-[var(--fyxvo-text-muted)]">
            Search the help library for setup, funding, keys, webhooks, and alerts.
          </p>
        </div>
        <div className="px-6 py-5">
          <div className="relative">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--fyxvo-text-muted)]"
              width="16"
              height="16"
              viewBox="0 0 20 20"
              fill="none"
              aria-hidden="true"
            >
              <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.5" />
              <path d="M14 14l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search FAQ — e.g. &quot;api key&quot;, &quot;funding&quot;, &quot;webhook&quot;…"
              className="w-full rounded-md border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] py-2.5 pl-9 pr-4 text-sm text-[var(--fyxvo-text)] placeholder:text-[var(--fyxvo-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--fyxvo-brand)]"
            />
          </div>

          {searchQuery.trim().length >= 1 && searchQuery.trim().length < 3 && (
            <p className="mt-2 text-xs text-[var(--fyxvo-text-muted)]">
              Type at least 3 characters to search…
            </p>
          )}

          {searchResults.length > 0 && (
            <ul className="mt-4 space-y-3">
              {searchResults.map((item) => (
                <li
                  key={item.question}
                  className="rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 py-3"
                >
                  <p className="text-xs font-semibold text-[var(--fyxvo-text)]">{item.question}</p>
                  <p className="mt-1 text-xs leading-relaxed text-[var(--fyxvo-text-muted)]">
                    {item.answer}
                  </p>
                </li>
              ))}
            </ul>
          )}

          {searchQuery.trim().length >= 3 && searchResults.length === 0 && (
            <p className="mt-3 text-xs text-[var(--fyxvo-text-muted)]">
              No results found. Try a different term or submit a ticket below.
            </p>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Category selection */}
      {/* ------------------------------------------------------------------ */}
      <div className="rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg-elevated)]">
        <div className="border-b border-[var(--fyxvo-border)] px-6 py-4">
          <h2 className="text-sm font-semibold text-[var(--fyxvo-text)]">What do you need help with?</h2>
          <p className="mt-0.5 text-xs text-[var(--fyxvo-text-muted)]">
            Select a category to see relevant answers before submitting a ticket.
          </p>
        </div>
        <div className="px-6 py-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {SUPPORT_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() =>
                  setSelectedSupportCategory((prev) => (prev === cat.id ? null : cat.id))
                }
                className={`flex flex-col items-center gap-2 rounded-lg border px-3 py-4 text-center text-xs font-medium transition ${
                  selectedSupportCategory === cat.id
                    ? "border-[var(--fyxvo-brand)] bg-[var(--fyxvo-brand)]/10 text-[var(--fyxvo-brand)]"
                    : "border-[var(--fyxvo-border)] text-[var(--fyxvo-text-muted)] hover:border-[var(--fyxvo-brand)]/40 hover:text-[var(--fyxvo-text)]"
                }`}
              >
                <span className="opacity-80">{cat.icon}</span>
                {cat.label}
              </button>
            ))}
          </div>

          {categoryFaqs.length > 0 && (
            <div className="mt-5 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--fyxvo-text-muted)]">
                Relevant articles
              </p>
              <ul className="space-y-3">
                {categoryFaqs.map((item) => (
                  <li
                    key={item.question}
                    className="rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 py-3"
                  >
                    <p className="text-xs font-semibold text-[var(--fyxvo-text)]">{item.question}</p>
                    <p className="mt-1 text-xs leading-relaxed text-[var(--fyxvo-text-muted)]">
                      {item.answer}
                    </p>
                  </li>
                ))}
              </ul>
              <p className="pt-1 text-xs text-[var(--fyxvo-text-muted)]">
                Didn&apos;t find your answer? Fill in the ticket form below.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* New ticket form */}
      {/* ------------------------------------------------------------------ */}
      <div className="rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg-elevated)]">
        <div className="border-b border-[var(--fyxvo-border)] px-6 py-4">
          <h2 className="text-sm font-semibold text-[var(--fyxvo-text)]">New Ticket</h2>
          <p className="mt-0.5 text-xs text-[var(--fyxvo-text-muted)]">
            Describe the issue, affected project, and any useful traces or errors you already have.
          </p>
        </div>

        <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-5 px-6 py-6">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="category" className="text-xs font-medium text-[var(--fyxvo-text-muted)]">
                Category
              </label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value as TicketCategory)}
                className="w-full rounded-md border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-3 py-2 text-sm text-[var(--fyxvo-text)] focus:outline-none focus:ring-1 focus:ring-[var(--fyxvo-brand)]"
              >
                {(Object.keys(CATEGORY_LABELS) as TicketCategory[]).map((key) => (
                  <option key={key} value={key}>
                    {CATEGORY_LABELS[key]}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="priority" className="text-xs font-medium text-[var(--fyxvo-text-muted)]">
                Priority
              </label>
              <select
                id="priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as TicketPriority)}
                className="w-full rounded-md border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-3 py-2 text-sm text-[var(--fyxvo-text)] focus:outline-none focus:ring-1 focus:ring-[var(--fyxvo-brand)]"
              >
                {(Object.keys(PRIORITY_LABELS) as TicketPriority[]).map((key) => (
                  <option key={key} value={key}>
                    {PRIORITY_LABELS[key]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="subject" className="text-xs font-medium text-[var(--fyxvo-text-muted)]">
              Subject
            </label>
            <input
              id="subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              onBlur={() => setSubjectBlurred(true)}
              placeholder="Brief description of your issue"
              maxLength={SUBJECT_MAX}
              className={`w-full rounded-md border bg-[var(--fyxvo-panel-soft)] px-3 py-2 text-sm text-[var(--fyxvo-text)] placeholder:text-[var(--fyxvo-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--fyxvo-brand)] ${
                subjectError
                  ? "border-red-500 focus:ring-red-500"
                  : "border-[var(--fyxvo-border)]"
              }`}
            />
            <div className="flex items-center justify-between">
              {subjectError ? (
                <p className="text-xs text-red-500">{subjectError}</p>
              ) : (
                <span />
              )}
              <p className="text-right text-xs text-[var(--fyxvo-text-muted)]">
                {subject.length} / {SUBJECT_MAX}
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="description" className="text-xs font-medium text-[var(--fyxvo-text-muted)]">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={() => setDescriptionBlurred(true)}
              placeholder="Provide as much detail as possible — steps to reproduce, error messages, relevant project IDs, etc."
              rows={5}
              maxLength={DESC_MAX}
              className={`w-full resize-y rounded-md border bg-[var(--fyxvo-panel-soft)] px-3 py-2 text-sm text-[var(--fyxvo-text)] placeholder:text-[var(--fyxvo-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--fyxvo-brand)] ${
                descError
                  ? "border-red-500 focus:ring-red-500"
                  : "border-[var(--fyxvo-border)]"
              }`}
            />
            <div className="flex items-center justify-between">
              {descError ? (
                <p className="text-xs text-red-500">{descError}</p>
              ) : (
                <span />
              )}
              <p className="text-right text-xs text-[var(--fyxvo-text-muted)]">
                {description.length} / {DESC_MAX}
              </p>
            </div>
          </div>

          {submitError ? (
            <p className="text-xs text-red-500">{submitError}</p>
          ) : null}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting || !formValid}
              className="rounded-md bg-[var(--fyxvo-brand)] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Submitting…" : "Submit ticket"}
            </button>
          </div>
        </form>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Ticket history */}
      {/* ------------------------------------------------------------------ */}
      {tickets.length > 0 && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-[var(--fyxvo-text)]">Your Tickets</h2>
            <div className="flex flex-wrap gap-2">
              {(["all", "open", "in_progress", "resolved", "closed"] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatusFilter(status)}
                  className={`rounded-full border px-3 py-1 text-xs transition ${
                    statusFilter === status
                      ? "border-[var(--fyxvo-brand)]/40 bg-[var(--fyxvo-brand-subtle)] text-[var(--fyxvo-text)]"
                      : "border-[var(--fyxvo-border)] text-[var(--fyxvo-text-muted)]"
                  }`}
                >
                  {status === "all" ? "all" : STATUS_STYLES[status].label}
                </button>
              ))}
            </div>
          </div>
          <div className="overflow-hidden rounded-lg border border-[var(--fyxvo-border)]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)]">
                  <th className="px-4 py-3 text-left text-xs font-medium text-[var(--fyxvo-text-muted)]">
                    Subject
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[var(--fyxvo-text-muted)]">
                    Category
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[var(--fyxvo-text-muted)]">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[var(--fyxvo-text-muted)]">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredTickets.map((ticket) => (
                  <tr
                    key={ticket.id}
                    className="border-b border-[var(--fyxvo-border)] last:border-0 bg-[var(--fyxvo-bg-elevated)]"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-[var(--fyxvo-text)]">{ticket.subject}</div>
                      {ticket.projectSlug ? (
                        <a href={`/projects/${ticket.projectSlug}`} className="text-xs text-[var(--fyxvo-brand)] hover:underline">
                          {ticket.projectName ?? "Open related project"}
                        </a>
                      ) : null}
                      {ticket.adminResponse ? (
                        <p className="mt-1 text-xs leading-5 text-[var(--fyxvo-text-muted)]">
                          Latest admin response{ticket.adminRespondedAt ? ` · ${formatDate(ticket.adminRespondedAt)}` : ""}: {ticket.adminResponse}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-[var(--fyxvo-text-muted)]">
                      {supportCategoryLabel(ticket.category)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={ticket.status} />
                    </td>
                    <td className="px-4 py-3 text-[var(--fyxvo-text-muted)]">
                      <div>{formatDate(ticket.createdAt)}</div>
                      <div className="text-xs">
                        Updated {formatDate(ticket.updatedAt)}
                        {ticket.resolvedAt ? ` · Resolved ${formatDate(ticket.resolvedAt)}` : ""}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
