"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@fyxvo/ui";
import { webEnv } from "../../lib/env";

type VerificationState = "idle" | "loading" | "success" | "error";

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const [state, setState] = useState<VerificationState>("idle");
  const [message, setMessage] = useState("Checking your verification link…");
  const token = useMemo(() => searchParams.get("token") ?? "", [searchParams]);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;
    void fetch(new URL("/v1/me/verify-email/confirm", webEnv.apiBaseUrl), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (response) => {
        const payload = (await response.json().catch(() => ({}))) as { message?: string; error?: string };
        if (cancelled) return;
        if (response.ok) {
          setState("success");
          setMessage(payload.message ?? "Your email is now verified for Fyxvo alerts and digests.");
          return;
        }
        setState("error");
        setMessage(payload.message ?? payload.error ?? "This verification link is invalid or has expired.");
      })
      .catch(() => {
        if (cancelled) return;
        setState("error");
        setMessage("Fyxvo could not verify this email link right now. Try again in a moment.");
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  if (!token) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-[var(--fyxvo-bg)] px-6 py-20">
        <section className="w-full max-w-lg rounded-3xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-8 shadow-[0_16px_60px_rgba(15,23,42,0.14)]">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">Fyxvo</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--fyxvo-text)]">Email verification</h1>
          <p className="mt-4 text-sm leading-6 text-[var(--fyxvo-text-muted)]">
            This verification link is missing a token.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-rose-500/10 px-3 py-1 text-xs font-medium text-rose-400">Could not verify</span>
            <Button asChild size="sm" variant="secondary">
              <Link href="/settings">Open settings</Link>
            </Button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-[var(--fyxvo-bg)] px-6 py-20">
      <section className="w-full max-w-lg rounded-3xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-8 shadow-[0_16px_60px_rgba(15,23,42,0.14)]">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">Fyxvo</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--fyxvo-text)]">Email verification</h1>
        <p className="mt-4 text-sm leading-6 text-[var(--fyxvo-text-muted)]">{message}</p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              state === "success"
                ? "bg-emerald-500/10 text-emerald-400"
                : state === "error"
                  ? "bg-rose-500/10 text-rose-400"
                  : "bg-[var(--fyxvo-panel-soft)] text-[var(--fyxvo-text-muted)]"
            }`}
          >
            {state === "success" ? "Verified" : state === "error" ? "Could not verify" : "Checking"}
          </span>
          <Button asChild size="sm" variant="secondary">
            <Link href="/settings">Open settings</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
