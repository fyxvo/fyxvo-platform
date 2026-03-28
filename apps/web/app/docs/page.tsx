import Link from "next/link";

const DOCS_SECTIONS = [
  { title: "Quickstart", href: "/docs#quickstart", description: "Get your first request through Fyxvo in under 5 minutes." },
  { title: "RPC", href: "/docs#rpc", description: "Standard JSON-RPC compatible endpoint." },
  { title: "Priority Relay", href: "/docs#priority-relay", description: "Low-latency transaction submission for time-sensitive operations." },
  { title: "API Reference", href: "/docs#api-reference", description: "Full REST API reference for the Fyxvo platform." },
];

export default function DocsPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16">
      <h1 className="text-3xl font-bold tracking-tight text-[var(--fyxvo-text)]">Documentation</h1>
      <p className="mt-4 text-[var(--fyxvo-text-muted)]">
        Everything you need to integrate Fyxvo into your Solana application.
      </p>
      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {DOCS_SECTIONS.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-5 transition-colors hover:border-[var(--fyxvo-brand)]"
          >
            <h2 className="font-semibold text-[var(--fyxvo-text)]">{section.title}</h2>
            <p className="mt-1 text-sm text-[var(--fyxvo-text-muted)]">{section.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
