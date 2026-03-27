"use client";

import { useState } from "react";
import { Button } from "@fyxvo/ui";
import Link from "next/link";

const STEPS = [
  {
    step: 1,
    title: "Welcome to Fyxvo",
    body: "Fyxvo is a Solana devnet control plane for funded RPC access, project operations, request traces, alerts, and assistant-guided support.",
    action: null,
    isCode: false,
  },
  {
    step: 2,
    title: "Create your first project",
    body: "Projects are the operating unit inside Fyxvo. Each one gets its own funding state, endpoint path, API keys, analytics, and settings.",
    action: { label: "Go to Dashboard", href: "/dashboard" },
    isCode: false,
  },
  {
    step: 3,
    title: "Fund with devnet SOL",
    body: "Requests are paid from your project's funded balance. Top up with devnet SOL to validate the real accounting flow before you ship broader usage.",
    action: { label: "Fund a project", href: "/funding" },
    isCode: false,
  },
  {
    step: 4,
    title: "Create an API key",
    body: "API keys are project-scoped credentials for the relay. Create a key with the scopes your app needs, then rotate or revoke it from the workspace whenever required.",
    action: { label: "Create API key", href: "/api-keys" },
    isCode: false,
  },
  {
    step: 5,
    title: "Make your first request",
    body: "Start with the standard relay path and add your project key in the request headers.",
    action: { label: "Read the docs", href: "/docs" },
    isCode: true,
  },
];

export function WelcomeModal({ onDismiss }: { onDismiss: () => void }) {
  const [step, setStep] = useState(0);
  const current = STEPS[step]!;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg-elevated)] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--fyxvo-border)] px-6 py-4">
          <div className="flex items-center gap-2">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 w-6 rounded-full transition-colors ${i <= step ? "bg-[var(--fyxvo-brand)]" : "bg-[var(--fyxvo-border)]"}`}
              />
            ))}
          </div>
          <button
            onClick={onDismiss}
            className="text-xs text-[var(--fyxvo-text-muted)] hover:text-[var(--fyxvo-text)] transition-colors"
          >
            Skip
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          <p className="text-xs uppercase tracking-wider text-[var(--fyxvo-brand)] mb-1">Step {step + 1} of {STEPS.length}</p>
          <h2 className="font-display text-xl font-semibold text-[var(--fyxvo-text)] mb-3">{current.title}</h2>
          {current.isCode ? (
            <div>
              <p className="text-sm text-[var(--fyxvo-text-muted)] mb-3">Start with the standard relay endpoint:</p>
              <pre className="rounded-xl bg-[var(--fyxvo-bg)] border border-[var(--fyxvo-border)] p-4 text-xs text-[var(--fyxvo-text)] overflow-x-auto">
                {`const connection = new Connection("https://rpc.fyxvo.com/rpc", {\n  httpHeaders: { "X-Api-Key": "fyxvo_live_YOUR_KEY" }\n});`}
              </pre>
            </div>
          ) : (
            <p className="text-sm leading-relaxed text-[var(--fyxvo-text-muted)]">{current.body}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[var(--fyxvo-border)] px-6 py-4 gap-3">
          <Button variant="ghost" size="sm" onClick={() => step > 0 && setStep(step - 1)} disabled={step === 0}>
            Back
          </Button>
          <div className="flex gap-2">
            {current.action && (
              <Button asChild variant="secondary" size="sm">
                <Link href={current.action.href} onClick={onDismiss}>{current.action.label}</Link>
              </Button>
            )}
            {step < STEPS.length - 1 ? (
              <Button size="sm" onClick={() => setStep(step + 1)}>Next</Button>
            ) : (
              <Button size="sm" onClick={onDismiss}>Open workspace</Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
