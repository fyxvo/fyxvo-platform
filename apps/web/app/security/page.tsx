export default function SecurityPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <h1 className="text-4xl font-bold tracking-tight text-[var(--fyxvo-text)]">Security</h1>
      <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--fyxvo-text-soft)]">
        The live security posture is openly scoped: the Anchor program, API, gateway, and web app
        are in scope for vulnerability reports. Fyxvo is still devnet private alpha, which means
        the product is live but not yet claiming public paid mainnet readiness.
      </p>

      <div className="mt-10 grid gap-5 lg:grid-cols-2">
        <div className="rounded-3xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-6">
          <h2 className="text-xl font-semibold text-[var(--fyxvo-text)]">In scope</h2>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-[var(--fyxvo-text-soft)]">
            <li>Anchor program fund accounting, project activation, and treasury management</li>
            <li>api.fyxvo.com authentication, authorization, project, webhook, and assistant flows</li>
            <li>rpc.fyxvo.com API key validation, scope enforcement, routing, and rate limiting</li>
            <li>www.fyxvo.com frontend issues such as XSS, CSRF, or auth bypass</li>
          </ul>
        </div>
        <div className="rounded-3xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-6">
          <h2 className="text-xl font-semibold text-[var(--fyxvo-text)]">Current status</h2>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-[var(--fyxvo-text-soft)]">
            <li>Devnet only, with no live mainnet funds represented in the product today</li>
            <li>Sessions are created from wallet-signed authentication messages</li>
            <li>USDC funding remains gated off in the current deployment</li>
            <li>Security disclosures are coordinated privately before public write-up</li>
          </ul>
        </div>
      </div>

      <div className="mt-10 rounded-[2rem] border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-8">
        <h2 className="text-2xl font-semibold text-[var(--fyxvo-text)]">Responsible disclosure</h2>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--fyxvo-text-soft)]">
          Do not file public issues for vulnerabilities. Send the issue description, reproduction
          steps, impact, and any mitigations to{" "}
          <a href="mailto:security@fyxvo.com" className="text-[var(--fyxvo-brand)]">
            security@fyxvo.com
          </a>
          . The public security policy targets acknowledgment within 48 hours, critical fixes within
          7 days, and high-severity fixes within 30 days.
        </p>
      </div>
    </div>
  );
}
