export default function Loading() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--fyxvo-border)] border-t-[var(--fyxvo-brand)]" />
        <p className="text-sm text-[var(--fyxvo-text-muted)]">Loading…</p>
      </div>
    </div>
  );
}
