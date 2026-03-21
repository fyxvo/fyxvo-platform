"use client";

import { useState } from "react";

type SubscribeState = "idle" | "loading" | "success" | "error";

export function StatusSubscribeForm() {
  const [subscribeEmail, setSubscribeEmail] = useState("");
  const [subscribeState, setSubscribeState] = useState<SubscribeState>("idle");

  async function handleSubscribe() {
    if (!subscribeEmail.includes("@")) return;
    setSubscribeState("loading");
    try {
      const res = await fetch("/api/status-subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: subscribeEmail }),
      });
      if (res.ok) {
        setSubscribeState("success");
      } else {
        setSubscribeState("error");
      }
    } catch {
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
            Get notified when incidents are opened or resolved.
          </p>
          <div className="mt-4 flex gap-2">
            <input
              type="email"
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
                  ? "Subscribed!"
                  : "Notify me"}
            </button>
          </div>
          {subscribeState === "success" && (
            <p className="mt-2 text-xs text-[var(--fyxvo-text-muted)]">
              ✓ You&apos;ll be notified when status changes. (Email alerts launch soon.)
            </p>
          )}
          <p className="mt-2 text-xs text-[var(--fyxvo-text-muted)] opacity-60">
            Email alerts are coming soon.
          </p>
        </div>
      </div>
    </section>
  );
}
