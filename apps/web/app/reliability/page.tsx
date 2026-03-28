import { previewOperators } from "../../lib/sample-data";

export default function ReliabilityPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16">
      <h1 className="text-3xl font-bold tracking-tight text-[var(--fyxvo-text)]">Reliability</h1>
      <p className="mt-4 text-[var(--fyxvo-text-muted)]">
        Fyxvo is built on a distributed network of operator nodes across multiple regions.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {previewOperators.map((op) => (
          <div
            key={op.id}
            className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-4"
          >
            <p className="font-semibold text-[var(--fyxvo-text)]">{op.name}</p>
            <p className="text-xs text-[var(--fyxvo-text-muted)]">{op.region}</p>
            <p className="mt-2 text-2xl font-bold text-[var(--fyxvo-brand)]">{op.uptimePct}%</p>
            <p className="text-xs text-[var(--fyxvo-text-muted)]">uptime</p>
          </div>
        ))}
      </div>
    </div>
  );
}
