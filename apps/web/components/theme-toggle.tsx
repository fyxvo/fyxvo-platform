"use client";

import { useTheme } from "./theme-provider";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "fyxvo-dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] text-[var(--fyxvo-text-soft)] transition-colors duration-150 hover:bg-[var(--fyxvo-panel)] hover:text-[var(--fyxvo-text)]"
    >
      {isDark ? (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="h-[18px] w-[18px]"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2.5v2.2" />
          <path d="M12 19.3v2.2" />
          <path d="M4.9 4.9l1.6 1.6" />
          <path d="M17.5 17.5l1.6 1.6" />
          <path d="M2.5 12h2.2" />
          <path d="M19.3 12h2.2" />
          <path d="M4.9 19.1l1.6-1.6" />
          <path d="M17.5 6.5l1.6-1.6" />
        </svg>
      ) : (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="h-[18px] w-[18px]"
        >
          <path d="M18 15.8A7.5 7.5 0 018.2 6a8.6 8.6 0 1010 9.8z" />
        </svg>
      )}
    </button>
  );
}
