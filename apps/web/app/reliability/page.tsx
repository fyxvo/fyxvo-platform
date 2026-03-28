import Link from "next/link";
import {
  getPublicApiHealth,
  getPublicApiStatus,
  getPublicGatewayHealth,
  getPublicNetworkStats,
} from "../../lib/public-data";

const PRINCIPLES = [
  {
    title: "Separate control and relay planes",
    body: "The dashboard and auth API are distinct from the JSON-RPC relay path, so product state and request routing are visible independently.",
  },
  {
    title: "Funded project isolation",
    body: "Projects carry their own activation state, treasury funding, and API keys instead of sharing one account-wide quota bucket.",
  },
  {
    title: "Public trust surfaces",
    body: "Status, security, reliability, explore, leaderboard, and project-page surfaces are part of the product rather than afterthoughts.",
  },
  {
    title: "Devnet-first rollout discipline",
    body: "The live product is honestly positioned as devnet private alpha while governance, funding, and rollback drills are still being hardened.",
  },
] as const;

export default async function ReliabilityPage() {
  const [apiHealth, apiStatus, gatewayHealth, networkStats] = await Promise.all([
    getPublicApiHealth(),
    getPublicApiStatus(),
    getPublicGatewayHealth(),
    getPublicNetworkStats(),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <h1 className="text-4xl font-bold tracking-tight text-[var(--fyxvo-text)]">Reliability</h1>
      <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--fyxvo-text-soft)]">
        Reliability at Fyxvo means making the operating model inspectable. The live product exposes
        control-plane health, relay health, protocol readiness, request counts, and public trust
        surfaces so users can see how the service is behaving instead of relying on opaque claims.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-6">
          <p className="text-xs uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">
            API status
          </p>
          <p className="mt-2 text-2xl font-semibold text-[var(--fyxvo-text)]">
            {apiHealth?.status ?? "unknown"}
          </p>
        </div>
        <div className="rounded-3xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-6">
          <p className="text-xs uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">
            Gateway status
          </p>
          <p className="mt-2 text-2xl font-semibold text-[var(--fyxvo-text)]">
            {gatewayHealth?.status ?? "unknown"}
          </p>
        </div>
        <div className="rounded-3xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-6">
          <p className="text-xs uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">
            Protocol readiness
          </p>
          <p className="mt-2 text-2xl font-semibold text-[var(--fyxvo-text)]">
            {apiStatus?.protocolReadiness?.ready ? "ready" : "attention"}
          </p>
        </div>
        <div className="rounded-3xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-6">
          <p className="text-xs uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">
            Observed requests
          </p>
          <p className="mt-2 text-2xl font-semibold text-[var(--fyxvo-text)]">
            {(networkStats?.totalRequests ?? 0).toLocaleString()}
          </p>
        </div>
      </div>

      <div className="mt-10 grid gap-5 lg:grid-cols-2">
        {PRINCIPLES.map((item) => (
          <div
            key={item.title}
            className="rounded-3xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-6"
          >
            <h2 className="text-xl font-semibold text-[var(--fyxvo-text)]">{item.title}</h2>
            <p className="mt-3 text-sm leading-6 text-[var(--fyxvo-text-soft)]">{item.body}</p>
          </div>
        ))}
      </div>

      <section className="mt-10 rounded-[2rem] border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-8">
        <p className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-brand)]">
          Path to decentralized infrastructure
        </p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--fyxvo-text)]">
          Managed first, open later
        </h2>
        <div className="mt-6 grid gap-5 lg:grid-cols-3">
          <div className="rounded-3xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-6">
            <h3 className="text-xl font-semibold text-[var(--fyxvo-text)]">Current devnet phase</h3>
            <p className="mt-3 text-sm leading-6 text-[var(--fyxvo-text-soft)]">
              The live devnet product routes through managed nodes operated by the team. This phase
              is about proving the funded relay model, validating the control plane, and keeping
              the operating posture visible while the network is still small.
            </p>
          </div>
          <div className="rounded-3xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-6">
            <h3 className="text-xl font-semibold text-[var(--fyxvo-text)]">Next operator phase</h3>
            <p className="mt-3 text-sm leading-6 text-[var(--fyxvo-text-soft)]">
              The next step is to introduce external operators into the routing layer. That work
              includes onboarding, performance visibility, node economics, and reducing dependence
              on one managed infrastructure footprint.
            </p>
          </div>
          <div className="rounded-3xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-6">
            <h3 className="text-xl font-semibold text-[var(--fyxvo-text)]">Open governed network</h3>
            <p className="mt-3 text-sm leading-6 text-[var(--fyxvo-text-soft)]">
              The long-term target is a fully open operator network governed on chain. That target
              exists in the protocol direction and roadmap, but this page does not claim a launch
              date or that the open network is already live.
            </p>
          </div>
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/mainnet"
            className="inline-flex rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 py-2 text-sm font-medium text-[var(--fyxvo-text)] transition hover:border-[var(--fyxvo-brand)]"
          >
            Review the mainnet gate
          </Link>
          <Link
            href="/operators"
            className="inline-flex rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 py-2 text-sm font-medium text-[var(--fyxvo-text)] transition hover:border-[var(--fyxvo-brand)]"
          >
            See operator onboarding
          </Link>
        </div>
      </section>
    </div>
  );
}
