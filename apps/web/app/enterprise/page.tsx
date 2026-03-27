"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, Notice } from "@fyxvo/ui";
import { Input } from "@fyxvo/ui";
import { submitInterest } from "../../lib/api";

const FEATURES = [
  {
    title: "Capacity planning",
    description:
      "We work through expected request shape, relay mode, and rollout constraints before widening usage. The goal is to match the traffic profile to the right operating path instead of forcing every team into the same defaults.",
  },
  {
    title: "Isolated traffic paths",
    description:
      "For sensitive workloads we can discuss routing that is separated from the shared relay path. That helps teams validate stricter latency or contention requirements during rollout.",
  },
  {
    title: "Custom request policies",
    description:
      "Enterprise conversations can include tighter request budgets, workload-specific rate controls, and lane selection for traffic that does not fit the standard shared posture.",
  },
  {
    title: "Operational reviews",
    description:
      "We can review project setup, funding flow, key management, alerts, and webhook usage with your team so the operational model is clear before more traffic moves onto the platform.",
  },
  {
    title: "Retention and exports",
    description:
      "If you need deeper history or data movement into your own tooling, we can scope retention, exports, and reporting needs as part of the engagement.",
  },
  {
    title: "Direct support channel",
    description:
      "Enterprise work is handled directly with the team operating the stack, which keeps debugging, rollout questions, and incident coordination close to the source.",
  },
];

const VOLUME_OPTIONS = [
  { value: "Under 100K", label: "Under 100K per month" },
  { value: "100K-1M", label: "100K to 1M per month" },
  { value: "1M-10M", label: "1M to 10M per month" },
  { value: "Over 10M", label: "Over 10M per month" },
];

export default function EnterprisePage() {
  const [companyName, setCompanyName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [monthlyRequests, setMonthlyRequests] = useState("");
  const [useCase, setUseCase] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!companyName || !contactEmail || !monthlyRequests || !useCase) return;
    setSubmitting(true);
    setError(null);
    try {
      await submitInterest({
        name: companyName,
        email: contactEmail,
        role: "Enterprise",
        team: companyName,
        useCase,
        expectedRequestVolume: monthlyRequests,
        interestAreas: ["Standard RPC", "Priority relay"],
        operatorInterest: false,
        source: "enterprise-page",
      });
      setSubmitted(true);
    } catch {
      setError(
        "Submission failed. Please try again or reach out by email directly."
      );
    } finally {
      setSubmitting(false);
    }
  }

  const isFormValid =
    companyName.trim().length > 0 &&
    contactEmail.trim().length > 0 &&
    monthlyRequests.length > 0 &&
    useCase.trim().length > 0;

  return (
    <div>
      {/* Hero */}
      <section className="border-b border-[var(--fyxvo-border)] py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="mb-8 inline-flex items-center gap-2 rounded-lg border border-[var(--fyxvo-brand)]/20 bg-[var(--fyxvo-brand-subtle)] px-3 py-1.5 text-sm font-medium text-[var(--fyxvo-brand)]">
              Enterprise
            </div>
            <h1 className="font-display text-5xl font-semibold leading-[1.06] tracking-tight text-[var(--fyxvo-text)] sm:text-6xl">
              For teams that need a{" "}
              <span className="fyxvo-text-gradient">closer operating relationship</span>
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-[var(--fyxvo-text-muted)]">
              Fyxvo&apos;s enterprise track is for private-alpha teams that need more throughput guidance, rollout support, or operational alignment than the shared surface provides by default.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <a href="#contact">Get in touch</a>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link href="/pricing">Review pricing</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Feature cards */}
      <section className="border-t border-[var(--fyxvo-border)] py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--fyxvo-brand)]">
            What you get
          </p>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-[var(--fyxvo-text)] sm:text-4xl">
            What enterprise engagements focus on
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--fyxvo-text-muted)]">
            These are the common areas we shape with teams that need a more hands-on rollout path.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-6"
              >
                <h3 className="font-display text-xl font-semibold text-[var(--fyxvo-text)]">
                  {feature.title}
                </h3>
                <p className="mt-3 text-base leading-7 text-[var(--fyxvo-text-muted)]">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-t border-[var(--fyxvo-border)] py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-8 sm:p-12">
            <div className="grid gap-10 sm:grid-cols-3 text-center">
              {[
                {
                  stat: "Private alpha",
                  description: "Best fit for teams validating a funded devnet workflow before wider launch.",
                },
                {
                  stat: "Shared or isolated",
                  description: "We can scope traffic on the shared relay or discuss separated paths for more sensitive workloads.",
                },
                {
                  stat: "Human support",
                  description: "Conversations are handled directly with the team operating the platform.",
                },
              ].map(({ stat, description }) => (
                <div key={stat}>
                  <p className="font-display text-5xl font-semibold text-[var(--fyxvo-brand)]">
                    {stat}
                  </p>
                  <p className="mt-3 text-base leading-7 text-[var(--fyxvo-text-muted)]">
                    {description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Contact form */}
      <section
        id="contact"
        className="border-t border-[var(--fyxvo-border)] py-24"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-16 lg:grid-cols-2 lg:gap-20">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--fyxvo-brand)]">
                Contact
              </p>
              <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-[var(--fyxvo-text)] sm:text-4xl">
                Talk to us about your use case
              </h2>
              <p className="mt-4 text-base leading-7 text-[var(--fyxvo-text-muted)]">
                Tell us about your traffic shape, rollout timeline, and the operational constraints you care about. We usually respond within one business day, and the conversation stays with someone close to the stack.
              </p>
              <div className="mt-8 space-y-4">
                {[
                  {
                    heading: "Capacity planning",
                    body: "We can help map your expected traffic and relay mode to a rollout path that stays realistic.",
                  },
                  {
                    heading: "Rollout guardrails",
                    body: "Funding flow, alerts, request policies, and support expectations can be worked through up front.",
                  },
                  {
                    heading: "Hands-on support",
                    body: "You get direct conversation with the team operating the platform rather than a generic intake queue.",
                  },
                ].map((item) => (
                  <div
                    key={item.heading}
                    className="flex gap-4"
                  >
                    <div className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[var(--fyxvo-brand)]/30 bg-[var(--fyxvo-brand-subtle)]">
                      <svg
                        className="h-3 w-3 text-[var(--fyxvo-brand)]"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2.5}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="font-display text-base font-semibold text-[var(--fyxvo-text)]">
                        {item.heading}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-[var(--fyxvo-text-muted)]">
                        {item.body}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              {submitted ? (
                <div className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-8">
                  <Notice tone="success" title="Request received">
                    Thank you for reaching out. We will review your submission and follow up at {contactEmail} within one business day.
                  </Notice>
                </div>
              ) : (
                <form
                  onSubmit={(e) => void handleSubmit(e)}
                  className="space-y-5 rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-6 sm:p-8"
                >
                  <p className="font-display text-xl font-semibold text-[var(--fyxvo-text)]">
                    Enterprise inquiry
                  </p>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-[var(--fyxvo-text)]">
                        Company name
                      </label>
                      <Input
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="Acme Corp"
                        required
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-[var(--fyxvo-text)]">
                        Contact email
                      </label>
                      <Input
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        type="email"
                        placeholder="you@company.com"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-[var(--fyxvo-text)]">
                      Estimated monthly requests
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {VOLUME_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setMonthlyRequests(opt.value)}
                          className={`rounded-lg border px-3 py-2 text-left text-sm font-medium transition-colors ${
                            monthlyRequests === opt.value
                              ? "border-[var(--fyxvo-brand)]/40 bg-[var(--fyxvo-brand-subtle)] text-[var(--fyxvo-text)]"
                              : "border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)] text-[var(--fyxvo-text-muted)] hover:border-[var(--fyxvo-border-strong)] hover:text-[var(--fyxvo-text)]"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-[var(--fyxvo-text)]">
                      Use case
                    </label>
                    <textarea
                      value={useCase}
                      onChange={(e) => setUseCase(e.target.value)}
                      placeholder="What are you building and what infrastructure requirements are you running into? The more context you share, the better we can help."
                      rows={5}
                      required
                      maxLength={3000}
                      className="w-full resize-none rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)] px-3 py-2.5 text-sm text-[var(--fyxvo-text)] placeholder:text-[var(--fyxvo-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--fyxvo-brand)]"
                    />
                    <p className="mt-1 text-xs text-[var(--fyxvo-text-muted)]">
                      {useCase.length} / 3000 characters
                    </p>
                  </div>

                  {error != null ? (
                    <Notice tone="warning" title="Submission failed">
                      {error}
                    </Notice>
                  ) : null}

                  <Button
                    type="submit"
                    disabled={submitting || !isFormValid}
                    className="w-full"
                  >
                    {submitting ? "Sending request..." : "Send enterprise request"}
                  </Button>

                  <p className="text-center text-xs text-[var(--fyxvo-text-muted)]">
                    We respond within one business day. Your information is not shared with third parties.
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
