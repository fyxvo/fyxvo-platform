const COMPARISON = [
  { feature: "Standard RPC", fyxvo: true, competitor: true },
  { feature: "Priority Relay", fyxvo: true, competitor: false },
  { feature: "On-chain treasury", fyxvo: true, competitor: false },
  { feature: "Real-time analytics", fyxvo: true, competitor: true },
  { feature: "AI assistant", fyxvo: true, competitor: false },
  { feature: "Custom SLA", fyxvo: true, competitor: true },
];

export default function ComparePage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <h1 className="text-3xl font-bold tracking-tight text-[var(--fyxvo-text)]">
        Fyxvo vs. the rest
      </h1>
      <p className="mt-4 text-[var(--fyxvo-text-muted)]">
        See how Fyxvo stacks up against generic RPC providers.
      </p>
      <div className="mt-8 overflow-hidden rounded-xl border border-[var(--fyxvo-border)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)]">
              <th className="px-4 py-3 text-left font-medium text-[var(--fyxvo-text-muted)]">Feature</th>
              <th className="px-4 py-3 text-center font-medium text-[var(--fyxvo-brand)]">Fyxvo</th>
              <th className="px-4 py-3 text-center font-medium text-[var(--fyxvo-text-muted)]">Others</th>
            </tr>
          </thead>
          <tbody>
            {COMPARISON.map((row) => (
              <tr
                key={row.feature}
                className="border-b border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] last:border-0"
              >
                <td className="px-4 py-3 text-[var(--fyxvo-text)]">{row.feature}</td>
                <td className="px-4 py-3 text-center">
                  {row.fyxvo ? (
                    <span className="text-emerald-400">✓</span>
                  ) : (
                    <span className="text-rose-400">✗</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  {row.competitor ? (
                    <span className="text-emerald-400">✓</span>
                  ) : (
                    <span className="text-rose-400">✗</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
