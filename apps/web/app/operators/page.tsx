import Link from "next/link";
import { protocolAddresses } from "../../lib/public-data";

export default function OperatorsPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16">
      <p className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-brand)]">Operators</p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight text-[var(--fyxvo-text)]">
        Operator visibility follows the real product boundary
      </h1>
      <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--fyxvo-text-soft)]">
        Fyxvo does have an operator model and a managed relay path, but the live public web app
        does not publish invented operator inventory. Public users can verify protocol addresses,
        watch gateway health, and track relay latency on the status surface, while operator-level
        details remain part of the internal control plane and elevated-access workflows.
      </p>

      <div className="mt-10 grid gap-5 lg:grid-cols-2">
        <div className="rounded-[2rem] border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-6">
          <h2 className="text-2xl font-semibold text-[var(--fyxvo-text)]">
            What is public today
          </h2>
          <p className="mt-4 text-sm leading-7 text-[var(--fyxvo-text-soft)]">
            Public users can inspect the gateway status page, review live latency, see current
            request counts, and verify the on-chain program, config, treasury, and authority
            addresses that the live devnet deployment uses.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/status"
              className="inline-flex rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 py-2 text-sm text-[var(--fyxvo-text)]"
            >
              View status
            </Link>
            <Link
              href="/docs"
              className="inline-flex rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 py-2 text-sm text-[var(--fyxvo-text)]"
            >
              Read docs
            </Link>
          </div>
        </div>

        <div className="rounded-[2rem] border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-6">
          <h2 className="text-2xl font-semibold text-[var(--fyxvo-text)]">
            Registry and authorities
          </h2>
          <div className="mt-6 space-y-3 text-sm text-[var(--fyxvo-text-soft)]">
            <p>
              Operator registry:{" "}
              <span className="font-mono text-[var(--fyxvo-text)]">{protocolAddresses.operatorRegistry}</span>
            </p>
            <p>
              Program ID:{" "}
              <span className="font-mono text-[var(--fyxvo-text)]">{protocolAddresses.programId}</span>
            </p>
            <p>
              Protocol authority:{" "}
              <span className="font-mono text-[var(--fyxvo-text)]">{protocolAddresses.protocolAuthority}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
