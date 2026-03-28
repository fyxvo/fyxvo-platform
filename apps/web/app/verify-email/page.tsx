"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

const API = "https://api.fyxvo.com";

type VerificationState = "idle" | "loading" | "success" | "error";

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get("token") ?? "", [searchParams]);

  const [state, setState] = useState<VerificationState>(
    token ? "loading" : "idle"
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;
    setState("loading");

    void fetch(`${API}/v1/me/verify-email/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        if (cancelled) return;
        const payload = (await res.json().catch(() => ({}))) as {
          message?: string;
          error?: string;
        };
        if (res.ok) {
          setState("success");
        } else {
          setState("error");
          setErrorMessage(
            payload.message ??
              payload.error ??
              "This verification link is invalid or has expired."
          );
        }
      })
      .catch(() => {
        if (cancelled) return;
        setState("error");
        setErrorMessage(
          "Could not reach the verification server. Please try again in a moment."
        );
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  if (!token) {
    return (
      <main
        className="flex min-h-screen items-center justify-center p-6"
        style={{ backgroundColor: "#0a0a0f" }}
      >
        <div className="w-full max-w-lg rounded-2xl border border-white/[0.08] bg-white/[0.03] p-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#f97316]">
            Fyxvo
          </p>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-[#f1f5f9]">
            Email verification
          </h1>
          <p className="mt-4 text-sm leading-6 text-[#64748b]">
            This verification link is missing a token. Please check your email
            for the correct link or request a new verification email from
            settings.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-rose-500/10 px-3 py-1 text-xs font-medium text-rose-400">
              Missing token
            </span>
            <Link
              href="/settings"
              className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2 text-xs font-medium text-[#f1f5f9] transition-colors hover:bg-white/[0.08]"
            >
              Open settings
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main
      className="flex min-h-screen items-center justify-center p-6"
      style={{ backgroundColor: "#0a0a0f" }}
    >
      <div className="w-full max-w-lg rounded-2xl border border-white/[0.08] bg-white/[0.03] p-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#f97316]">
          Fyxvo
        </p>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-[#f1f5f9]">
          Email verification
        </h1>

        {state === "loading" && (
          <>
            <div className="mt-6 flex items-center gap-3">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#f97316]/30 border-t-[#f97316]" />
              <p className="text-sm text-[#64748b]">Verifying your email&hellip;</p>
            </div>
          </>
        )}

        {state === "success" && (
          <>
            <div className="mt-6 flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10">
                <svg
                  className="h-4 w-4 text-emerald-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <p className="text-sm font-medium text-emerald-400">
                Your email has been verified.
              </p>
            </div>
            <p className="mt-4 text-sm text-[#64748b]">
              Your email address is now confirmed. You will receive notifications
              and alerts at this address going forward.
            </p>
            <div className="mt-6">
              <Link
                href="/dashboard"
                className="inline-flex rounded-xl bg-[#f97316] px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                Go to dashboard
              </Link>
            </div>
          </>
        )}

        {state === "error" && (
          <>
            <div className="mt-6 flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-500/10">
                <svg
                  className="h-4 w-4 text-rose-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
              <p className="text-sm font-medium text-rose-400">
                Verification failed
              </p>
            </div>
            {errorMessage && (
              <p className="mt-4 text-sm text-[#64748b]">{errorMessage}</p>
            )}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                href="/settings"
                className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2 text-xs font-medium text-[#f1f5f9] transition-colors hover:bg-white/[0.08]"
              >
                Request a new verification
              </Link>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
