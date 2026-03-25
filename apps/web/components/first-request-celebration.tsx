"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import type { PortalProject } from "../lib/types";

interface Props {
  project: PortalProject;
  requestSummary?: {
    method: string;
    latencyMs: number;
    createdAt: string;
  } | null;
  onDismiss: () => void;
}

function formatTimestamp(value: string): string {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export function FirstRequestCelebration({ project, requestSummary, onDismiss }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onDismiss();
        return;
      }

      if (e.key !== "Tab" || !dialogRef.current) {
        return;
      }

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter((element) => !element.hasAttribute("disabled"));

      if (focusable.length === 0) {
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (!first || !last) {
        return;
      }

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previousFocusRef.current?.focus();
    };
  }, [onDismiss]);

  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  const publicPageHref = project.publicSlug ? `/p/${project.publicSlug}` : null;
  const apiKeyCount = project._count?.apiKeys ?? 0;
  const showCreateApiKey = apiKeyCount <= 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      aria-modal="true"
      role="dialog"
      aria-labelledby="frc-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onDismiss}
        aria-hidden="true"
      />

      {/* Card */}
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="relative z-10 w-full max-w-md rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg-elevated)] p-6 shadow-2xl focus:outline-none"
      >
        <style>{`
          @keyframes ring-burst {
            0% { transform: scale(0.8); opacity: 1; }
            100% { transform: scale(2.5); opacity: 0; }
          }
          .ring-burst {
            animation: ring-burst 1s ease-out forwards;
            border: 2px solid var(--fyxvo-brand);
            border-radius: 50%;
            position: absolute;
            width: 100%;
            height: 100%;
            pointer-events: none;
          }
        `}</style>

        <div className="relative mx-auto mb-4 flex h-16 w-16 items-center justify-center">
          <div className="ring-burst absolute" aria-hidden="true" />
          <svg
            viewBox="0 0 64 64"
            fill="none"
            className="h-10 w-10"
            aria-hidden="true"
          >
            <circle cx="32" cy="32" r="32" fill="var(--fyxvo-brand)" opacity="0.15" />
            <path
              d="M18 32l10 10 18-20"
              stroke="var(--fyxvo-brand)"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <h2
          id="frc-title"
          className="text-xl font-semibold text-[var(--fyxvo-text)]"
        >
          Your first request is live!
        </h2>
        <p className="mt-2 text-sm text-[var(--fyxvo-text-muted)]">
          Project{" "}
          <span className="font-medium text-[var(--fyxvo-text)]">
            {project.name}
          </span>{" "}
          just processed its first request. The relay is working and the next
          steps below adapt to the current project state.
        </p>

        {requestSummary ? (
          <div className="mt-4 grid gap-3 rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4 sm:grid-cols-3">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--fyxvo-text-muted)]">
                Method
              </div>
              <div className="mt-1 text-sm font-medium text-[var(--fyxvo-text)]">
                {requestSummary.method}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--fyxvo-text-muted)]">
                Latency
              </div>
              <div className="mt-1 text-sm font-medium text-[var(--fyxvo-text)]">
                {requestSummary.latencyMs}ms
              </div>
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--fyxvo-text-muted)]">
                Timestamp
              </div>
              <div className="mt-1 text-sm font-medium text-[var(--fyxvo-text)]">
                {formatTimestamp(requestSummary.createdAt)}
              </div>
            </div>
          </div>
        ) : null}

        <ul className="mt-5 space-y-3">
          <li>
            <Link
              href="/analytics"
              className="flex items-center gap-3 rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 py-3 text-sm font-medium text-[var(--fyxvo-text)] transition-colors hover:border-[var(--fyxvo-brand)] hover:text-[var(--fyxvo-brand)]"
              onClick={onDismiss}
            >
              <span className="text-lg" aria-hidden="true">
                📊
              </span>
              Explore Analytics
            </Link>
          </li>
          <li>
            <Link
              href="/settings#team"
              className="flex items-center gap-3 rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 py-3 text-sm font-medium text-[var(--fyxvo-text)] transition-colors hover:border-[var(--fyxvo-brand)] hover:text-[var(--fyxvo-brand)]"
              onClick={onDismiss}
            >
              <span className="text-lg" aria-hidden="true">
                👥
              </span>
              Invite a Teammate
            </Link>
          </li>
          {showCreateApiKey ? (
            <li>
              <Link
                href="/api-keys"
                className="flex items-center gap-3 rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 py-3 text-sm font-medium text-[var(--fyxvo-text)] transition-colors hover:border-[var(--fyxvo-brand)] hover:text-[var(--fyxvo-brand)]"
                onClick={onDismiss}
              >
                <span className="text-lg" aria-hidden="true">
                  🔑
                </span>
                Create API Key
              </Link>
            </li>
          ) : null}
          {publicPageHref ? (
            <li>
              <Link
                href={publicPageHref}
                className="flex items-center gap-3 rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 py-3 text-sm font-medium text-[var(--fyxvo-text)] transition-colors hover:border-[var(--fyxvo-brand)] hover:text-[var(--fyxvo-brand)]"
                onClick={onDismiss}
              >
                <span className="text-lg" aria-hidden="true">
                  🌐
                </span>
                Share Your Project
              </Link>
            </li>
          ) : null}
        </ul>

        <button
          type="button"
          onClick={onDismiss}
          className="mt-6 w-full rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 py-2.5 text-sm font-medium text-[var(--fyxvo-text)] transition-colors hover:bg-[var(--fyxvo-bg-elevated)]"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
