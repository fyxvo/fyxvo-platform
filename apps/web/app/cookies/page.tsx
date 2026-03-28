export default function CookiesPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-3xl font-bold tracking-tight text-[var(--fyxvo-text)]">Cookie Policy</h1>
      <p className="mt-4 text-xs text-[var(--fyxvo-text-muted)]">Last updated: March 2026</p>
      <div className="mt-6 space-y-6 text-sm text-[var(--fyxvo-text-muted)]">
        <section>
          <h2 className="text-lg font-semibold text-[var(--fyxvo-text)]">What Are Cookies</h2>
          <p className="mt-2">
            Cookies are small text files stored in your browser. Fyxvo uses essential cookies to
            maintain session state and preferences.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-[var(--fyxvo-text)]">Managing Cookies</h2>
          <p className="mt-2">
            You can disable cookies in your browser settings, though this may affect functionality.
          </p>
        </section>
      </div>
    </div>
  );
}
