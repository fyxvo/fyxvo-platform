"use client";

import { useState } from "react";
import { Button } from "@fyxvo/ui";
import { API_BASE } from "../lib/env";

interface EmailSubscribeFormProps {
  endpoint: "/v1/newsletter/subscribe" | "/v1/status/subscribe";
  buttonLabel: string;
  successMessage: string;
  source: string;
  compact?: boolean;
  inputLabel?: string;
}

export function EmailSubscribeForm({
  endpoint,
  buttonLabel,
  successMessage,
  source,
  compact = false,
  inputLabel = "Email address",
}: EmailSubscribeFormProps) {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), source }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        success?: boolean;
        error?: string;
        message?: string;
      };

      if (!response.ok || payload.success !== true) {
        throw new Error(payload.message ?? payload.error ?? "Unable to submit this request.");
      }

      setSuccess(true);
      setEmail("");
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Unable to submit this request."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      {success ? (
        <p className="text-sm text-emerald-300">{successMessage}</p>
      ) : (
        <form
          onSubmit={(event) => void handleSubmit(event)}
          className={compact ? "flex flex-col gap-3" : "flex flex-col gap-3 sm:flex-row"}
        >
          <input
            type="email"
            aria-label={inputLabel}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            required
            className="h-11 flex-1 rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 text-sm text-[var(--fyxvo-text)] outline-none focus:border-[var(--fyxvo-brand)] focus:ring-2 focus:ring-[var(--fyxvo-brand)]/30"
          />
          <Button type="submit" loading={submitting} disabled={submitting}>
            {buttonLabel}
          </Button>
        </form>
      )}
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
    </div>
  );
}
