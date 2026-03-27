"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";

export function FeedbackWidget() {
  const pathname = usePathname();
  const [dismissed, setDismissed] = useState(false);
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState<"up" | "down" | null>(null);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (dismissed) return null;

  async function handleSubmit() {
    if (!rating) return;
    setSubmitting(true);
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ rating, comment: comment.trim() || null, page: pathname }),
      });
      setSubmitted(true);
      setTimeout(() => { setDismissed(true); }, 2000);
    } catch {
      // Silent fail — feedback is non-critical
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed bottom-6 left-4 z-40 sm:left-6">
      {!open ? (
        <div className="flex items-center gap-2 rounded-full border border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg-elevated)] px-2 py-1.5 shadow-sm">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex items-center rounded-full px-2 py-0.5 text-xs text-[var(--fyxvo-text-muted)] transition-all hover:text-[var(--fyxvo-text)]"
            aria-label="Give feedback"
          >
            <span>Feedback</span>
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setDismissed(true); }}
            className="rounded-full p-1 text-[var(--fyxvo-text-muted)] opacity-50 transition hover:opacity-100"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      ) : (
        <div className="w-64 rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg-elevated)] p-4 shadow-xl">
          {submitted ? (
            <p className="text-sm text-[var(--fyxvo-text)]">Thanks for your feedback!</p>
          ) : (
            <>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-medium text-[var(--fyxvo-text)]">Was this page helpful?</p>
                <button type="button" onClick={() => setOpen(false)} className="text-xs text-[var(--fyxvo-text-muted)] hover:text-[var(--fyxvo-text)]">✕</button>
              </div>
              <div className="mb-3 flex gap-2">
                {(["up", "down"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRating(r)}
                    className={`flex-1 rounded-lg border py-2 text-lg transition-colors ${
                      rating === r
                        ? "border-[var(--fyxvo-brand)]/50 bg-[var(--fyxvo-brand-subtle)]"
                        : "border-[var(--fyxvo-border)] hover:border-[var(--fyxvo-border-strong)]"
                    }`}
                    aria-label={r === "up" ? "Thumbs up" : "Thumbs down"}
                  >
                    {r === "up" ? "👍" : "👎"}
                  </button>
                ))}
              </div>
              {rating && (
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Optional comment…"
                  rows={2}
                  maxLength={500}
                  className="mb-3 w-full resize-none rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-3 py-2 text-xs text-[var(--fyxvo-text)] placeholder:text-[var(--fyxvo-text-muted)] focus:outline-none"
                />
              )}
              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={!rating || submitting}
                className="w-full rounded-lg bg-[var(--fyxvo-brand)] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40 hover:bg-[var(--fyxvo-brand-strong)] transition-colors"
              >
                {submitting ? "Sending…" : "Send feedback"}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
