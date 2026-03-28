"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button, Notice } from "@fyxvo/ui";
import { confirmEmailVerification } from "../../lib/api";

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const missingToken = !token;
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (missingToken) {
      return;
    }

    void (async () => {
      setStatus("loading");
      setError(null);
      try {
        await confirmEmailVerification(token);
        setStatus("success");
      } catch (verificationError) {
        setStatus("error");
        setError(
          verificationError instanceof Error
            ? verificationError.message
            : "Email verification failed."
        );
      }
    })();
  }, [missingToken, token]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-8 text-center">
        <h1 className="text-2xl font-bold text-[var(--fyxvo-text)]">Verify your email</h1>

        {status === "loading" ? (
          <div className="mt-6 flex flex-col items-center gap-4">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--fyxvo-border)] border-t-[var(--fyxvo-brand)]" />
            <p className="text-sm text-[var(--fyxvo-text-muted)]">
              Confirming your verification token…
            </p>
          </div>
        ) : status === "success" ? (
          <div className="mt-6 space-y-4">
            <Notice tone="success">Your email address has been verified.</Notice>
            <Button asChild>
              <Link href="/dashboard">Open dashboard</Link>
            </Button>
          </div>
        ) : missingToken ? (
          <div className="mt-6 space-y-4">
            <Notice tone="danger">This verification link is missing a token.</Notice>
            <Button asChild variant="secondary">
              <Link href="/dashboard">Back to dashboard</Link>
            </Button>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            <Notice tone="danger">{error ?? "Email verification failed."}</Notice>
            <Button asChild variant="secondary">
              <Link href="/dashboard">Back to dashboard</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
