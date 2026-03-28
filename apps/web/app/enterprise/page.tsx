"use client";

import Link from "next/link";
import { useState } from "react";
import { Button, Notice } from "@fyxvo/ui";
import { API_BASE } from "../../lib/env";

const FEATURES = [
  "Capacity planning for expected request shape and relay lane selection",
  "Operational review of funding, key issuance, alerts, and webhook posture",
  "Hands-on support during private-alpha onboarding and rollout",
  "Conversation about isolated traffic paths when shared defaults are not enough",
] as const;

export default function EnterprisePage() {
  const [companyName, setCompanyName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [estimatedMonthlyReqs, setEstimatedMonthlyReqs] = useState("100K-1M");
  const [useCase, setUseCase] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/v1/enterprise/interest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName,
          contactEmail,
          estimatedMonthlyReqs,
          useCase,
        }),
      });

      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
      };
      if (!response.ok) {
        throw new Error(body.message ?? body.error ?? "Request failed");
      }

      setSubmitted(true);
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Unable to submit your request right now."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <section className="border-b border-[var(--fyxvo-border)] px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-brand)]">
            Enterprise
          </p>
          <h1 className="mt-3 max-w-4xl text-5xl font-bold tracking-tight text-[var(--fyxvo-text)] sm:text-6xl">
            For teams that need a closer operating relationship
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-[var(--fyxvo-text-soft)]">
            Fyxvo enterprise work is for private-alpha teams that need rollout planning, traffic
            guidance, or operational alignment beyond the shared defaults. The discussion starts
            with the actual request profile and the constraints your team cares about.
          </p>
        </div>
      </section>

      <section className="border-b border-[var(--fyxvo-border)] px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-2">
          {FEATURES.map((feature) => (
            <div
              key={feature}
              className="rounded-3xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-6 text-sm leading-6 text-[var(--fyxvo-text-soft)]"
            >
              {feature}
            </div>
          ))}
        </div>
      </section>

      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight text-[var(--fyxvo-text)]">
              Tell us about your rollout
            </h2>
            <p className="mt-4 text-base leading-7 text-[var(--fyxvo-text-soft)]">
              We use this to understand whether your team needs help with traffic planning,
              operational review, or a tighter relationship during devnet validation.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild variant="secondary">
                <Link href="/pricing">Review pricing</Link>
              </Button>
              <Button asChild variant="ghost">
                <Link href="/docs">Read the docs</Link>
              </Button>
            </div>
          </div>

          <div className="rounded-[2rem] border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-6 sm:p-8">
            {submitted ? (
              <Notice tone="success">
                Inquiry received. We will review the request and follow up at {contactEmail}.
              </Notice>
            ) : (
              <form onSubmit={(event) => void handleSubmit(event)} className="space-y-5">
                {error ? <Notice tone="danger">{error}</Notice> : null}
                <label className="block">
                  <span className="text-sm font-medium text-[var(--fyxvo-text)]">Company</span>
                  <input
                    value={companyName}
                    onChange={(event) => setCompanyName(event.target.value)}
                    required
                    className="mt-2 h-11 w-full rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 text-sm text-[var(--fyxvo-text)] outline-none focus:border-[var(--fyxvo-brand)]"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-[var(--fyxvo-text)]">Work email</span>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(event) => setContactEmail(event.target.value)}
                    required
                    className="mt-2 h-11 w-full rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 text-sm text-[var(--fyxvo-text)] outline-none focus:border-[var(--fyxvo-brand)]"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-[var(--fyxvo-text)]">
                    Estimated monthly requests
                  </span>
                  <select
                    value={estimatedMonthlyReqs}
                    onChange={(event) => setEstimatedMonthlyReqs(event.target.value)}
                    className="mt-2 h-11 w-full rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 text-sm text-[var(--fyxvo-text)] outline-none focus:border-[var(--fyxvo-brand)]"
                  >
                    <option>Under 100K</option>
                    <option>100K-1M</option>
                    <option>1M-10M</option>
                    <option>Over 10M</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-[var(--fyxvo-text)]">Use case</span>
                  <textarea
                    rows={6}
                    value={useCase}
                    onChange={(event) => setUseCase(event.target.value)}
                    required
                    className="mt-2 w-full rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 py-3 text-sm text-[var(--fyxvo-text)] outline-none focus:border-[var(--fyxvo-brand)]"
                  />
                </label>
                <Button type="submit" loading={submitting} disabled={submitting}>
                  Submit inquiry
                </Button>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
