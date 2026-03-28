"use client";

import { type FormEvent, useState } from "react";

const INTEREST_AREAS = ["RPC relay", "Analytics", "Team access", "Enterprise"] as const;
type InterestArea = (typeof INTEREST_AREAS)[number];

function InterestForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [team, setTeam] = useState("");
  const [useCase, setUseCase] = useState("");
  const [requestVolume, setRequestVolume] = useState("Under 100K/mo");
  const [interestAreas, setInterestAreas] = useState<Set<InterestArea>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<"success" | { msg: string } | null>(null);

  const toggleArea = (area: InterestArea) => {
    setInterestAreas((prev) => {
      const next = new Set(prev);
      if (next.has(area)) next.delete(area);
      else next.add(area);
      return next;
    });
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);
    try {
      const r = await fetch("https://api.fyxvo.com/v1/interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          role,
          team,
          useCase,
          requestVolume,
          interestAreas: [...interestAreas],
        }),
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

  if (result === "success") {
    return (
      <div className="rounded-2xl border border-green-500/20 bg-green-500/10 p-8 text-center h-full flex flex-col items-center justify-center gap-3">
        <p className="text-green-400 font-semibold text-lg">Thank you for your interest!</p>
        <p className="text-sm text-[#64748b]">We will be in touch soon.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 space-y-4">
      <h2 className="text-xl font-semibold text-[#f1f5f9]">Express interest</h2>
      <p className="text-sm text-[#64748b]">Tell us about your project and what you are looking for.</p>

      {result && typeof result === "object" && (
        <p className="text-sm rounded-lg px-4 py-2 bg-red-500/10 text-red-400">{result.msg}</p>
      )}

      <form onSubmit={(e) => void submit(e)} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-[#64748b]">Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-[#f1f5f9] placeholder-[#64748b] focus:outline-none focus:ring-2 focus:ring-[#f97316]"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-[#64748b]">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-[#f1f5f9] placeholder-[#64748b] focus:outline-none focus:ring-2 focus:ring-[#f97316]"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-[#64748b]">Role</label>
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-[#f1f5f9] placeholder-[#64748b] focus:outline-none focus:ring-2 focus:ring-[#f97316]"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-[#64748b]">Team / Company</label>
            <input
              type="text"
              value={team}
              onChange={(e) => setTeam(e.target.value)}
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-[#f1f5f9] placeholder-[#64748b] focus:outline-none focus:ring-2 focus:ring-[#f97316]"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-[#64748b]">Use case</label>
          <textarea
            value={useCase}
            onChange={(e) => setUseCase(e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-[#f1f5f9] placeholder-[#64748b] focus:outline-none focus:ring-2 focus:ring-[#f97316] resize-none"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs text-[#64748b]">Estimated monthly requests</label>
          <select
            value={requestVolume}
            onChange={(e) => setRequestVolume(e.target.value)}
            className="w-full rounded-xl border border-white/[0.08] bg-[#0a0a0f] px-3 py-2 text-sm text-[#f1f5f9] focus:outline-none focus:ring-2 focus:ring-[#f97316]"
          >
            <option>Under 100K/mo</option>
            <option>100K-1M/mo</option>
            <option>1M-10M/mo</option>
            <option>10M+/mo</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-xs text-[#64748b]">Areas of interest</label>
          <div className="grid grid-cols-2 gap-2">
            {INTEREST_AREAS.map((area) => (
              <label key={area} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={interestAreas.has(area)}
                  onChange={() => toggleArea(area)}
                  className="rounded border-white/10 bg-white/[0.03] text-[#f97316] focus:ring-[#f97316]"
                />
                <span className="text-sm text-[#f1f5f9]">{area}</span>
              </label>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-[#f97316] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#ea6c0a] transition-colors disabled:opacity-50"
        >
          {submitting ? "Sending…" : "Submit interest"}
        </button>
      </form>
    </div>
  );
}

function FeedbackForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState("Product feedback");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<"success" | { msg: string } | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);
    try {
      const r = await fetch("https://api.fyxvo.com/v1/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, category, description }),
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

  if (result === "success") {
    return (
      <div className="rounded-2xl border border-green-500/20 bg-green-500/10 p-8 text-center h-full flex flex-col items-center justify-center gap-3">
        <p className="text-green-400 font-semibold text-lg">Thanks for the feedback!</p>
        <p className="text-sm text-[#64748b]">We read every submission.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 space-y-4">
      <h2 className="text-xl font-semibold text-[#f1f5f9]">Send feedback</h2>
      <p className="text-sm text-[#64748b]">Bug reports, product ideas, or anything else — we are listening.</p>

      {result && typeof result === "object" && (
        <p className="text-sm rounded-lg px-4 py-2 bg-red-500/10 text-red-400">{result.msg}</p>
      )}

      <form onSubmit={(e) => void submit(e)} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-[#64748b]">Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-[#f1f5f9] placeholder-[#64748b] focus:outline-none focus:ring-2 focus:ring-[#f97316]"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-[#64748b]">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-[#f1f5f9] placeholder-[#64748b] focus:outline-none focus:ring-2 focus:ring-[#f97316]"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-[#64748b]">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-xl border border-white/[0.08] bg-[#0a0a0f] px-3 py-2 text-sm text-[#f1f5f9] focus:outline-none focus:ring-2 focus:ring-[#f97316]"
          >
            <option>Bug report</option>
            <option>Support request</option>
            <option>Onboarding friction</option>
            <option>Product feedback</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-[#64748b]">Description</label>
          <textarea
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-[#f1f5f9] placeholder-[#64748b] focus:outline-none focus:ring-2 focus:ring-[#f97316] resize-none"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-[#f97316] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#ea6c0a] transition-colors disabled:opacity-50"
        >
          {submitting ? "Sending…" : "Send feedback"}
        </button>
      </form>
    </div>
  );
}

export default function ContactPage() {
  const communityLinks = [
    {
      title: "Community interest",
      description: "Share your use case and join the list of teams building on Fyxvo.",
      href: "/contact",
    },
    {
      title: "Technical support",
      description: "Open a support ticket for integration issues, errors, or unexpected behavior.",
      href: "/support",
    },
    {
      title: "Enterprise plans",
      description: "Learn about dedicated nodes, custom rate limits, and SLA-backed support.",
      href: "/enterprise",
    },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0f] py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-[#f1f5f9] mb-4">Get in touch</h1>
          <p className="text-[#64748b] max-w-xl">
            Express interest in Fyxvo or send us feedback. We respond to every message.
          </p>
        </div>

        {/* Two forms */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-20">
          <InterestForm />
          <FeedbackForm />
        </div>

        {/* Community section */}
        <div>
          <h2 className="text-2xl font-bold text-[#f1f5f9] mb-8">More ways to connect</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {communityLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 transition-transform hover:-translate-y-1 block"
              >
                <h3 className="font-semibold text-[#f1f5f9] mb-2">{link.title}</h3>
                <p className="text-sm text-[#64748b]">{link.description}</p>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
