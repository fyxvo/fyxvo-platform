"use client";

import { useState } from "react";
import Link from "next/link";
import { Notice } from "@fyxvo/ui";
import { SocialLinks } from "../../components/social-links";
import { submitInterest, submitFeedback } from "../../lib/api";
import type { InterestSubmissionInput, FeedbackSubmissionInput } from "../../lib/types";

const INTEREST_AREAS = [
  "Standard RPC",
  "Priority relay",
  "Analytics",
  "Operator participation",
] as const;

const VOLUME_OPTIONS = [
  { label: "Under 10K", value: "under_10k" },
  { label: "10K–100K", value: "10k_100k" },
  { label: "100K–1M", value: "100k_1m" },
  { label: "Over 1M", value: "over_1m" },
] as const;

const FEEDBACK_CATEGORIES = [
  { label: "Bug report", value: "BUG_REPORT" },
  { label: "Support request", value: "SUPPORT_REQUEST" },
  { label: "Onboarding friction", value: "ONBOARDING_FRICTION" },
  { label: "Product feedback", value: "PRODUCT_FEEDBACK" },
] as const;

type FeedbackCategory = "BUG_REPORT" | "SUPPORT_REQUEST" | "ONBOARDING_FRICTION" | "PRODUCT_FEEDBACK";

type FormState = "idle" | "loading" | "success" | "error";

const labelClass = "block text-sm font-medium text-[var(--fyxvo-text)] mb-1.5";
const inputClass =
  "w-full rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)] px-3 py-2.5 text-sm text-[var(--fyxvo-text)] placeholder:text-[var(--fyxvo-text-muted)] outline-none focus:border-[var(--fyxvo-brand)] transition";
const fieldClass = "space-y-1.5";

function InterestForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [team, setTeam] = useState("");
  const [useCase, setUseCase] = useState("");
  const [volume, setVolume] = useState("under_10k");
  const [areas, setAreas] = useState<string[]>([]);
  const [state, setState] = useState<FormState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function toggleArea(area: string) {
    setAreas((prev) =>
      prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("loading");
    setErrorMessage(null);
    try {
      const input: InterestSubmissionInput = {
        name: name.trim(),
        email: email.trim(),
        role: role.trim(),
        ...(team.trim() ? { team: team.trim() } : {}),
        useCase: useCase.trim(),
        expectedRequestVolume: volume,
        interestAreas: areas as readonly string[],
        operatorInterest: areas.includes("Operator participation"),
        source: "contact-page-interest",
      };
      await submitInterest(input);
      setState("success");
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Something went wrong. Please try again."
      );
      setState("error");
    }
  }

  if (state === "success") {
    return (
      <div className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-8 text-center space-y-3">
        <div className="text-lg font-semibold text-[var(--fyxvo-text)]">Thank you</div>
        <p className="text-sm leading-6 text-[var(--fyxvo-text-muted)]">
          Your interest submission has been received. We review every message and will follow up
          with you directly when the time is right.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
      <div className={fieldClass}>
        <label htmlFor="interest-name" className={labelClass}>
          Name
        </label>
        <input
          id="interest-name"
          type="text"
          required
          autoComplete="name"
          placeholder="Your name"
          className={inputClass}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className={fieldClass}>
        <label htmlFor="interest-email" className={labelClass}>
          Email
        </label>
        <input
          id="interest-email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          className={inputClass}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div className={fieldClass}>
        <label htmlFor="interest-role" className={labelClass}>
          Role <span className="text-[var(--fyxvo-text-muted)] font-normal">(optional)</span>
        </label>
        <input
          id="interest-role"
          type="text"
          autoComplete="organization-title"
          placeholder="Engineer, founder, operator..."
          className={inputClass}
          value={role}
          onChange={(e) => setRole(e.target.value)}
        />
      </div>

      <div className={fieldClass}>
        <label htmlFor="interest-team" className={labelClass}>
          Team <span className="text-[var(--fyxvo-text-muted)] font-normal">(optional)</span>
        </label>
        <input
          id="interest-team"
          type="text"
          autoComplete="organization"
          placeholder="Company or project name"
          className={inputClass}
          value={team}
          onChange={(e) => setTeam(e.target.value)}
        />
      </div>

      <div className={fieldClass}>
        <label htmlFor="interest-use-case" className={labelClass}>
          Use case
        </label>
        <textarea
          id="interest-use-case"
          required
          rows={4}
          placeholder="What are you building?"
          className={`${inputClass} resize-none`}
          value={useCase}
          onChange={(e) => setUseCase(e.target.value)}
        />
      </div>

      <div className={fieldClass}>
        <label htmlFor="interest-volume" className={labelClass}>
          Expected request volume
        </label>
        <select
          id="interest-volume"
          className={inputClass}
          value={volume}
          onChange={(e) => setVolume(e.target.value)}
        >
          {VOLUME_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className={fieldClass}>
        <fieldset>
          <legend className={labelClass}>Interest areas</legend>
          <div className="space-y-2">
            {INTEREST_AREAS.map((area) => (
              <label
                key={area}
                className="flex items-center gap-3 cursor-pointer select-none"
              >
                <input
                  type="checkbox"
                  checked={areas.includes(area)}
                  onChange={() => toggleArea(area)}
                  className="h-4 w-4 rounded border-[var(--fyxvo-border)] accent-[var(--fyxvo-brand)]"
                />
                <span className="text-sm text-[var(--fyxvo-text-muted)]">{area}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      {state === "error" && errorMessage ? (
        <Notice tone="warning" title="Submission failed">
          {errorMessage}
        </Notice>
      ) : null}

      <button
        type="submit"
        disabled={state === "loading"}
        className="w-full rounded-xl bg-[var(--fyxvo-brand)] px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
      >
        {state === "loading" ? "Submitting..." : "Submit interest"}
      </button>
    </form>
  );
}

function FeedbackForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [team, setTeam] = useState("");
  const [category, setCategory] = useState<FeedbackCategory>("BUG_REPORT");
  const [message, setMessage] = useState("");
  const [state, setState] = useState<FormState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("loading");
    setErrorMessage(null);
    try {
      const input: FeedbackSubmissionInput = {
        name: name.trim(),
        email: email.trim(),
        ...(role.trim() ? { role: role.trim() } : {}),
        ...(team.trim() ? { team: team.trim() } : {}),
        category,
        message: message.trim(),
        source: "contact-page-feedback",
        page: "/contact",
      };
      await submitFeedback(input);
      setState("success");
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Something went wrong. Please try again."
      );
      setState("error");
    }
  }

  if (state === "success") {
    return (
      <div className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-8 text-center space-y-3">
        <div className="text-lg font-semibold text-[var(--fyxvo-text)]">Thank you</div>
        <p className="text-sm leading-6 text-[var(--fyxvo-text-muted)]">
          Your feedback has been received. Every submission goes directly to the team and helps
          us improve the platform for everyone on devnet.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
      <div className={fieldClass}>
        <label htmlFor="feedback-name" className={labelClass}>
          Name
        </label>
        <input
          id="feedback-name"
          type="text"
          required
          autoComplete="name"
          placeholder="Your name"
          className={inputClass}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className={fieldClass}>
        <label htmlFor="feedback-email" className={labelClass}>
          Email
        </label>
        <input
          id="feedback-email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          className={inputClass}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div className={fieldClass}>
        <label htmlFor="feedback-role" className={labelClass}>
          Role <span className="text-[var(--fyxvo-text-muted)] font-normal">(optional)</span>
        </label>
        <input
          id="feedback-role"
          type="text"
          autoComplete="organization-title"
          placeholder="Engineer, founder, operator..."
          className={inputClass}
          value={role}
          onChange={(e) => setRole(e.target.value)}
        />
      </div>

      <div className={fieldClass}>
        <label htmlFor="feedback-team" className={labelClass}>
          Team <span className="text-[var(--fyxvo-text-muted)] font-normal">(optional)</span>
        </label>
        <input
          id="feedback-team"
          type="text"
          autoComplete="organization"
          placeholder="Company or project name"
          className={inputClass}
          value={team}
          onChange={(e) => setTeam(e.target.value)}
        />
      </div>

      <div className={fieldClass}>
        <label htmlFor="feedback-category" className={labelClass}>
          Category
        </label>
        <select
          id="feedback-category"
          className={inputClass}
          value={category}
          onChange={(e) => setCategory(e.target.value as FeedbackCategory)}
        >
          {FEEDBACK_CATEGORIES.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>
      </div>

      <div className={fieldClass}>
        <label htmlFor="feedback-message" className={labelClass}>
          What happened
        </label>
        <textarea
          id="feedback-message"
          required
          rows={5}
          placeholder="Describe what you experienced..."
          className={`${inputClass} resize-none`}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </div>

      {state === "error" && errorMessage ? (
        <Notice tone="warning" title="Submission failed">
          {errorMessage}
        </Notice>
      ) : null}

      <button
        type="submit"
        disabled={state === "loading"}
        className="w-full rounded-xl bg-[var(--fyxvo-brand)] px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
      >
        {state === "loading" ? "Submitting..." : "Send feedback"}
      </button>
    </form>
  );
}

export default function ContactPage() {
  return (
    <div className="space-y-16 lg:space-y-20">
      {/* Page heading */}
      <div className="space-y-4">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--fyxvo-brand)]">
          Contact
        </p>
        <h1 className="font-display text-4xl font-semibold tracking-tight text-[var(--fyxvo-text)] sm:text-5xl">
          Get in touch
        </h1>
        <p className="max-w-2xl text-base leading-7 text-[var(--fyxvo-text-muted)]">
          Use the interest form if you want to explore Fyxvo access or talk through what you are
          building. Use the feedback form if something broke, confused you, or feels harder than it
          should. Both go straight to the team.
        </p>
      </div>

      {/* Two forms side by side */}
      <div className="grid gap-10 lg:grid-cols-2 lg:gap-12">
        {/* Form 1 — Interest */}
        <section id="interest-form" className="space-y-6">
          <div className="space-y-2">
            <h2 className="font-display text-2xl font-semibold tracking-tight text-[var(--fyxvo-text)] sm:text-3xl">
              Get started
            </h2>
            <p className="text-sm leading-6 text-[var(--fyxvo-text-muted)]">
              Tell us about what you are building and what matters most. That context makes every
              follow-up conversation more useful for both sides.
            </p>
          </div>
          <div className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-6">
            <InterestForm />
          </div>
        </section>

        {/* Form 2 — Feedback */}
        <section id="feedback-form" className="space-y-6">
          <div className="space-y-2">
            <h2 className="font-display text-2xl font-semibold tracking-tight text-[var(--fyxvo-text)] sm:text-3xl">
              Send feedback
            </h2>
            <p className="text-sm leading-6 text-[var(--fyxvo-text-muted)]">
              If you hit a bug, ran into confusing onboarding, or want to flag something that felt
              off, this is the right place. Every submission goes directly into our review queue.
            </p>
          </div>
          <div className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-6">
            <FeedbackForm />
          </div>
        </section>
      </div>

      {/* Community links */}
      <section className="border-t border-[var(--fyxvo-border)] pt-16 space-y-6">
        <div className="space-y-3">
          <h2 className="font-display text-2xl font-semibold tracking-tight text-[var(--fyxvo-text)] sm:text-3xl">
            Join the community
          </h2>
          <p className="max-w-2xl text-base leading-7 text-[var(--fyxvo-text-muted)]">
            We post updates and launch news on X, answer product and technical questions on
            Discord, and use Telegram for quick back-and-forth around rollout logistics. Every
            channel gets actual attention from the team.
          </p>
        </div>
        <SocialLinks />
      </section>

      {/* Three path cards */}
      <section className="grid gap-5 sm:grid-cols-3">
        <div className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-5 space-y-3">
          <div className="text-sm font-semibold text-[var(--fyxvo-text)]">Get access</div>
          <p className="text-sm leading-6 text-[var(--fyxvo-text-muted)]">
            Share what you are building and what you want to test on devnet. Use the interest form
            to get your team on the Fyxvo alpha list.
          </p>
          <Link
            href="#interest-form"
            className="inline-flex text-sm font-medium text-[var(--fyxvo-brand)] hover:underline"
          >
            Open interest form
          </Link>
        </div>

        <div className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-5 space-y-3">
          <div className="text-sm font-semibold text-[var(--fyxvo-text)]">Get support</div>
          <p className="text-sm leading-6 text-[var(--fyxvo-text-muted)]">
            Hit a bug, ran into something confusing, or your relay request is not behaving as
            expected? Use the feedback form and we will look into it directly.
          </p>
          <Link
            href="#feedback-form"
            className="inline-flex text-sm font-medium text-[var(--fyxvo-brand)] hover:underline"
          >
            Open feedback form
          </Link>
        </div>

        <div className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-5 space-y-3">
          <div className="text-sm font-semibold text-[var(--fyxvo-text)]">Enterprise</div>
          <p className="text-sm leading-6 text-[var(--fyxvo-text-muted)]">
            If your scope is larger and you want to talk about dedicated rollout support, workload
            sizing, or commercial terms, the enterprise path is the right starting point.
          </p>
          <Link
            href="/enterprise"
            className="inline-flex text-sm font-medium text-[var(--fyxvo-brand)] hover:underline"
          >
            View enterprise options
          </Link>
        </div>
      </section>
    </div>
  );
}
