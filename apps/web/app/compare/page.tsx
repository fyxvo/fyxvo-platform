const COMPARISON = [
  { feature: "Wallet-based authentication", fyxvo: true, competitor: false },
  { feature: "On-chain project activation", fyxvo: true, competitor: false },
  { feature: "Funded project treasury", fyxvo: true, competitor: false },
  { feature: "Scoped API keys", fyxvo: true, competitor: true },
  { feature: "Request traces and alerts", fyxvo: true, competitor: false },
  { feature: "Priority relay lane", fyxvo: true, competitor: false },
];

export default function ComparePage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <h1 className="text-3xl font-bold tracking-tight text-[var(--fyxvo-text)]">
        Fyxvo vs. generic RPC
      </h1>
      <p className="mt-4 text-[var(--fyxvo-text-muted)]">
        The difference is not just faster nodes. Fyxvo adds project activation, funding, keys,
        analytics, alerts, and public trust surfaces around the relay itself.
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
                    <span className="text-emerald-400">Included</span>
                  ) : (
                    <span className="text-rose-400">Not included</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  {row.competitor ? (
                    <span className="text-emerald-400">Included</span>
                  ) : (
                    <span className="text-rose-400">Not included</span>
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
