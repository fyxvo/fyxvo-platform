"use client";

import Link from "next/link";
import { useState } from "react";

const STORAGE_KEY = "fyxvo-cookies-accepted";

function hasAccepted() {
  try {
    return Boolean(localStorage.getItem(STORAGE_KEY));
  } catch {
    return true;
  }
}

export function CookieNotice() {
  const [visible, setVisible] = useState(() => !hasAccepted());

  function dismiss() {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore
    }
    setVisible(false);
  }

  if (!visible) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-4 rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg-elevated)] px-5 py-4 shadow-[0_8px_32px_rgba(0,0,0,0.18)] backdrop-blur-xl">
        <p className="text-sm text-[var(--fyxvo-text-muted)]">
          Fyxvo uses cookies and local storage for session management and preferences.{" "}
          <Link href="/cookies" className="text-[var(--fyxvo-brand)] dark:text-brand-400 hover:text-brand-600 dark:hover:text-brand-300 underline-offset-2 hover:underline">
            Cookie policy
          </Link>
        </p>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 py-2 text-sm font-medium text-[var(--fyxvo-text)] transition hover:bg-[var(--fyxvo-panel)]"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
