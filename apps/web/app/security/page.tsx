export default function SecurityPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-3xl font-bold tracking-tight text-[var(--fyxvo-text)]">Security</h1>
      <div className="mt-6 prose prose-invert max-w-none text-[var(--fyxvo-text-muted)]">
        <p>
          Fyxvo takes security seriously. All data is encrypted in transit and at rest. We perform
          regular security audits and welcome responsible disclosure.
        </p>
        <h2 className="mt-8 text-xl font-semibold text-[var(--fyxvo-text)]">Responsible Disclosure</h2>
        <p>
          If you discover a security vulnerability, please email{" "}
          <a href="mailto:security@fyxvo.com" className="text-[var(--fyxvo-brand)]">
            security@fyxvo.com
          </a>
          . We aim to respond within 24 hours.
        </p>
      </div>
    </div>
  );
}
