"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { usePortal } from "../lib/portal-context";

interface AuthGateProps {
  children: ReactNode;
  message?: string;
}

export function AuthGate({ children, message }: AuthGateProps) {
  const { walletPhase } = usePortal();

  if (walletPhase !== "authenticated") {
    return (
      <div className="flex flex-col items-center justify-center gap-6 py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)]">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            width={28}
            height={28}
            className="text-[var(--fyxvo-text-muted)]"
            aria-hidden="true"
          >
            <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <div>
          <p className="font-semibold text-[var(--fyxvo-text)]">Connect your wallet to continue</p>
          {message ? (
            <p className="mt-1 text-sm text-[var(--fyxvo-text-muted)]">{message}</p>
          ) : null}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}

export function EmptyState({ title, description, action, icon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      {icon ? (
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)]">
          {icon}
        </div>
      ) : null}
      <div>
        <p className="font-semibold text-[var(--fyxvo-text)]">{title}</p>
        {description ? (
          <p className="mt-1 text-sm text-[var(--fyxvo-text-muted)]">{description}</p>
        ) : null}
      </div>
      {action ?? null}
    </div>
  );
}

export function LoadingPanel({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-12 rounded-xl animate-pulse bg-[var(--fyxvo-panel-soft)]"
        />
      ))}
    </div>
  );
}

export function ErrorPanel({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-rose-500/20 bg-rose-500/8 p-4 text-sm text-rose-400">
      {message}
    </div>
  );
}

export function AdminGate({ children }: { children: ReactNode }) {
  const { walletPhase, user } = usePortal();

  if (walletPhase !== "authenticated") {
    return (
      <AuthGate message="Administrative tools require an authenticated wallet session.">
        <></>
      </AuthGate>
    );
  }

  if (user?.role !== "ADMIN" && user?.role !== "OWNER") {
    return (
      <div className="mx-auto max-w-3xl rounded-[2rem] border border-rose-500/20 bg-rose-500/8 p-8 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-rose-400">403</p>
        <h2 className="mt-3 text-2xl font-semibold text-[var(--fyxvo-text)]">
          Admin access is required
        </h2>
        <p className="mt-3 text-sm leading-6 text-[var(--fyxvo-text-soft)]">
          This part of the workspace is reserved for owner and admin wallets.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] px-4 py-2 text-sm font-medium text-[var(--fyxvo-text)] transition hover:border-[var(--fyxvo-brand)]"
        >
          Back to dashboard
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
