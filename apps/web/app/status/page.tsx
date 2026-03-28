import { StatusSubscribeForm } from "../../components/status-subscribe-form";

export default function StatusPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-3xl font-bold tracking-tight text-[var(--fyxvo-text)]">
        System Status
      </h1>
      <p className="mt-4 text-[var(--fyxvo-text-muted)]">
        Current operational status for all Fyxvo services.
      </p>

      <div className="mt-8 rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-5">
        <div className="flex items-center gap-3">
          <div className="h-3 w-3 rounded-full bg-emerald-500" />
          <span className="font-medium text-[var(--fyxvo-text)]">All systems operational</span>
        </div>
      </div>

      <div className="mt-12">
        <h2 className="text-xl font-semibold text-[var(--fyxvo-text)]">
          Subscribe to incident updates
        </h2>
        <p className="mt-2 text-sm text-[var(--fyxvo-text-muted)]">
          Get notified when incidents are reported or resolved.
        </p>
        <div className="mt-4">
          <StatusSubscribeForm />
        </div>
      </div>
    </div>
  );
}
