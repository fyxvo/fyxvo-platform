const SECTIONS = [
  {
    title: "Using the service",
    body: "By using Fyxvo, you agree to use the product lawfully and to respect the wallet, project, and API key boundaries that the platform enforces. You are responsible for activity that happens through your wallet session and keys.",
  },
  {
    title: "Alpha-stage expectations",
    body: "Fyxvo is a live devnet private alpha product. Features, pricing, limits, and workflows can change as the product hardens. The service is presented honestly as an evolving rollout, not as a finished public mainnet offering.",
  },
  {
    title: "Funding and usage",
    body: "Projects use funded devnet balances and published lamport pricing. If a project runs out of funded balance or is otherwise paused, the relay may stop serving requests until the project is topped up or re-enabled.",
  },
  {
    title: "Availability and liability",
    body: "Fyxvo aims to operate reliably and transparently, but the service is provided as-is during this alpha stage. Users should not treat the current devnet deployment as a guarantee of uninterrupted service or a substitute for their own operational review.",
  },
] as const;

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <h1 className="text-3xl font-bold tracking-tight text-[var(--fyxvo-text)]">Terms of Service</h1>
      <p className="mt-4 text-xs text-[var(--fyxvo-text-muted)]">Last updated: March 2026</p>

      <div className="mt-8 space-y-5">
        {SECTIONS.map((section) => (
          <section
            key={section.title}
            className="rounded-3xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-6"
          >
            <h2 className="text-lg font-semibold text-[var(--fyxvo-text)]">{section.title}</h2>
            <p className="mt-3 text-sm leading-7 text-[var(--fyxvo-text-soft)]">{section.body}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
