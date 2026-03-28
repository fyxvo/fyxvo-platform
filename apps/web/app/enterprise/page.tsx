"use client";

import { type FormEvent, useState } from "react";

const FEATURES = [
  {
    title: "Priority SLA",
    description: "Guaranteed response times with an explicit SLA and escalation path.",
  },
  {
    title: "Dedicated nodes",
    description: "Your traffic routes through reserved compute, isolated from public workloads.",
  },
  {
    title: "Custom rate limits",
    description: "Set request budgets and velocity limits that match your production patterns.",
  },
  {
    title: "Team and RBAC",
    description: "Invite engineers, assign roles, and control access at the project and key level.",
  },
  {
    title: "Advanced analytics",
    description: "Full method-level telemetry, cost attribution, and exportable reports.",
  },
  {
    title: "Dedicated support",
    description: "A named support contact and SLA-backed response window for critical issues.",
  },
];

const STATS = [
  { value: "10M+", label: "requests daily" },
  { value: "<50ms", label: "p95 latency" },
  { value: "99.9%", label: "uptime" },
];

export default function EnterprisePage() {
  const [companyName, setCompanyName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [estimatedMonthlyRequests, setEstimatedMonthlyRequests] = useState("Under 1M");
  const [useCase, setUseCase] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<"success" | { msg: string } | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);
    try {
      const r = await fetch("https://api.fyxvo.com/v1/enterprise/interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName, contactEmail, estimatedMonthlyRequests, useCase }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => null) as { message?: string } | null;
        throw new Error(d?.message ?? "Submission failed");
      }
      setResult("success");
    } catch (e) {
      setResult({ msg: e instanceof Error ? e.message : "Something went wrong." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Hero */}
      <section className="py-20 border-b border-white/[0.06]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-sm font-medium text-[#f97316] mb-4 uppercase tracking-widest">Enterprise</p>
            <h1 className="text-5xl font-bold text-[#f1f5f9] mb-6 leading-tight">
              Enterprise-grade Solana devnet infrastructure
            </h1>
            <p className="text-lg text-[#64748b] leading-relaxed">
              Fyxvo Enterprise delivers dedicated compute, contractual SLAs, and team-level access controls for
              organizations building production-grade applications on Solana. Skip the shared pool, get your own
              reserved nodes, set custom request limits, and work with a named support contact who knows your stack.
            </p>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 border-b border-white/[0.06]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-3 gap-8">
            {STATS.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-4xl font-bold text-[#f97316] mb-1">{stat.value}</p>
                <p className="text-sm text-[#64748b]">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature cards */}
      <section className="py-20 border-b border-white/[0.06]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-[#f1f5f9] mb-10">What is included</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feat) => (
              <div
                key={feat.title}
                className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 transition-transform hover:-translate-y-1"
              >
                <h3 className="font-semibold text-[#f1f5f9] mb-2">{feat.title}</h3>
                <p className="text-sm text-[#64748b]">{feat.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact form */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-xl">
            <h2 className="text-2xl font-bold text-[#f1f5f9] mb-4">Contact us</h2>
            <p className="text-[#64748b] mb-8">
              Fill out the form below and our team will reach out within one business day.
            </p>

            {result === "success" ? (
              <div className="rounded-2xl border border-green-500/20 bg-green-500/10 p-8 text-center">
                <p className="text-green-400 font-semibold text-lg mb-2">Request received.</p>
                <p className="text-sm text-[#64748b]">
                  We will be in touch shortly to discuss your enterprise requirements.
                </p>
              </div>
            ) : (
              <form onSubmit={(e) => void submit(e)} className="space-y-4">
                {result && typeof result === "object" && (
                  <p className="text-sm rounded-lg px-4 py-2 bg-red-500/10 text-red-400">{result.msg}</p>
                )}

                <div className="space-y-1">
                  <label className="text-xs text-[#64748b]">Company name</label>
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-sm text-[#f1f5f9] placeholder-[#64748b] focus:outline-none focus:ring-2 focus:ring-[#f97316]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-[#64748b]">Contact email</label>
                  <input
                    type="email"
                    required
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-sm text-[#f1f5f9] placeholder-[#64748b] focus:outline-none focus:ring-2 focus:ring-[#f97316]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-[#64748b]">Estimated monthly requests</label>
                  <select
                    value={estimatedMonthlyRequests}
                    onChange={(e) => setEstimatedMonthlyRequests(e.target.value)}
                    className="w-full rounded-xl border border-white/[0.08] bg-[#0a0a0f] px-4 py-2 text-sm text-[#f1f5f9] focus:outline-none focus:ring-2 focus:ring-[#f97316]"
                  >
                    <option>Under 1M</option>
                    <option>1M-10M</option>
                    <option>10M-100M</option>
                    <option>100M+</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-[#64748b]">Use case</label>
                  <textarea
                    required
                    value={useCase}
                    onChange={(e) => setUseCase(e.target.value)}
                    rows={4}
                    className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-sm text-[#f1f5f9] placeholder-[#64748b] focus:outline-none focus:ring-2 focus:ring-[#f97316] resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-xl bg-[#f97316] px-4 py-3 text-sm font-medium text-white hover:bg-[#ea6c0a] transition-colors disabled:opacity-50"
                >
                  {submitting ? "Sending…" : "Request enterprise access"}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
