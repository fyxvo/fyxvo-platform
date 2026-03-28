"use client";

import { useState } from "react";
import { Button, Notice } from "@fyxvo/ui";

const DEFAULT_INTEREST_AREAS = ["rpc", "priority-relay", "analytics"] as const;

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Developer");
  const [team, setTeam] = useState("");
  const [expectedRequestVolume, setExpectedRequestVolume] = useState("10K-100K");
  const [useCase, setUseCase] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          role,
          team,
          useCase,
          expectedRequestVolume,
          interestAreas: [...DEFAULT_INTEREST_AREAS],
          operatorInterest: false,
          source: "contact-page",
        }),
      });

      const body = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(body.error ?? "Request failed");
      }

      setSubmitted(true);
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Unable to submit your message right now."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-16">
      <h1 className="text-4xl font-bold tracking-tight text-[var(--fyxvo-text)]">Contact</h1>
      <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--fyxvo-text-soft)]">
        Use this form if you want help with onboarding, pricing, relay usage, or the live devnet
        rollout. It feeds the actual product-interest workflow instead of a disconnected marketing
        inbox.
      </p>

      <div className="mt-10 rounded-[2rem] border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-6 sm:p-8">
        {submitted ? (
          <Notice tone="success">
            Request received. We will review your use case and follow up at {email}.
          </Notice>
        ) : (
          <form className="grid gap-5 sm:grid-cols-2" onSubmit={(event) => void handleSubmit(event)}>
            {error ? (
              <div className="sm:col-span-2">
                <Notice tone="danger">{error}</Notice>
              </div>
            ) : null}

            <label className="block">
              <span className="text-sm font-medium text-[var(--fyxvo-text)]">Name</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                className="mt-2 h-11 w-full rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 text-sm text-[var(--fyxvo-text)] outline-none focus:border-[var(--fyxvo-brand)]"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-[var(--fyxvo-text)]">Email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                className="mt-2 h-11 w-full rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 text-sm text-[var(--fyxvo-text)] outline-none focus:border-[var(--fyxvo-brand)]"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-[var(--fyxvo-text)]">Role</span>
              <input
                value={role}
                onChange={(event) => setRole(event.target.value)}
                required
                className="mt-2 h-11 w-full rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 text-sm text-[var(--fyxvo-text)] outline-none focus:border-[var(--fyxvo-brand)]"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-[var(--fyxvo-text)]">Team</span>
              <input
                value={team}
                onChange={(event) => setTeam(event.target.value)}
                className="mt-2 h-11 w-full rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 text-sm text-[var(--fyxvo-text)] outline-none focus:border-[var(--fyxvo-brand)]"
              />
            </label>

            <label className="block sm:col-span-2">
              <span className="text-sm font-medium text-[var(--fyxvo-text)]">
                Expected request volume
              </span>
              <select
                value={expectedRequestVolume}
                onChange={(event) => setExpectedRequestVolume(event.target.value)}
                className="mt-2 h-11 w-full rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 text-sm text-[var(--fyxvo-text)] outline-none focus:border-[var(--fyxvo-brand)]"
              >
                <option>Under 10K</option>
                <option>10K-100K</option>
                <option>100K-1M</option>
                <option>1M-10M</option>
                <option>Over 10M</option>
              </select>
            </label>

            <label className="block sm:col-span-2">
              <span className="text-sm font-medium text-[var(--fyxvo-text)]">Use case</span>
              <textarea
                rows={6}
                value={useCase}
                onChange={(event) => setUseCase(event.target.value)}
                required
                className="mt-2 w-full rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 py-3 text-sm text-[var(--fyxvo-text)] outline-none focus:border-[var(--fyxvo-brand)]"
              />
            </label>

            <div className="sm:col-span-2">
              <Button type="submit" loading={submitting} disabled={submitting}>
                Submit request
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
