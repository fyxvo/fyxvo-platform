"use client";

import { useState } from "react";

type SubscribeState = "idle" | "loading" | "success" | "error";

export function StatusSubscribeForm() {
  const [subscribeEmail, setSubscribeEmail] = useState("");
  const [subscribeState, setSubscribeState] = useState<SubscribeState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubscribe() {
    const normalizedEmail = subscribeEmail.trim();
    if (!normalizedEmail.includes("@")) return;
    setSubscribeState("loading");
    setErrorMessage(null);
    try {
      const res = await fetch("/api/status-subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail }),
      });
      if (res.ok) {
        setSubscribeState("success");
        setSubscribeEmail("");
      } else {
        const body = (await res.json().catch(() => ({ error: null }))) as { error?: string | null };
        setErrorMessage(body.error ?? "Unable to save your status subscription right now.");
        setSubscribeState("error");
      }
    } catch {
      setErrorMessage("Unable to save your status subscription right now.");
      setSubscribeState("error");
    }
  }

  return (
    <section className="border-t border-[var(--fyxvo-border)] py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-md text-center">
          <h2 className="font-display text-xl font-semibold text-[var(--fyxvo-text)]">
            Stay informed
          </h2>
          <p className="mt-2 text-sm text-[var(--fyxvo-text-muted)]">
            Join the status subscriber list for incident update emails and live operational notices.
          </p>
          <div className="mt-4 flex gap-2">
            <input
              type="email"
              aria-label="Status subscription email"
              placeholder="your@email.com"
              className="flex-1 rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg-elevated)] px-3 py-2 text-sm text-[var(--fyxvo-text)] placeholder:text-[var(--fyxvo-text-muted)] outline-none focus:border-[var(--fyxvo-brand,#7c3aed)]"
              value={subscribeEmail}
              onChange={(e) => setSubscribeEmail(e.target.value)}
            />
            <button
              type="button"
              disabled={subscribeState === "loading" || !subscribeEmail.includes("@")}
              onClick={() => void handleSubscribe()}
              className="rounded-lg bg-[var(--fyxvo-brand,#7c3aed)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50 hover:opacity-90 transition"
            >
              {subscribeState === "loading"
                ? "Subscribing…"
                : subscribeState === "success"
                  ? "Saved"
                  : "Join list"}
            </button>
          </div>
          {subscribeState === "success" && (
            <p className="mt-2 text-xs text-[var(--fyxvo-text-muted)]">
              ✓ Your email is on the Fyxvo status subscriber list for incident updates.
            </p>
          )}
          {subscribeState === "error" && errorMessage ? (
            <p className="mt-2 text-xs text-rose-400">{errorMessage}</p>
          ) : null}
          <p className="mt-2 text-xs text-[var(--fyxvo-text-muted)] opacity-60">
            Stored for status communications only. No marketing list crossover.
          </p>
        </div>
      </div>
    </section>
  );
}
