import { previewOperators } from "../../lib/sample-data";

export default function OperatorsPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16">
      <h1 className="text-3xl font-bold tracking-tight text-[var(--fyxvo-text)]">Operators</h1>
      <p className="mt-4 text-[var(--fyxvo-text-muted)]">
        The decentralized network of nodes powering Fyxvo.
      </p>
      <div className="mt-8 overflow-hidden rounded-xl border border-[var(--fyxvo-border)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)]">
              <th className="px-4 py-3 text-left font-medium text-[var(--fyxvo-text-muted)]">Node</th>
              <th className="px-4 py-3 text-left font-medium text-[var(--fyxvo-text-muted)]">Region</th>
              <th className="px-4 py-3 text-left font-medium text-[var(--fyxvo-text-muted)]">Status</th>
              <th className="px-4 py-3 text-right font-medium text-[var(--fyxvo-text-muted)]">Uptime</th>
            </tr>
          </thead>
          <tbody>
            {previewOperators.map((op) => (
              <tr
                key={op.id}
                className="border-b border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] last:border-0"
              >
                <td className="px-4 py-3 font-medium text-[var(--fyxvo-text)]">{op.name}</td>
                <td className="px-4 py-3 text-[var(--fyxvo-text-muted)]">{op.region}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1.5 text-emerald-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    {op.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-[var(--fyxvo-brand)]">{op.uptimePct}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
