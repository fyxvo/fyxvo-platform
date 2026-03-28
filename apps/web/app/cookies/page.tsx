const SECTIONS = [
  {
    title: "Essential product cookies",
    body: "Fyxvo uses essential browser storage and cookie-like mechanisms to preserve theme preference, browser-side session context, and other small pieces of information needed for the web app to behave consistently.",
  },
  {
    title: "Operational analytics",
    body: "The product also records operational events such as performance signals, error reports, and security-related browser telemetry when those paths are enabled. That data supports product reliability rather than third-party advertising.",
  },
  {
    title: "Managing browser storage",
    body: "You can clear or disable browser storage from your own browser settings, but doing so may interrupt wallet auth state, preferences, and other parts of the workspace experience.",
  },
] as const;

export default function CookiesPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <h1 className="text-3xl font-bold tracking-tight text-[var(--fyxvo-text)]">Cookie Policy</h1>
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
