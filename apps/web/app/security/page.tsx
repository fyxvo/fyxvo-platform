const SECTIONS = [
  {
    title: "Program and treasury safety",
    body: "The live scope includes the Anchor program, project activation path, funding instructions, treasury accounting, and authority configuration that govern how devnet balances are managed.",
  },
  {
    title: "API and gateway security",
    body: "The live scope also includes wallet authentication, JWT session handling, project authorization, API key issuance, scope enforcement, rate limiting, webhook delivery, and relay routing at api.fyxvo.com and rpc.fyxvo.com.",
  },
  {
    title: "Frontend and session integrity",
    body: "The web app is part of the real security boundary. Browser-side issues such as XSS, CSRF, broken auth transitions, and client-side exposure of protected actions are all treated as meaningful reportable findings.",
  },
  {
    title: "Current alpha posture",
    body: "Fyxvo is live on devnet private alpha. That means the product is operating for real users, but it is not presented as a public paid mainnet service and does not claim the risk profile of a finalized production rollout.",
  },
] as const;

export default function SecurityPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <h1 className="text-4xl font-bold tracking-tight text-[var(--fyxvo-text)]">Security</h1>
      <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--fyxvo-text-soft)]">
        Security at Fyxvo is described in terms of the live product boundary rather than marketing
        language. The control plane, relay gateway, wallet auth flow, on-chain program, webhook
        delivery, and public web surfaces are all part of the system users rely on today.
      </p>

      <div className="mt-10 grid gap-5 lg:grid-cols-2">
        {SECTIONS.map((section) => (
          <div
            key={section.title}
            className="rounded-3xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-6"
          >
            <h2 className="text-xl font-semibold text-[var(--fyxvo-text)]">{section.title}</h2>
            <p className="mt-3 text-sm leading-7 text-[var(--fyxvo-text-soft)]">{section.body}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 rounded-[2rem] border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-8">
        <h2 className="text-2xl font-semibold text-[var(--fyxvo-text)]">Responsible disclosure</h2>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--fyxvo-text-soft)]">
          Do not file public issues for vulnerabilities. Send the issue description, reproduction
          steps, impact, and any mitigation ideas to{" "}
          <a href="mailto:security@fyxvo.com" className="text-[var(--fyxvo-brand)]">
            security@fyxvo.com
          </a>
          . The working target is acknowledgment within 48 hours, critical remediation inside 7
          days when feasible, and a coordinated write-up only after the risk has been addressed.
        </p>
      </div>
    </div>
  );
}
