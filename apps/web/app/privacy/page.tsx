const SECTIONS = [
  {
    title: "What Fyxvo collects",
    body: "Fyxvo collects wallet addresses, project metadata, API key metadata, request logs, analytics summaries, and email addresses when users choose to provide them for verification, digests, newsletters, support, or status updates.",
  },
  {
    title: "Why the data is collected",
    body: "That data is used to authenticate sessions, authorize project access, operate relay traffic, calculate usage, deliver alerts and emails, investigate support issues, and improve the product. Fyxvo does not sell personal data.",
  },
  {
    title: "Operational retention",
    body: "Some records are retained because they are required to operate the service responsibly, including auth events, request logs, notification history, webhook deliveries, and support or feedback submissions tied to a workspace.",
  },
  {
    title: "Third-party processors",
    body: "The live stack relies on hosting, database, Redis, blockchain RPC, and email providers to operate the product. Those providers process data only as needed to deliver the corresponding service capability.",
  },
] as const;

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <h1 className="text-3xl font-bold tracking-tight text-[var(--fyxvo-text)]">Privacy Policy</h1>
      <p className="mt-4 text-xs text-[var(--fyxvo-text-muted)]">Last updated: March 2026</p>
      <p className="mt-6 max-w-3xl text-sm leading-7 text-[var(--fyxvo-text-soft)]">
        This policy describes the live devnet product as it exists today. It is meant to explain
        how Fyxvo handles user and project data in plain language rather than relying on generic
        template text.
      </p>

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

      <section className="mt-8 rounded-3xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-6">
        <h2 className="text-lg font-semibold text-[var(--fyxvo-text)]">Privacy contact</h2>
        <p className="mt-3 text-sm leading-7 text-[var(--fyxvo-text-soft)]">
          For privacy inquiries, deletion requests, or questions about email delivery and account
          data, contact{" "}
          <a href="mailto:privacy@fyxvo.com" className="text-[var(--fyxvo-brand)]">
            privacy@fyxvo.com
          </a>
          .
        </p>
      </section>
    </div>
  );
}
