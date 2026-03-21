"use client";

import { useEffect, useState } from "react";

const SHORTCUTS = [
  { keys: ["⌘", "K"], description: "Open command palette", category: "Navigation" },
  { keys: ["Esc"], description: "Close panel or modal", category: "Navigation" },
  { keys: ["?"], description: "Show keyboard shortcuts", category: "Navigation" },
  { keys: ["N"], description: "New project (on dashboard)", category: "Dashboard" },
  { keys: ["F"], description: "Copy current page URL", category: "Page" },
  { keys: ["↑", "↓"], description: "Navigate results", category: "Command palette" },
  { keys: ["↵"], description: "Select result", category: "Command palette" },
] as const;

type Shortcut = (typeof SHORTCUTS)[number];

const CATEGORIES = Array.from(new Set(SHORTCUTS.map((s) => s.category)));

export function KeyboardShortcuts({
  open: openProp,
  onClose,
}: {
  readonly open?: boolean;
  readonly onClose?: () => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);

  const isControlled = openProp !== undefined;
  const isOpen = isControlled ? openProp : internalOpen;

  function close() {
    if (isControlled) {
      onClose?.();
    } else {
      setInternalOpen(false);
    }
  }

  // Listen for ? key to open (when not controlled externally)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT"
      ) {
        return;
      }
      if (e.key === "?") {
        e.preventDefault();
        if (!isControlled) {
          setInternalOpen((v) => !v);
        }
      }
      if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        close();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isControlled]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={close}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" aria-hidden="true" />

      {/* Panel */}
      <div
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg-elevated)] shadow-[0_24px_64px_rgba(0,0,0,0.28)]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Keyboard shortcuts"
      >
        <div className="flex items-center justify-between border-b border-[var(--fyxvo-border)] px-5 py-4">
          <span className="text-sm font-semibold text-[var(--fyxvo-text)]">Keyboard shortcuts</span>
          <button
            type="button"
            onClick={close}
            aria-label="Close keyboard shortcuts"
            className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--fyxvo-text-muted)] hover:bg-[var(--fyxvo-panel-soft)] hover:text-[var(--fyxvo-text)] transition"
          >
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true">
              <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="divide-y divide-[var(--fyxvo-border)] px-5 py-2">
          {CATEGORIES.map((category) => {
            const categoryShortcuts = SHORTCUTS.filter(
              (s): s is Shortcut => s.category === category
            );
            return (
              <div key={category} className="py-3">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--fyxvo-text-muted)]">
                  {category}
                </p>
                <div className="space-y-1.5">
                  {categoryShortcuts.map((shortcut) => (
                    <div
                      key={shortcut.description}
                      className="flex items-center justify-between gap-4"
                    >
                      <span className="text-sm text-[var(--fyxvo-text-soft)]">
                        {shortcut.description}
                      </span>
                      <div className="flex shrink-0 items-center gap-1">
                        {shortcut.keys.map((key) => (
                          <kbd
                            key={key}
                            className="inline-flex min-w-[1.5rem] items-center justify-center rounded border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-1.5 py-0.5 font-mono text-[11px] font-medium text-[var(--fyxvo-text)]"
                          >
                            {key}
                          </kbd>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="border-t border-[var(--fyxvo-border)] px-5 py-3">
          <p className="text-xs text-[var(--fyxvo-text-muted)]">
            Press <kbd className="inline-flex items-center rounded border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-1 font-mono text-[11px] font-medium text-[var(--fyxvo-text)]">Esc</kbd> or click outside to close
          </p>
        </div>
      </div>
    </div>
  );
}
