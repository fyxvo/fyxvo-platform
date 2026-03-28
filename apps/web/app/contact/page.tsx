"use client";

import { useState } from "react";
import { Button, Notice } from "@fyxvo/ui";
import { API_BASE } from "../../lib/env";

const DEFAULT_INTEREST_AREAS = ["rpc", "priority-relay", "analytics"] as const;
const FEEDBACK_CATEGORIES = [
  { value: "BUG_REPORT", label: "Bug report" },
  { value: "SUPPORT_REQUEST", label: "Support request" },
  { value: "ONBOARDING_FRICTION", label: "Onboarding friction" },
  { value: "PRODUCT_FEEDBACK", label: "Product feedback" },
] as const;

export default function ContactPage() {
  const [interestForm, setInterestForm] = useState({
    name: "",
    email: "",
    role: "Developer",
    team: "",
    expectedRequestVolume: "10K-100K",
    useCase: "",
  });
  const [interestSubmitting, setInterestSubmitting] = useState(false);
  const [interestSubmitted, setInterestSubmitted] = useState(false);
  const [interestError, setInterestError] = useState<string | null>(null);

  const [feedbackForm, setFeedbackForm] = useState({
    name: "",
    email: "",
    role: "",
    team: "",
    category: "PRODUCT_FEEDBACK",
    message: "",
  });
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  async function handleInterestSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setInterestSubmitting(true);
    setInterestError(null);

    try {
      const response = await fetch(`${API_BASE}/v1/interest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...interestForm,
          useCase: interestForm.useCase.trim(),
          interestAreas: [...DEFAULT_INTEREST_AREAS],
          operatorInterest: false,
          source: "contact-page",
        }),
      });

      const body = (await response.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!response.ok) {
        throw new Error(body.message ?? body.error ?? "Request failed");
      }

      setInterestSubmitted(true);
    } catch (submissionError) {
      setInterestError(
        submissionError instanceof Error
          ? submissionError.message
          : "Unable to submit your request right now."
      );
    } finally {
      setInterestSubmitting(false);
    }
  }

  async function handleFeedbackSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedbackSubmitting(true);
    setFeedbackError(null);

    try {
      const response = await fetch(`${API_BASE}/v1/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...feedbackForm,
          category: feedbackForm.category,
          message: feedbackForm.message.trim(),
          source: "contact-page",
          page: "/contact",
        }),
      });

      const body = (await response.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!response.ok) {
        throw new Error(body.message ?? body.error ?? "Feedback submission failed");
      }

      setFeedbackSubmitted(true);
    } catch (submissionError) {
      setFeedbackError(
        submissionError instanceof Error
          ? submissionError.message
          : "Unable to submit your feedback right now."
      );
    } finally {
      setFeedbackSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <h1 className="text-4xl font-bold tracking-tight text-[var(--fyxvo-text)]">Contact</h1>
      <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--fyxvo-text-soft)]">
        Contact Fyxvo if you need onboarding help, pricing guidance, rollout support, or want to
        report friction with the live devnet product. These forms write directly into the real API
        workflows that the team reviews.
      </p>

      <div className="mt-10 grid gap-6 xl:grid-cols-2">
        <div className="rounded-[2rem] border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-6 sm:p-8">
          <h2 className="text-2xl font-semibold text-[var(--fyxvo-text)]">Product interest</h2>
          <p className="mt-3 text-sm leading-6 text-[var(--fyxvo-text-soft)]">
            Use this form when you want help getting onto the platform or need a conversation about
            request volume, relay usage, analytics, or funding posture.
          </p>

          <div className="mt-6">
            {interestSubmitted ? (
              <Notice tone="success">
                Interest request received. Fyxvo will review the use case and follow up at{" "}
                {interestForm.email}.
              </Notice>
            ) : (
              <form className="grid gap-5 sm:grid-cols-2" onSubmit={(event) => void handleInterestSubmit(event)}>
                {interestError ? (
                  <div className="sm:col-span-2">
                    <Notice tone="danger">{interestError}</Notice>
                  </div>
                ) : null}

                <label className="block">
                  <span className="text-sm font-medium text-[var(--fyxvo-text)]">Name</span>
                  <input
                    value={interestForm.name}
                    onChange={(event) =>
                      setInterestForm((current) => ({ ...current, name: event.target.value }))
                    }
                    required
                    className="mt-2 h-11 w-full rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 text-sm text-[var(--fyxvo-text)] outline-none focus:border-[var(--fyxvo-brand)]"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-[var(--fyxvo-text)]">Email</span>
                  <input
                    type="email"
                    value={interestForm.email}
                    onChange={(event) =>
                      setInterestForm((current) => ({ ...current, email: event.target.value }))
                    }
                    required
                    className="mt-2 h-11 w-full rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 text-sm text-[var(--fyxvo-text)] outline-none focus:border-[var(--fyxvo-brand)]"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-[var(--fyxvo-text)]">Role</span>
                  <input
                    value={interestForm.role}
                    onChange={(event) =>
                      setInterestForm((current) => ({ ...current, role: event.target.value }))
                    }
                    required
                    className="mt-2 h-11 w-full rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 text-sm text-[var(--fyxvo-text)] outline-none focus:border-[var(--fyxvo-brand)]"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-[var(--fyxvo-text)]">Team</span>
                  <input
                    value={interestForm.team}
                    onChange={(event) =>
                      setInterestForm((current) => ({ ...current, team: event.target.value }))
                    }
                    className="mt-2 h-11 w-full rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 text-sm text-[var(--fyxvo-text)] outline-none focus:border-[var(--fyxvo-brand)]"
                  />
                </label>

                <label className="block sm:col-span-2">
                  <span className="text-sm font-medium text-[var(--fyxvo-text)]">
                    Expected request volume
                  </span>
                  <select
                    value={interestForm.expectedRequestVolume}
                    onChange={(event) =>
                      setInterestForm((current) => ({
                        ...current,
                        expectedRequestVolume: event.target.value,
                      }))
                    }
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
                    value={interestForm.useCase}
                    onChange={(event) =>
                      setInterestForm((current) => ({ ...current, useCase: event.target.value }))
                    }
                    required
                    className="mt-2 w-full rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 py-3 text-sm text-[var(--fyxvo-text)] outline-none focus:border-[var(--fyxvo-brand)]"
                  />
                </label>

                <div className="sm:col-span-2">
                  <Button type="submit" loading={interestSubmitting} disabled={interestSubmitting}>
                    Submit request
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>

        <div className="rounded-[2rem] border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-6 sm:p-8">
          <h2 className="text-2xl font-semibold text-[var(--fyxvo-text)]">Send feedback</h2>
          <p className="mt-3 text-sm leading-6 text-[var(--fyxvo-text-soft)]">
            Use this form for bug reports, support questions, onboarding friction, or broader
            product feedback. It posts directly to the live feedback endpoint.
          </p>

          <div className="mt-6">
            {feedbackSubmitted ? (
              <Notice tone="success">
                Feedback captured. The team will review the submission and follow up if needed.
              </Notice>
            ) : (
              <form className="space-y-5" onSubmit={(event) => void handleFeedbackSubmit(event)}>
                {feedbackError ? <Notice tone="danger">{feedbackError}</Notice> : null}

                <label className="block">
                  <span className="text-sm font-medium text-[var(--fyxvo-text)]">Name</span>
                  <input
                    value={feedbackForm.name}
                    onChange={(event) =>
                      setFeedbackForm((current) => ({ ...current, name: event.target.value }))
                    }
                    required
                    className="mt-2 h-11 w-full rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 text-sm text-[var(--fyxvo-text)] outline-none focus:border-[var(--fyxvo-brand)]"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-[var(--fyxvo-text)]">Email</span>
                  <input
                    type="email"
                    value={feedbackForm.email}
                    onChange={(event) =>
                      setFeedbackForm((current) => ({ ...current, email: event.target.value }))
                    }
                    required
                    className="mt-2 h-11 w-full rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 text-sm text-[var(--fyxvo-text)] outline-none focus:border-[var(--fyxvo-brand)]"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-[var(--fyxvo-text)]">Category</span>
                  <select
                    value={feedbackForm.category}
                    onChange={(event) =>
                      setFeedbackForm((current) => ({ ...current, category: event.target.value }))
                    }
                    className="mt-2 h-11 w-full rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 text-sm text-[var(--fyxvo-text)] outline-none focus:border-[var(--fyxvo-brand)]"
                  >
                    {FEEDBACK_CATEGORIES.map((category) => (
                      <option key={category.value} value={category.value}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-[var(--fyxvo-text)]">Message</span>
                  <textarea
                    rows={7}
                    value={feedbackForm.message}
                    onChange={(event) =>
                      setFeedbackForm((current) => ({ ...current, message: event.target.value }))
                    }
                    required
                    className="mt-2 w-full rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 py-3 text-sm text-[var(--fyxvo-text)] outline-none focus:border-[var(--fyxvo-brand)]"
                  />
                </label>

                <Button type="submit" loading={feedbackSubmitting} disabled={feedbackSubmitting}>
                  Send feedback
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
