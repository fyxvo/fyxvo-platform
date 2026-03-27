"use client";

import { useState } from "react";

type SubmitState = "idle" | "loading" | "success" | "error";

export function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [submitState, setSubmitState] = useState<SubmitState>("idle");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email || submitState === "loading") return;
    setSubmitState("loading");
    try {
      const res = await fetch("/api/status-subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        setSubmitState("error");
        return;
      }
      setSubmitState("success");
      setEmail("");
    } catch {
      setSubmitState("error");
    }
  }

  if (submitState === "success") {
    return (
      <p className="text-sm text-[var(--fyxvo-text-muted)]">
        You&apos;ll hear from us when there&apos;s something worth saying.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--fyxvo-text-muted)]">
        Stay in the loop
      </p>
      <form onSubmit={(e) => { void handleSubmit(e); }} className="flex gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          className="min-w-0 flex-1 rounded-md border border-[var(--fyxvo-border)] bg-transparent px-3 py-1.5 text-sm text-[var(--fyxvo-text)] placeholder:text-[var(--fyxvo-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--fyxvo-brand)]"
        />
        <button
          type="submit"
          disabled={submitState === "loading"}
          className="shrink-0 rounded-md border border-[var(--fyxvo-border)] bg-transparent px-3 py-1.5 text-sm font-medium text-[var(--fyxvo-text-muted)] transition-colors hover:text-[var(--fyxvo-text)] disabled:opacity-50"
        >
          {submitState === "loading" ? "Sending…" : "Stay updated"}
        </button>
      </form>
      {submitState === "error" ? (
        <p className="text-xs text-red-500">Something went wrong. Try again.</p>
      ) : null}
    </div>
  );
}
