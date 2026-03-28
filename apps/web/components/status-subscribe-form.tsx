"use client";

import { Button } from "@fyxvo/ui";
import { useState } from "react";

export function StatusSubscribeForm() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/status-subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Subscription failed");
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Subscription failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <p className="text-sm text-emerald-400">
        ✓ Your email is on the Fyxvo status subscriber list for incident updates.
      </p>
    );
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-3">
      <div className="flex gap-2">
        <input
          type="email"
          aria-label="Status subscription email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="h-11 flex-1 rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 text-sm text-[var(--fyxvo-text)] placeholder:text-[var(--fyxvo-text-muted)] outline-none focus:border-[var(--fyxvo-brand)] focus:ring-2 focus:ring-[var(--fyxvo-brand)]/30"
        />
        <Button type="submit" loading={submitting} disabled={submitting}>
          Join list
        </Button>
      </div>
      {error ? <p className="text-sm text-rose-400">{error}</p> : null}
    </form>
  );
}
