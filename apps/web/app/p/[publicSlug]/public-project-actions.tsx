"use client";

interface PublicProjectActionsProps {
  readonly publicSlug: string;
  readonly variant?: "share" | "copy-rpc";
}

export function PublicProjectActions({
  publicSlug,
  variant = "share",
}: PublicProjectActionsProps) {
  if (variant === "copy-rpc") {
    return (
      <button
        type="button"
        onClick={() => void navigator.clipboard.writeText("https://rpc.fyxvo.com/rpc")}
        className="shrink-0 rounded border border-[var(--fyxvo-border)] px-2 py-1 text-xs text-[var(--fyxvo-text-muted)] hover:bg-[var(--fyxvo-bg-elevated)] transition"
      >
        Copy
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() =>
        void navigator.clipboard.writeText(`https://www.fyxvo.com/p/${publicSlug}`)
      }
      className="flex items-center gap-1.5 rounded-md border border-[var(--fyxvo-border)] bg-transparent px-3 py-1.5 text-xs text-[var(--fyxvo-text-muted)] hover:bg-[var(--fyxvo-panel-soft)] hover:text-[var(--fyxvo-text)] transition"
    >
      <svg
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="h-3.5 w-3.5"
        aria-hidden="true"
      >
        <circle cx="12" cy="3" r="1.5" />
        <circle cx="4" cy="8" r="1.5" />
        <circle cx="12" cy="13" r="1.5" />
        <path d="M5.5 7l5-3M5.5 9l5 3" />
      </svg>
      Share
    </button>
  );
}
