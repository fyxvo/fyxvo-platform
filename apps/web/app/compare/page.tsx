"use client";

import { useEffect, useState } from "react";
import { usePortal } from "../../components/portal-provider";

const API = "https://api.fyxvo.com";

interface ComparisonRow {
  feature: string;
  fyxvo: string;
  publicRpc: string;
  genericProvider: string;
}

const COMPARISON_ROWS: ComparisonRow[] = [
  {
    feature: "Authentication",
    fyxvo: "Wallet-signed JWT",
    publicRpc: "None",
    genericProvider: "API key",
  },
  {
    feature: "Rate limiting",
    fyxvo: "Per-project with credits",
    publicRpc: "Aggressive shared limits",
    genericProvider: "Provider-defined",
  },
  {
    feature: "Analytics",
    fyxvo: "Method-level telemetry",
    publicRpc: "None",
    genericProvider: "Basic",
  },
  {
    feature: "Latency tracking",
    fyxvo: "p50/p95 per method",
    publicRpc: "None",
    genericProvider: "Basic",
  },
  {
    feature: "Webhook delivery",
    fyxvo: "Funding and alert events",
    publicRpc: "None",
    genericProvider: "None",
  },
  {
    feature: "On-chain funding",
    fyxvo: "SOL credits",
    publicRpc: "Not applicable",
    genericProvider: "Not applicable",
  },
  {
    feature: "Priority relay",
    fyxvo: "Dedicated path",
    publicRpc: "None",
    genericProvider: "Some providers",
  },
  {
    feature: "Status page",
    fyxvo: "Live at status.fyxvo.com",
    publicRpc: "None",
    genericProvider: "Provider-varies",
  },
];

interface ProjectAnalytics {
  totals: { requestLogs: number };
  latencyPercentiles?: { p50?: number; p95?: number };
  statusCodes?: Array<{ statusCode: number; count: number }>;
}

function LatencySection({
  projectId,
  token,
}: {
  readonly projectId: string;
  readonly token: string;
}) {
  const [analytics, setAnalytics] = useState<ProjectAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch(`${API}/v1/analytics/projects/${projectId}?range=7d`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as ProjectAnalytics;
        setAnalytics(data);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load analytics.");
      })
      .finally(() => setLoading(false));
  }, [projectId, token]);

  return (
    <div className="mt-16">
      <h2 className="text-2xl font-bold text-[#f1f5f9]">Your actual latency</h2>
      <p className="mt-2 text-sm text-[#64748b]">
        Based on the last 7 days of traffic for the selected project.
      </p>

      {loading && (
        <p className="mt-6 text-sm text-[#64748b]">Loading analytics&hellip;</p>
      )}
      {error && (
        <p className="mt-6 text-sm text-rose-400">{error}</p>
      )}
      {!loading && !error && analytics && (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6">
            <p className="text-xs font-medium uppercase tracking-wide text-[#64748b]">
              Total requests
            </p>
            <p className="mt-2 text-3xl font-bold text-[#f1f5f9]">
              {analytics.totals.requestLogs.toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-[#64748b]">7d window</p>
          </div>
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6">
            <p className="text-xs font-medium uppercase tracking-wide text-[#64748b]">
              p50 latency
            </p>
            <p className="mt-2 text-3xl font-bold text-[#f97316]">
              {analytics.latencyPercentiles?.p50 != null
                ? `${analytics.latencyPercentiles.p50}ms`
                : "–"}
            </p>
            <p className="mt-1 text-xs text-[#64748b]">Median response time</p>
          </div>
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6">
            <p className="text-xs font-medium uppercase tracking-wide text-[#64748b]">
              p95 latency
            </p>
            <p className="mt-2 text-3xl font-bold text-[#f97316]">
              {analytics.latencyPercentiles?.p95 != null
                ? `${analytics.latencyPercentiles.p95}ms`
                : "–"}
            </p>
            <p className="mt-1 text-xs text-[#64748b]">95th percentile</p>
          </div>
        </div>
      )}
    </div>
  );
}

function FeatureCell({ value }: { readonly value: string }) {
  const isNone = value === "None" || value === "Not applicable";
  const isFyxvo =
    value !== "None" &&
    value !== "Not applicable" &&
    value !== "Provider-defined" &&
    value !== "Some providers" &&
    value !== "Provider-varies" &&
    value !== "Aggressive shared limits" &&
    value !== "API key" &&
    value !== "Basic";

  return (
    <td
      className={`px-4 py-3.5 text-sm ${
        isNone
          ? "text-[#64748b]"
          : isFyxvo
            ? "font-medium text-[#f97316]"
            : "text-[#f1f5f9]"
      }`}
    >
      {value}
    </td>
  );
}

export default function ComparePage() {
  const portal = usePortal();
  const isAuthenticated = portal.walletPhase === "authenticated";

  return (
    <main className="min-h-screen" style={{ backgroundColor: "#0a0a0f" }}>
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        {/* Hero */}
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#f97316]">
            Compare
          </p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-[#f1f5f9] sm:text-5xl">
            Fyxvo vs the alternatives
          </h1>
          <p className="mt-5 text-base leading-7 text-[#64748b]">
            Public RPC endpoints are free and easy but come with aggressive rate
            limits, no analytics, and no authentication. Generic providers add
            API keys but still lack on-chain funding, method-level telemetry, or
            priority routing. Here is how Fyxvo compares.
          </p>
        </div>

        {/* Comparison table */}
        <div className="mt-14 overflow-x-auto rounded-2xl border border-white/[0.08] bg-white/[0.03]">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="border-b border-white/[0.08]">
                <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-wide text-[#64748b]">
                  Feature
                </th>
                <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-wide text-[#f97316]">
                  Fyxvo
                </th>
                <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-wide text-[#64748b]">
                  Public RPC
                </th>
                <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-wide text-[#64748b]">
                  Generic provider
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {COMPARISON_ROWS.map((row) => (
                <tr key={row.feature} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3.5 text-sm font-medium text-[#f1f5f9]">
                    {row.feature}
                  </td>
                  <FeatureCell value={row.fyxvo} />
                  <FeatureCell value={row.publicRpc} />
                  <FeatureCell value={row.genericProvider} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Authenticated latency section */}
        {isAuthenticated && portal.selectedProject?.id && portal.token && (
          <LatencySection
            projectId={portal.selectedProject.id}
            token={portal.token}
          />
        )}

        {/* CTA for unauthenticated users */}
        {!isAuthenticated && (
          <div className="mx-auto mt-16 max-w-lg rounded-2xl border border-white/[0.08] bg-white/[0.03] p-8 text-center">
            <p className="text-base font-medium text-[#f1f5f9]">
              Connect your wallet to see your actual latency numbers
            </p>
            <p className="mt-2 text-sm text-[#64748b]">
              Once authenticated with a project selected, we will pull real p50
              and p95 latency data from your last 7 days of traffic.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
