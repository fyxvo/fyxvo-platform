export default function ChangelogPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <h1 className="text-4xl font-bold text-[#f1f5f9] mb-4">Changelog</h1>
          <p className="text-[#64748b] mb-16">A history of releases and notable updates.</p>

          {/* Timeline */}
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-4 top-0 bottom-0 w-px bg-white/[0.08]" />

            <div className="relative pl-16 pb-16">
              {/* Version badge */}
              <div className="absolute left-0 flex items-center justify-center w-8 h-8 rounded-full border border-[#f97316]/40 bg-[#f97316]/10 -translate-y-1">
                <div className="w-2 h-2 rounded-full bg-[#f97316]" />
              </div>

              <div className="space-y-8">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="inline-flex items-center rounded-full border border-[#f97316]/30 bg-[#f97316]/10 px-3 py-1 text-xs font-mono font-semibold text-[#f97316]">
                      v0.1.0
                    </span>
                    <span className="text-sm text-[#64748b]">Initial Alpha Release</span>
                  </div>

                  <h2 className="text-xl font-bold text-[#f1f5f9] mb-4">
                    Initial Alpha Release
                  </h2>

                  <div className="space-y-4 text-[#94a3b8] text-sm leading-relaxed">
                    <p>
                      Fyxvo launched on Solana devnet with a complete project activation flow, on-chain funded relay
                      access, scoped API key issuance, request analytics, and wallet-authenticated sessions. The relay
                      gateway went live at{" "}
                      <span className="font-mono text-[#f1f5f9]">rpc.fyxvo.com</span>, the control plane at{" "}
                      <span className="font-mono text-[#f1f5f9]">api.fyxvo.com</span>, and the first public status
                      surface at{" "}
                      <span className="font-mono text-[#f1f5f9]">status.fyxvo.com</span>.
                    </p>

                    <p>
                      The program was deployed to address{" "}
                      <a
                        href="https://explorer.solana.com/address/Gsi8tsTm7BinEgcYd1Uc4wtNBjMrjYfbtKdoDpGdvkJc?cluster=devnet"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-[#f97316] hover:underline break-all"
                      >
                        Gsi8tsTm7BinEgcYd1Uc4wtNBjMrjYfbtKdoDpGdvkJc
                      </a>{" "}
                      on Solana devnet. Project activation involves signing an on-chain transaction that registers the
                      project PDA, establishes the treasury vault, and associates the initial operator configuration.
                    </p>

                    <p>
                      Funding is denominated in SOL and consumed as lamports per request routed through the gateway.
                      The standard relay costs <span className="font-mono text-[#f1f5f9]">1000 lamports</span> per
                      request. The priority relay costs{" "}
                      <span className="font-mono text-[#f1f5f9]">5000 lamports</span> per request.
                    </p>

                    <p>
                      The assistant launched with SSE streaming responses, conversation history, project context
                      awareness, and a 20 messages per hour rate limit per user.
                    </p>

                    <div>
                      <p className="font-medium text-[#f1f5f9] mb-3">Features shipped in this release:</p>
                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {[
                          "Wallet auth with challenge-response signing",
                          "Project creation with on-chain activation",
                          "SOL funding with verify flow",
                          "Scoped API keys",
                          "Request logs",
                          "Analytics overview",
                          "Per-project health score",
                          "Webhook delivery",
                          "Member invite",
                          "Public project profiles",
                          "Playground",
                          "Docs",
                          "Status page with uptime history",
                          "Pricing calculator",
                          "Leaderboard",
                          "Explore view",
                          "Newsletter signup",
                        ].map((feature) => (
                          <li key={feature} className="flex items-start gap-2 text-sm">
                            <span className="text-[#f97316] mt-0.5 shrink-0">+</span>
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="pt-2">
                      <a
                        href="https://explorer.solana.com/address/Gsi8tsTm7BinEgcYd1Uc4wtNBjMrjYfbtKdoDpGdvkJc?cluster=devnet"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm text-[#f97316] hover:underline"
                      >
                        View program on Solana Explorer
                        <span aria-hidden="true">&#8599;</span>
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
