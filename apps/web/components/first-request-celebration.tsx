"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import type { PortalProject } from "../lib/types";

interface Props {
  project: PortalProject;
  onDismiss: () => void;
}

export function FirstRequestCelebration({ project, onDismiss }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onDismiss();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onDismiss]);

  // Trap focus inside modal on open
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
          just processed its first request. The relay is working — here&apos;s
          what to do next.
        </p>

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
