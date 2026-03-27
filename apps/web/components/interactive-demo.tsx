"use client";

import { useState, useEffect, type ReactNode } from "react";
import Link from "next/link";

// ---------------------------------------------------------------------------
// Demo step definitions
// ---------------------------------------------------------------------------

interface DemoStep {
  readonly id: number;
  readonly label: string;
  readonly content: ReactNode;
}

// ---------------------------------------------------------------------------
// Step content components
// ---------------------------------------------------------------------------

function StepCreateProject() {
  return (
    <div className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg-elevated)] p-5">
      <div className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">
        Create Project
      </div>

      {/* Simulated form card */}
      <div className="rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4 space-y-3">
        <div className="space-y-1">
          <label className="block text-[10px] font-medium uppercase tracking-wider text-[var(--fyxvo-text-muted)]">
            Project name
          </label>
          <div className="rounded-md border border-[var(--fyxvo-brand)]/40 bg-[var(--fyxvo-bg-elevated)] px-3 py-2 text-sm font-medium text-[var(--fyxvo-text)]">
            My dApp
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="block text-[10px] font-medium uppercase tracking-wider text-[var(--fyxvo-text-muted)]">
              Network
            </label>
            <div className="rounded-md border border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg-elevated)] px-3 py-2 text-xs text-[var(--fyxvo-text)]">
              Solana devnet
            </div>
          </div>
          <div className="space-y-1">
            <label className="block text-[10px] font-medium uppercase tracking-wider text-[var(--fyxvo-text-muted)]">
              Environment
            </label>
            <div className="rounded-md border border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg-elevated)] px-3 py-2 text-xs text-[var(--fyxvo-text)]">
              development
            </div>
          </div>
        </div>

        <div className="pt-1 flex items-center justify-between">
          <span className="text-[10px] text-[var(--fyxvo-text-muted)]">
            Endpoint:{" "}
            <span className="font-mono text-[var(--fyxvo-text)]">
              rpc.fyxvo.com/rpc?project=my-dapp
            </span>
          </span>
          <div className="rounded-md bg-[var(--fyxvo-brand)] px-3 py-1.5 text-[11px] font-semibold text-white">
            Create →
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
        <span className="text-xs text-[var(--fyxvo-text-muted)]">
          Project created — on-chain record confirmed
        </span>
      </div>
    </div>
  );
}

function StepFund() {
  return (
    <div className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg-elevated)] p-5">
      <div className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">
        Fund Project
      </div>

      {/* Solana transaction snippet */}
      <div className="overflow-hidden rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)]">
        <div className="flex items-center gap-2 border-b border-[var(--fyxvo-border)] bg-[#1e1e2e] px-4 py-2">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-green-500/70" />
          <span className="ml-2 text-[10px] text-slate-400">top-up.ts</span>
        </div>
        <pre className="overflow-x-auto bg-[#1e1e2e] p-4 text-[11px] leading-5">
          <code>
            <span className="text-purple-400">import</span>
            <span className="text-slate-300"> {"{ Connection, PublicKey, SystemProgram, Transaction }"}</span>
            {"\n"}
            <span className="text-purple-400">  from</span>
            <span className="text-emerald-400"> &apos;@solana/web3.js&apos;</span>
            {"\n\n"}
            <span className="text-blue-400">const</span>
            <span className="text-slate-300"> conn </span>
            <span className="text-slate-400">= </span>
            <span className="text-purple-400">new</span>
            <span className="text-yellow-300"> Connection</span>
            <span className="text-slate-300">(</span>
            <span className="text-emerald-400">&apos;https://api.devnet.solana.com&apos;</span>
            <span className="text-slate-300">)</span>
            {"\n"}
            <span className="text-blue-400">const</span>
            <span className="text-slate-300"> tx </span>
            <span className="text-slate-400">= </span>
            <span className="text-purple-400">new</span>
            <span className="text-yellow-300"> Transaction</span>
            <span className="text-slate-300">().add(</span>
            {"\n"}
            <span className="text-slate-300">  SystemProgram.</span>
            <span className="text-yellow-300">transfer</span>
            <span className="text-slate-300">{"({"}</span>
            {"\n"}
            <span className="text-slate-300">    fromPubkey: wallet.publicKey,</span>
            {"\n"}
            <span className="text-slate-300">    toPubkey: </span>
            <span className="text-purple-400">new</span>
            <span className="text-yellow-300"> PublicKey</span>
            <span className="text-slate-300">(fyxvoVault),</span>
            {"\n"}
            <span className="text-slate-300">    lamports: </span>
            <span className="text-orange-400">50_000_000</span>
            <span className="text-slate-500"> {"// 0.05 SOL"}</span>
            {"\n"}
            <span className="text-slate-300">  {"}))"}</span>
            {"\n"}
            <span className="text-blue-400">await</span>
            <span className="text-slate-300"> sendAndConfirmTransaction(conn, tx, [wallet])</span>
          </code>
        </pre>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <span className="text-xs text-[var(--fyxvo-text-muted)]">0.05 SOL deposited · ~50,000 requests</span>
        </div>
        <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-medium text-[var(--fyxvo-success)]">
          funded
        </span>
      </div>
    </div>
  );
}

function StepApiKey() {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    void navigator.clipboard.writeText("fyxvo_live_AbCdEfGh...XyZ").then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg-elevated)] p-5">
      <div className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">
        API Key
      </div>

      {/* Terminal-style code block */}
      <div className="overflow-hidden rounded-lg border border-[var(--fyxvo-border)]">
        <div className="flex items-center gap-2 border-b border-[var(--fyxvo-border)] bg-[#1e1e2e] px-4 py-2">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-green-500/70" />
          <span className="ml-2 text-[10px] text-slate-400">terminal</span>
        </div>
        <div className="bg-[#1e1e2e] px-4 py-4 space-y-2">
          <div className="flex items-center gap-2 text-[11px]">
            <span className="text-emerald-400">$</span>
            <span className="text-slate-300">fyxvo keys create --project my-dapp</span>
          </div>
          <div className="mt-2 rounded-md border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-3 py-2.5 flex items-center justify-between gap-3">
            <span className="font-mono text-sm text-emerald-300 tracking-wide">
              fyxvo_live_AbCd<span className="text-slate-500">...</span>XyZ
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className="flex-shrink-0 rounded border border-slate-600 px-2.5 py-1 text-[10px] font-medium text-slate-300 transition hover:border-slate-400 hover:text-white"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <p className="text-[10px] text-slate-500">
            Store this key securely — it will not be shown again.
          </p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        {[
          { label: "Scopes", value: "standard, priority" },
          { label: "Status", value: "Active" },
        ].map((item) => (
          <div key={item.label} className="rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-3">
            <p className="text-[10px] uppercase tracking-wider text-[var(--fyxvo-text-muted)]">{item.label}</p>
            <p className="mt-0.5 text-xs font-medium text-[var(--fyxvo-text)]">{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function StepRequest() {
  return (
    <div className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg-elevated)] p-5">
      <div className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">
        Make a Request
      </div>

      <div className="overflow-hidden rounded-lg border border-[var(--fyxvo-border)]">
        <div className="flex items-center gap-2 border-b border-[var(--fyxvo-border)] bg-[#1e1e2e] px-4 py-2">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-green-500/70" />
          <span className="ml-2 text-[10px] text-slate-400">curl · Standard RPC</span>
        </div>
        <pre className="overflow-x-auto bg-[#1e1e2e] p-4 text-[11px] leading-[1.65]">
          <code>
            <span className="text-yellow-300">curl</span>
            <span className="text-slate-300"> -X POST https://rpc.fyxvo.com/rpc \</span>
            {"\n"}
            <span className="text-slate-400">  -H </span>
            <span className="text-emerald-300">&quot;x-api-key: fyxvo_live_AbCd...XyZ&quot;</span>
            <span className="text-slate-300"> \</span>
            {"\n"}
            <span className="text-slate-400">  -H </span>
            <span className="text-emerald-300">&quot;Content-Type: application/json&quot;</span>
            <span className="text-slate-300"> \</span>
            {"\n"}
            <span className="text-slate-400">  -d </span>
            <span className="text-sky-300">&apos;{"{"}&quot;jsonrpc&quot;:&quot;2.0&quot;,&quot;id&quot;:1,</span>
            {"\n"}
            <span className="text-sky-300">       &quot;method&quot;:&quot;getLatestBlockhash&quot;,&quot;params&quot;:[]{"}"}&apos;</span>
          </code>
        </pre>
      </div>

      <div className="mt-3 overflow-hidden rounded-lg border border-[var(--fyxvo-border)]">
        <div className="flex items-center gap-2 border-b border-[var(--fyxvo-border)] bg-[#1e1e2e] px-4 py-2">
          <span className="text-[10px] font-semibold text-emerald-400">200 OK</span>
          <span className="text-[10px] text-slate-500">·</span>
          <span className="text-[10px] text-slate-400">43ms</span>
        </div>
        <pre className="overflow-x-auto bg-[#1e1e2e] p-4 text-[11px] leading-5">
          <code>
            <span className="text-slate-400">{"{"}</span>
            <span className="text-sky-300">&quot;jsonrpc&quot;</span>
            <span className="text-slate-400">:</span>
            <span className="text-emerald-300">&quot;2.0&quot;</span>
            <span className="text-slate-400">,</span>
            <span className="text-sky-300">&quot;id&quot;</span>
            <span className="text-slate-400">:</span>
            <span className="text-orange-300">1</span>
            <span className="text-slate-400">,</span>
            {"\n"}
            <span className="text-sky-300">  &quot;result&quot;</span>
            <span className="text-slate-400">: {"{"}</span>
            {"\n"}
            <span className="text-sky-300">    &quot;blockhash&quot;</span>
            <span className="text-slate-400">: </span>
            <span className="text-emerald-300">&quot;9WjC7...mK4p&quot;</span>
            <span className="text-slate-400">,</span>
            {"\n"}
            <span className="text-sky-300">    &quot;lastValidBlockHeight&quot;</span>
            <span className="text-slate-400">: </span>
            <span className="text-orange-300">285471890</span>
            {"\n"}
            <span className="text-slate-400">  {"}"}</span>
            {"\n"}
            <span className="text-slate-400">{"}"}</span>
          </code>
        </pre>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mini CSS bar chart for analytics step
// ---------------------------------------------------------------------------

const ANALYTICS_BARS = [
  { hour: "6am", count: 87 },
  { hour: "9am", count: 214 },
  { hour: "12pm", count: 312 },
  { hour: "3pm", count: 289 },
  { hour: "6pm", count: 182 },
  { hour: "9pm", count: 163 },
];

function StepAnalytics() {
  const max = Math.max(...ANALYTICS_BARS.map((b) => b.count));
  return (
    <div className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg-elevated)] p-5">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">
          Analytics
        </span>
        <span className="text-xs font-semibold text-[var(--fyxvo-text)]">1,247 requests today</span>
      </div>

      {/* Bar chart */}
      <div
        className="flex items-end gap-2 rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 pb-3 pt-4"
        style={{ height: 96 }}
      >
        {ANALYTICS_BARS.map((bar) => (
          <div key={bar.hour} className="flex flex-1 flex-col items-center gap-1">
            <div
              className="w-full rounded-t"
              style={{
                height: `${Math.max(4, Math.round((bar.count / max) * 58))}px`,
                background:
                  "linear-gradient(180deg, var(--color-brand-400, #818cf8), var(--color-brand-500, #6366f1))",
              }}
            />
            <span className="text-[9px] text-[var(--fyxvo-text-muted)]">{bar.hour}</span>
          </div>
        ))}
      </div>

      {/* Stats row */}
      <div className="mt-3 grid grid-cols-3 gap-2">
        {[
          { label: "Total requests", value: "1,247" },
          { label: "Success rate", value: "99.2%" },
          { label: "Avg latency", value: "43ms" },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-2 text-center"
          >
            <p className="text-[9px] uppercase tracking-wider text-[var(--fyxvo-text-muted)]">
              {item.label}
            </p>
            <p className="mt-0.5 text-xs font-semibold text-[var(--fyxvo-text)]">{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const DEMO_STEPS: DemoStep[] = [
  { id: 1, label: "Create a Project", content: <StepCreateProject /> },
  { id: 2, label: "Fund It", content: <StepFund /> },
  { id: 3, label: "Get an API Key", content: <StepApiKey /> },
  { id: 4, label: "Make a Request", content: <StepRequest /> },
  { id: 5, label: "View Analytics", content: <StepAnalytics /> },
];

export function InteractiveDemo() {
  const [activeStep, setActiveStep] = useState(1);
  const current = DEMO_STEPS.find((s) => s.id === activeStep) ?? DEMO_STEPS[0];

  // Keyboard navigation: ArrowLeft / ArrowRight
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;

      if (e.key === "ArrowLeft") {
        setActiveStep((s) => Math.max(1, s - 1));
      } else if (e.key === "ArrowRight") {
        setActiveStep((s) => Math.min(DEMO_STEPS.length, s + 1));
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div className="rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-6 md:p-8">
      {/* Tab bar */}
      <div className="mb-6 flex flex-wrap gap-2">
        {DEMO_STEPS.map((step) => (
          <button
            key={step.id}
            type="button"
            onClick={() => setActiveStep(step.id)}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition ${
              activeStep === step.id
                ? "bg-[var(--fyxvo-brand)] text-white"
                : "border border-[var(--fyxvo-border)] text-[var(--fyxvo-text-muted)] hover:text-[var(--fyxvo-text)]"
            }`}
          >
            <span
              className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold ${
                activeStep === step.id ? "bg-white/20" : "bg-[var(--fyxvo-border)]"
              }`}
            >
              {step.id}
            </span>
            {step.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="min-h-[220px]">{current?.content}</div>

      {/* Progress dots */}
      <div className="mt-5 flex items-center justify-center gap-2">
        {DEMO_STEPS.map((step) => (
          <button
            key={step.id}
            type="button"
            aria-label={`Go to step ${step.id}: ${step.label}`}
            onClick={() => setActiveStep(step.id)}
            className={`h-2 rounded-full transition-all duration-200 ${
              activeStep === step.id
                ? "w-5 bg-[var(--fyxvo-brand)]"
                : "w-2 bg-[var(--fyxvo-border)] hover:bg-[var(--fyxvo-text-muted)]"
            }`}
          />
        ))}
      </div>

      {/* Navigation + CTA */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-2">
          <button
            type="button"
            disabled={activeStep === 1}
            onClick={() => setActiveStep((s) => Math.max(1, s - 1))}
            className="rounded-lg border border-[var(--fyxvo-border)] px-3 py-1.5 text-xs font-medium text-[var(--fyxvo-text-muted)] transition hover:text-[var(--fyxvo-text)] disabled:opacity-30"
          >
            ← Prev
          </button>
          <button
            type="button"
            disabled={activeStep === DEMO_STEPS.length}
            onClick={() => setActiveStep((s) => Math.min(DEMO_STEPS.length, s + 1))}
            className="rounded-lg border border-[var(--fyxvo-border)] px-3 py-1.5 text-xs font-medium text-[var(--fyxvo-text-muted)] transition hover:text-[var(--fyxvo-text)] disabled:opacity-30"
          >
            Next →
          </button>
        </div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--fyxvo-brand)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--fyxvo-brand-strong)]"
        >
          Create your free account →
        </Link>
      </div>
    </div>
  );
}
