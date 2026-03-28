export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-3xl font-bold tracking-tight text-[var(--fyxvo-text)]">Privacy Policy</h1>
      <p className="mt-4 text-xs text-[var(--fyxvo-text-muted)]">Last updated: March 2026</p>
      <div className="mt-6 space-y-6 text-sm text-[var(--fyxvo-text-muted)]">
        <section>
          <h2 className="text-lg font-semibold text-[var(--fyxvo-text)]">Data We Collect</h2>
          <p className="mt-2">
            We collect wallet addresses, usage metrics, and email addresses when provided. We do not
            sell personal data.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-[var(--fyxvo-text)]">How We Use Data</h2>
          <p className="mt-2">
            Data is used to provide, improve, and secure the Fyxvo service.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-[var(--fyxvo-text)]">Contact</h2>
          <p className="mt-2">
            For privacy inquiries:{" "}
            <a href="mailto:privacy@fyxvo.com" className="text-[var(--fyxvo-brand)]">
              privacy@fyxvo.com
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}
