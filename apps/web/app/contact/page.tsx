"use client";

import { Button } from "@fyxvo/ui";
import { useState } from "react";

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <h1 className="text-3xl font-bold tracking-tight text-[var(--fyxvo-text)]">Contact</h1>
      <p className="mt-4 text-[var(--fyxvo-text-muted)]">
        Have a question or want to talk to sales? Send us a message.
      </p>

      {submitted ? (
        <div className="mt-8 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-emerald-400">
          Thanks for reaching out! We&apos;ll be in touch shortly.
        </div>
      ) : (
        <form
          className="mt-8 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            setSubmitted(true);
          }}
        >
          <div>
            <label className="block text-sm font-medium text-[var(--fyxvo-text)]" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              className="mt-1 h-11 w-full rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 text-sm text-[var(--fyxvo-text)] outline-none focus:border-[var(--fyxvo-brand)]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--fyxvo-text)]" htmlFor="message">
              Message
            </label>
            <textarea
              id="message"
              rows={5}
              required
              className="mt-1 w-full resize-none rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 py-3 text-sm text-[var(--fyxvo-text)] outline-none focus:border-[var(--fyxvo-brand)]"
            />
          </div>
          <Button type="submit" variant="primary">
            Send message
          </Button>
        </form>
      )}
    </div>
  );
}
