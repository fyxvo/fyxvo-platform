export default function DashboardLoading() {
  return (
    <div className="space-y-6" aria-live="polite" aria-busy="true">
      <div className="h-40 animate-pulse rounded-[1.75rem] border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)]" />
      <div className="grid gap-4 xl:grid-cols-2">
        <div className="h-64 animate-pulse rounded-[1.75rem] border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)]" />
        <div className="h-64 animate-pulse rounded-[1.75rem] border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)]" />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="h-52 animate-pulse rounded-[1.75rem] border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)]" />
        <div className="h-52 animate-pulse rounded-[1.75rem] border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)]" />
        <div className="h-52 animate-pulse rounded-[1.75rem] border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)]" />
      </div>
    </div>
  );
}
