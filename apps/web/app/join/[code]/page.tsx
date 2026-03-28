"use client";

import { use, useEffect } from "react";
import Link from "next/link";
import { WalletConnectButton } from "../../../components/wallet-connect-button";

const API = "https://api.fyxvo.com";

export default function JoinPage({
  params,
}: {
  readonly params: Promise<{ code: string }>;
}) {
  const { code } = use(params);

  useEffect(() => {
    if (!code) return;
    void fetch(`${API}/v1/referral/click/${code}`, {
      method: "POST",
    }).catch(() => {
      // Non-fatal — best-effort click recording
    });
  }, [code]);

  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center p-6"
      style={{ backgroundColor: "#0a0a0f" }}
    >
      <div className="w-full max-w-lg space-y-8">
        {/* Heading */}
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#f97316]">
            Welcome
          </p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-[#f1f5f9] sm:text-5xl">
            You&apos;ve been invited to Fyxvo
          </h1>
          <p className="mt-5 text-base leading-7 text-[#64748b]">
            Fyxvo is a managed Solana devnet RPC relay with on-chain funding,
            per-project API keys, method-level analytics, and priority routing.
            Activate a project on chain, fund it with SOL, issue a key, and
            start routing real devnet traffic in minutes.
          </p>
        </div>

        {/* Feature highlights */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            {
              title: "On-chain funding",
              body: "Fund your project with devnet SOL. Credits are consumed per request.",
            },
            {
              title: "Analytics",
              body: "Method-level telemetry: request counts, latency, error rates.",
            },
            {
              title: "Priority relay",
              body: "A dedicated relay path for DeFi and latency-sensitive calls.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5"
            >
              <p className="font-semibold text-[#f1f5f9]">{item.title}</p>
              <p className="mt-1.5 text-sm leading-5 text-[#64748b]">{item.body}</p>
            </div>
          ))}
        </div>

        {/* Connect prompt */}
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 text-center">
          <p className="mb-4 text-sm font-medium text-[#f1f5f9]">
            Connect your wallet to get started
          </p>
          <WalletConnectButton />
        </div>

        {/* Learn more */}
        <p className="text-center text-sm text-[#64748b]">
          Not sure yet?{" "}
          <Link
            href="/docs"
            className="text-[#f97316] hover:underline"
          >
            Learn more in the docs
          </Link>
        </p>
      </div>
    </main>
  );
}
