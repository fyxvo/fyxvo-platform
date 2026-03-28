export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-3xl font-bold tracking-tight text-[var(--fyxvo-text)]">Terms of Service</h1>
      <p className="mt-4 text-xs text-[var(--fyxvo-text-muted)]">Last updated: March 2026</p>
      <div className="mt-6 space-y-6 text-sm text-[var(--fyxvo-text-muted)]">
        <section>
          <h2 className="text-lg font-semibold text-[var(--fyxvo-text)]">Acceptance of Terms</h2>
          <p className="mt-2">
            By using Fyxvo, you agree to these terms. If you do not agree, do not use the service.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-[var(--fyxvo-text)]">Use of Service</h2>
          <p className="mt-2">
            You may use Fyxvo only for lawful purposes and in accordance with these terms.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-[var(--fyxvo-text)]">Limitation of Liability</h2>
          <p className="mt-2">
            Fyxvo is provided &quot;as is&quot; without warranties of any kind.
          </p>
        </section>
      </div>
    </div>
  );
}
