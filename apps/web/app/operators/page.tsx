"use client";

import { useEffect, useState } from "react";
import { usePortal } from "../../components/portal-provider";

const API = "https://api.fyxvo.com";

const NODE_TYPES = [
  "Solana validator",
  "Dedicated RPC node",
  "Cloud instance",
] as const;

const REGIONS = [
  "us-east-1",
  "us-west-2",
  "eu-west-1",
  "eu-central-1",
  "ap-southeast-1",
  "ap-northeast-1",
] as const;

interface ActivityRow {
  operatorId: string;
  wallet: string;
  requestsServed: number;
  feesEarned: string;
  status: string;
}

interface DailyRequestRow {
  date: string;
  count: number;
}

type FormState = "idle" | "submitting" | "success" | "error";

function AdminPanel({ token }: { readonly token: string }) {
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [daily, setDaily] = useState<DailyRequestRow[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(true);
  const [loadingDaily, setLoadingDaily] = useState(true);
  const [activityError, setActivityError] = useState<string | null>(null);
  const [dailyError, setDailyError] = useState<string | null>(null);

  useEffect(() => {
    void fetch(`${API}/v1/operators/activity`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as ActivityRow[];
        setActivity(data);
      })
      .catch((err: unknown) => {
        setActivityError(err instanceof Error ? err.message : "Failed to load activity.");
      })
      .finally(() => setLoadingActivity(false));
  }, [token]);

  useEffect(() => {
    void fetch(`${API}/v1/operators/daily-requests`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as DailyRequestRow[];
        setDaily(data);
      })
      .catch((err: unknown) => {
        setDailyError(err instanceof Error ? err.message : "Failed to load daily requests.");
      })
      .finally(() => setLoadingDaily(false));
  }, [token]);

  return (
    <div className="space-y-10">
      {/* Operator Activity */}
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6">
        <h3 className="text-lg font-semibold text-[#f1f5f9]">Operator activity</h3>
        {loadingActivity && (
          <p className="mt-4 text-sm text-[#64748b]">Loading activity&hellip;</p>
        )}
        {activityError && (
          <p className="mt-4 text-sm text-rose-400">{activityError}</p>
        )}
        {!loadingActivity && !activityError && activity.length === 0 && (
          <p className="mt-4 text-sm text-[#64748b]">No activity data available.</p>
        )}
        {!loadingActivity && !activityError && activity.length > 0 && (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[500px] text-sm">
              <thead>
                <tr className="border-b border-white/[0.08]">
                  <th className="pb-2 text-left font-medium text-[#64748b]">Wallet</th>
                  <th className="pb-2 text-left font-medium text-[#64748b]">Requests</th>
                  <th className="pb-2 text-left font-medium text-[#64748b]">Fees earned</th>
                  <th className="pb-2 text-left font-medium text-[#64748b]">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {activity.map((row) => (
                  <tr key={row.operatorId}>
                    <td className="py-2 font-mono text-xs text-[#f1f5f9]">
                      {row.wallet.slice(0, 8)}&hellip;{row.wallet.slice(-6)}
                    </td>
                    <td className="py-2 text-[#f1f5f9]">{row.requestsServed.toLocaleString()}</td>
                    <td className="py-2 text-[#f97316]">{row.feesEarned}</td>
                    <td className="py-2">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          row.status === "ONLINE"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-[#64748b]/10 text-[#64748b]"
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Daily Requests */}
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6">
        <h3 className="text-lg font-semibold text-[#f1f5f9]">Daily request counts</h3>
        {loadingDaily && (
          <p className="mt-4 text-sm text-[#64748b]">Loading daily data&hellip;</p>
        )}
        {dailyError && (
          <p className="mt-4 text-sm text-rose-400">{dailyError}</p>
        )}
        {!loadingDaily && !dailyError && daily.length === 0 && (
          <p className="mt-4 text-sm text-[#64748b]">No daily request data available.</p>
        )}
        {!loadingDaily && !dailyError && daily.length > 0 && (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[300px] text-sm">
              <thead>
                <tr className="border-b border-white/[0.08]">
                  <th className="pb-2 text-left font-medium text-[#64748b]">Date</th>
                  <th className="pb-2 text-left font-medium text-[#64748b]">Requests</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {daily.map((row) => (
                  <tr key={row.date}>
                    <td className="py-2 text-[#f1f5f9]">{row.date}</td>
                    <td className="py-2 text-[#f1f5f9]">{row.count.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function OperatorsPage() {
  const portal = usePortal();
  const isAdmin =
    portal.user?.role === "OWNER" || portal.user?.role === "ADMIN";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [nodeType, setNodeType] = useState<string>("Solana validator");
  const [region, setRegion] = useState<string>("us-east-1");
  const [message, setMessage] = useState("");
  const [formState, setFormState] = useState<FormState>("idle");
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormState("submitting");
    setFormError(null);
    try {
      const res = await fetch(`${API}/v1/operators/register-interest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, nodeType, region, message }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(body.message ?? `HTTP ${res.status}`);
      }
      setFormState("success");
    } catch (err: unknown) {
      setFormError(
        err instanceof Error ? err.message : "Something went wrong. Please try again."
      );
      setFormState("error");
    }
  }

  return (
    <main className="min-h-screen" style={{ backgroundColor: "#0a0a0f" }}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="py-20">
          {/* Hero */}
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#f97316]">
              Operators
            </p>
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-[#f1f5f9] sm:text-5xl">
              The Fyxvo Operator Program
            </h1>
            <p className="mt-5 text-base leading-7 text-[#64748b]">
              Fyxvo operators route devnet RPC traffic through their nodes,
              providing the relay capacity that powers the platform. In return,
              operators earn a share of the request fees paid by developers for
              every request their node serves.
            </p>
          </div>

          {/* Revenue model */}
          <div className="mx-auto mt-16 max-w-3xl">
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-8">
              <h2 className="text-xl font-semibold text-[#f1f5f9]">Revenue model</h2>
              <p className="mt-4 text-base leading-7 text-[#64748b]">
                Eighty percent of each request fee goes directly to the operator
                who served that request. Fyxvo retains twenty percent to cover
                infrastructure, development, and governance overhead. Fees are
                settled on-chain in SOL, with operator payouts recorded per
                request and aggregated daily.
              </p>
              <p className="mt-4 text-base leading-7 text-[#64748b]">
                During the devnet alpha, all fees are denominated in devnet SOL
                and have no monetary value. The operator program in production
                will use mainnet SOL and will include binding payout terms in the
                operator agreement.
              </p>

              {/* Stats row */}
              <div className="mt-8 grid grid-cols-3 gap-4">
                {[
                  { label: "Operator share", value: "80%" },
                  { label: "Protocol fee", value: "20%" },
                  { label: "Settlement", value: "On-chain" },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 text-center"
                  >
                    <p className="text-2xl font-bold text-[#f97316]">{stat.value}</p>
                    <p className="mt-1 text-xs text-[#64748b]">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Registration interest form */}
          <div className="mx-auto mt-16 max-w-xl">
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-8">
              <h2 className="text-xl font-semibold text-[#f1f5f9]">
                Register your interest
              </h2>
              <p className="mt-2 text-sm text-[#64748b]">
                Operator registration is coming soon. Submit your details below
                and we will reach out when the program opens.
              </p>

              {formState === "success" ? (
                <div className="mt-6 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.05] p-4">
                  <p className="text-sm font-medium text-emerald-400">
                    Your interest has been registered. We will be in touch.
                  </p>
                </div>
              ) : (
                <form onSubmit={(e) => void handleSubmit(e)} className="mt-6 space-y-4">
                  <div>
                    <label
                      htmlFor="op-name"
                      className="mb-1.5 block text-xs font-medium text-[#f1f5f9]"
                    >
                      Name
                    </label>
                    <input
                      id="op-name"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-sm text-[#f1f5f9] placeholder-[#64748b] outline-none focus:border-[#f97316]/50 focus:ring-1 focus:ring-[#f97316]/20"
                      placeholder="Your name or company"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="op-email"
                      className="mb-1.5 block text-xs font-medium text-[#f1f5f9]"
                    >
                      Email
                    </label>
                    <input
                      id="op-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-sm text-[#f1f5f9] placeholder-[#64748b] outline-none focus:border-[#f97316]/50 focus:ring-1 focus:ring-[#f97316]/20"
                      placeholder="you@example.com"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="op-node-type"
                      className="mb-1.5 block text-xs font-medium text-[#f1f5f9]"
                    >
                      Node type
                    </label>
                    <select
                      id="op-node-type"
                      value={nodeType}
                      onChange={(e) => setNodeType(e.target.value)}
                      className="w-full rounded-xl border border-white/[0.08] bg-[#0a0a0f] px-4 py-2.5 text-sm text-[#f1f5f9] outline-none focus:border-[#f97316]/50 focus:ring-1 focus:ring-[#f97316]/20"
                    >
                      {NODE_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="op-region"
                      className="mb-1.5 block text-xs font-medium text-[#f1f5f9]"
                    >
                      Region
                    </label>
                    <select
                      id="op-region"
                      value={region}
                      onChange={(e) => setRegion(e.target.value)}
                      className="w-full rounded-xl border border-white/[0.08] bg-[#0a0a0f] px-4 py-2.5 text-sm text-[#f1f5f9] outline-none focus:border-[#f97316]/50 focus:ring-1 focus:ring-[#f97316]/20"
                    >
                      {REGIONS.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="op-message"
                      className="mb-1.5 block text-xs font-medium text-[#f1f5f9]"
                    >
                      Message{" "}
                      <span className="font-normal text-[#64748b]">(optional)</span>
                    </label>
                    <textarea
                      id="op-message"
                      rows={4}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-sm text-[#f1f5f9] placeholder-[#64748b] outline-none focus:border-[#f97316]/50 focus:ring-1 focus:ring-[#f97316]/20"
                      placeholder="Tell us about your infrastructure or any questions you have."
                    />
                  </div>

                  {formState === "error" && formError && (
                    <div className="rounded-xl border border-rose-500/20 bg-rose-500/[0.05] p-3">
                      <p className="text-sm text-rose-400">{formError}</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={formState === "submitting"}
                    className="w-full rounded-xl bg-[#f97316] px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {formState === "submitting" ? "Submitting…" : "Register interest"}
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Admin section */}
          {isAdmin && portal.token && (
            <div className="mx-auto mt-16 max-w-3xl">
              <h2 className="mb-6 text-xl font-semibold text-[#f1f5f9]">
                Admin: operator data
              </h2>
              <AdminPanel token={portal.token} />
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
