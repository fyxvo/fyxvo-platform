"use client";

import { useState } from "react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Notice,
} from "@fyxvo/ui";
import { submitEnterpriseInterest } from "../../lib/api";

const VOLUME_OPTIONS = [
  "Under 100k/day",
  "100k – 1M/day",
  "1M – 10M/day",
  "More than 10M/day",
];

const FEATURES = [
  {
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    title: "Priority SLA",
    body: "You get dedicated relay capacity with real uptime guarantees and latency targets under 50ms at p95. No asterisks.",
  },
  {
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    title: "Dedicated nodes",
    body: "Your own infrastructure, completely separate from shared queues. No noisy neighbors slowing things down.",
  },
  {
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
      </svg>
    ),
    title: "Custom rate limits",
    body: "We set volume and burst limits around how you actually use the platform, not some generic tier that doesn't fit.",
  },
  {
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    title: "Team & RBAC",
    body: "Bring your whole team on board with role-based access, audit logs, and API keys scoped to each project.",
  },
  {
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    title: "Advanced analytics",
    body: "Go deeper with request analytics, flexible retention windows, exportable raw logs, and dashboards that actually help.",
  },
  {
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
    title: "Dedicated support",
    body: "A private Slack channel or email line with guaranteed response times and a real person you can reach by name.",
  },
];

export default function EnterprisePage() {
  const [companyName, setCompanyName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [estimatedMonthlyReqs, setEstimatedMonthlyReqs] = useState("");
  const [useCase, setUseCase] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!companyName || !contactEmail || !estimatedMonthlyReqs || !useCase) return;
    setSubmitting(true);
    setError(null);
    try {
      await submitEnterpriseInterest({ companyName, contactEmail, estimatedMonthlyReqs, useCase });
      setSubmitted(true);
    } catch {
      setError("Submission failed. Please try again or email us directly.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--fyxvo-bg)]">
      {/* Hero */}
      <section className="mx-auto max-w-5xl px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-[var(--fyxvo-brand-muted)] bg-[var(--fyxvo-brand-soft)] px-4 py-1.5 text-xs font-medium text-[var(--fyxvo-brand)] mb-6">
          Enterprise
        </div>
        <h1 className="font-display text-4xl font-bold tracking-tight text-[var(--fyxvo-text)] sm:text-5xl lg:text-6xl">
          Ready for serious traffic
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-[var(--fyxvo-text-muted)]">
          If you have outgrown shared plans and need infrastructure that keeps up with production workloads,
          this is where we come in. Dedicated capacity, real SLAs, and a team that picks up the phone.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <a href="#contact" className="inline-flex items-center justify-center rounded-xl bg-[var(--fyxvo-brand)] px-6 py-3 text-sm font-semibold text-white shadow hover:bg-[var(--fyxvo-brand-hover)] transition-colors">
            Talk to us
          </a>
          <a href="/pricing" className="inline-flex items-center justify-center rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-6 py-3 text-sm font-semibold text-[var(--fyxvo-text)] hover:bg-[var(--fyxvo-panel)] transition-colors">
            See pricing
          </a>
        </div>
      </section>

      {/* Feature grid */}
      <section className="mx-auto max-w-5xl px-6 py-12">
        <h2 className="text-center font-display text-2xl font-semibold text-[var(--fyxvo-text)] mb-10">
          What you get on an enterprise plan
        </h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <Card key={f.title} className="fyxvo-surface border-[color:var(--fyxvo-border)]">
              <CardHeader>
                <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--fyxvo-brand-soft)] text-[var(--fyxvo-brand)]">
                  {f.icon}
                </div>
                <CardTitle className="text-base">{f.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-[var(--fyxvo-text-muted)]">{f.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Social proof */}
      <section className="mx-auto max-w-5xl px-6 py-12">
        <div className="rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-8 sm:p-12">
          <div className="grid gap-8 sm:grid-cols-3 text-center">
            {[
              { stat: ">10M", label: "Requests handled daily" },
              { stat: "<50ms", label: "p95 relay latency" },
              { stat: "99.9%", label: "Uptime backed by SLA" },
            ].map(({ stat, label }) => (
              <div key={stat}>
                <p className="font-display text-3xl font-bold text-[var(--fyxvo-brand)]">{stat}</p>
                <p className="mt-1 text-sm text-[var(--fyxvo-text-muted)]">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact form */}
      <section id="contact" className="mx-auto max-w-2xl px-6 py-16">
        <h2 className="font-display text-2xl font-semibold text-[var(--fyxvo-text)] mb-2">
          Let&apos;s talk
        </h2>
        <p className="text-sm text-[var(--fyxvo-text-muted)] mb-8">
          Tell us a bit about what you need and how you plan to use it. We usually get back to you within a business day.
        </p>
        {submitted ? (
          <Notice tone="success" title="We got your request">
            Thanks for reaching out. Keep an eye on {contactEmail} and we will be in touch soon.
          </Notice>
        ) : (
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--fyxvo-text-muted)]">Company name</label>
                <Input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Acme Corp"
                  required
                  className="h-10 text-sm"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--fyxvo-text-muted)]">Contact email</label>
                <Input
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  type="email"
                  placeholder="you@company.com"
                  required
                  className="h-10 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--fyxvo-text-muted)]">Estimated monthly requests</label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {VOLUME_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setEstimatedMonthlyReqs(opt)}
                    className={`rounded-lg border px-2 py-1.5 text-xs font-medium text-center transition-colors ${
                      estimatedMonthlyReqs === opt
                        ? "border-[var(--fyxvo-brand-muted)] bg-[var(--fyxvo-brand-soft)] text-[var(--fyxvo-text)]"
                        : "border-[var(--fyxvo-border)] text-[var(--fyxvo-text-muted)] hover:text-[var(--fyxvo-text)]"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--fyxvo-text-muted)]">Use case</label>
              <textarea
                value={useCase}
                onChange={(e) => setUseCase(e.target.value)}
                placeholder="What are you building? What problems are you running into? The more context the better."
                rows={4}
                required
                maxLength={2000}
                className="w-full rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-3 py-2 text-sm text-[var(--fyxvo-text)] placeholder:text-[var(--fyxvo-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--fyxvo-accent)] resize-none"
              />
            </div>
            {error && (
              <Notice tone="warning" title="Something went wrong">
                {error}
              </Notice>
            )}
            <Button
              type="submit"
              disabled={submitting || !companyName || !contactEmail || !estimatedMonthlyReqs || !useCase}
              className="w-full"
            >
              {submitting ? "Sending..." : "Send request"}
            </Button>
          </form>
        )}
      </section>
    </div>
  );
}
