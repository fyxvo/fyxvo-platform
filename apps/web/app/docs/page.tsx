import { Card, CardContent, CardDescription, CardHeader, CardTitle, Notice } from "@fyxvo/ui";
import { CopyButton } from "../../components/copy-button";
import { PageHeader } from "../../components/page-header";
import { SocialLinkButtons } from "../../components/social-links";
import { docsSections } from "../../lib/sample-data";
import { webEnv } from "../../lib/env";

export default function DocsPage() {
  const endpoints = [
    ["API health", `${webEnv.apiBaseUrl}/health`],
    ["API auth challenge", `${webEnv.apiBaseUrl}/v1/auth/challenge`],
    ["Projects", `${webEnv.apiBaseUrl}/v1/projects`],
    ["Analytics overview", `${webEnv.apiBaseUrl}/v1/analytics/overview`],
    ["Gateway RPC", `${webEnv.gatewayBaseUrl}/rpc`],
    ["Gateway priority relay", `${webEnv.gatewayBaseUrl}/priority`],
  ] as const;
  const quickstartSteps = [
    {
      title: "Connect a wallet",
      body: "Start from the dashboard. The app requests a challenge, asks the connected wallet to sign it, and exchanges that signature for a JWT-backed API session.",
    },
    {
      title: "Create and activate a project",
      body: "Project creation prepares the real activation transaction immediately, so the project becomes usable as soon as the wallet signs and devnet confirms it.",
    },
    {
      title: "Fund with SOL",
      body: "Prepare a SOL funding transaction, review the amount in lamports, sign it in the wallet, and wait for API verification to refresh on-chain balances.",
    },
    {
      title: "Issue a key and send traffic",
      body: "Generate one relay key, copy the `/rpc` endpoint, and send a small JSON-RPC request. That first request should then appear in analytics and status surfaces.",
    },
  ] as const;
  const standardRequest = `curl -X POST ${webEnv.gatewayBaseUrl}/rpc \\
  -H "content-type: application/json" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}'`;
  const priorityRequest = `curl -X POST ${webEnv.gatewayBaseUrl}/priority \\
  -H "content-type: application/json" \\
  -H "x-api-key: YOUR_PRIORITY_KEY" \\
  -d '{"jsonrpc":"2.0","id":7,"method":"getSlot"}'`;
  const authExample = `curl -X POST ${webEnv.apiBaseUrl}/v1/auth/challenge \\
  -H "content-type: application/json" \\
  -d '{"walletAddress":"YOUR_SOLANA_WALLET"}'`;
  const sdkExample = `import { createFyxvoClient } from "@fyxvo/sdk";

const client = createFyxvoClient({
  baseUrl: "${webEnv.gatewayBaseUrl}",
  apiKey: process.env.FYXVO_API_KEY
});

const response = await client.rpc({
  id: 1,
  method: "getHealth"
});

console.log(response);`;

  return (
    <div className="space-y-10 lg:space-y-12">
      <PageHeader
        eyebrow="Docs"
        title="Quickstart, funding, relay usage, and troubleshooting in one place."
        description="This guide is tuned for the first real private-alpha session. It shows what is live today, what is still gated, and how to move from wallet auth to the first successful request without guessing."
      />

      <Notice tone="neutral" title="Devnet only">
        Fyxvo is live on Solana devnet today. SOL is the public live funding path. USDC remains
        intentionally configuration-gated until it is explicitly enabled for the deployment.
      </Notice>

      <Notice tone="neutral" title="Need a direct line while integrating?">
        Docs cover the fastest self-serve path. For launch-fit questions, issue reports, or managed
        rollout conversations, use the community paths below or the contact page support forms.
        <div className="mt-4">
          <SocialLinkButtons />
        </div>
      </Notice>

      <Notice tone="neutral" title="Team and operations guide">
        The deeper project lifecycle, funding lifecycle, usage-governance expectations, managed
        operator posture, and private alpha onboarding notes are documented in{" "}
        <code>docs/team-operations.md</code> and <code>docs/private-alpha.md</code> inside the
        repository.
      </Notice>

      <section className="grid gap-6 lg:grid-cols-3">
        {docsSections.map((section, index) => (
          <Card key={section.title} className="fyxvo-surface border-white/5">
            <CardHeader>
              <div className="text-xs uppercase tracking-[0.18em] text-brand-300">
                Section {index + 1}
              </div>
              <CardTitle className="mt-2">{section.title}</CardTitle>
              <CardDescription>{section.body}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
          <CardHeader>
            <CardTitle>Quickstart</CardTitle>
            <CardDescription>
              This is the cleanest first-user path through the live product.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {quickstartSteps.map((step, index) => (
              <div
                key={step.title}
                className="rounded-[1.5rem] border border-[color:var(--fyxvo-border)] bg-[color:var(--fyxvo-panel-soft)] p-4"
              >
                <div className="text-xs uppercase tracking-[0.16em] text-brand-300">
                  Step {index + 1}
                </div>
                <div className="mt-2 text-lg font-semibold text-[var(--fyxvo-text)]">
                  {step.title}
                </div>
                <p className="mt-3 text-sm leading-6 text-[var(--fyxvo-text-soft)]">{step.body}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
          <CardHeader>
            <CardTitle>Funding and status notes</CardTitle>
            <CardDescription>
              These are the details most teams need when something feels ambiguous during the first
              devnet run.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Notice tone="neutral" title="Funding explanation">
              The API prepares the unsigned transaction. The wallet signs and sends it. The API then
              verifies the signature and refreshes the project’s on-chain balance view.
            </Notice>
            <Notice tone="neutral" title="Status explanation">
              The public status page reads the hosted API and gateway health surfaces and combines
              them with protocol readiness so the product stays honest about what is actually live.
            </Notice>
            <Notice tone="neutral" title="Monitoring and operations">
              Deployment, health surfaces, and recommended monitoring triggers are documented in{" "}
              <code>docs/monitoring.md</code> and <code>docs/deployment.md</code>.
            </Notice>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="fyxvo-surface border-white/5">
          <CardHeader>
            <CardTitle>Core endpoints</CardTitle>
            <CardDescription>
              These are the URLs most teams use first when they integrate the API and relay
              services.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {endpoints.map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="text-xs uppercase tracking-[0.16em] text-slate-500">
                      {label}
                    </div>
                    <div className="mt-2 break-all text-sm font-medium text-white">{value}</div>
                  </div>
                  <CopyButton value={value} className="self-start sm:shrink-0" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
            <CardHeader>
              <CardTitle>API usage examples</CardTitle>
              <CardDescription>
                Copy these as starting points, then replace the placeholder key with the value
                generated in the product.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-[1.5rem] border border-[color:var(--fyxvo-border)] bg-[color:var(--fyxvo-panel-soft)] p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-text-muted)]">
                      Auth challenge
                    </div>
                    <pre className="mt-3 overflow-x-auto text-xs leading-6 text-[var(--fyxvo-text-soft)]">
                      <code>{authExample}</code>
                    </pre>
                  </div>
                  <CopyButton value={authExample} className="self-start sm:shrink-0" />
                </div>
              </div>
              <div className="rounded-[1.5rem] border border-[color:var(--fyxvo-border)] bg-[color:var(--fyxvo-panel-soft)] p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-text-muted)]">
                      Standard relay request
                    </div>
                    <pre className="mt-3 overflow-x-auto text-xs leading-6 text-[var(--fyxvo-text-soft)]">
                      <code>{standardRequest}</code>
                    </pre>
                  </div>
                  <CopyButton value={standardRequest} className="self-start sm:shrink-0" />
                </div>
              </div>
              <div className="rounded-[1.5rem] border border-[color:var(--fyxvo-border)] bg-[color:var(--fyxvo-panel-soft)] p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-text-muted)]">
                      Priority relay request
                    </div>
                    <pre className="mt-3 overflow-x-auto text-xs leading-6 text-[var(--fyxvo-text-soft)]">
                      <code>{priorityRequest}</code>
                    </pre>
                  </div>
                  <CopyButton value={priorityRequest} className="self-start sm:shrink-0" />
                </div>
              </div>
              <div className="rounded-[1.5rem] border border-[color:var(--fyxvo-border)] bg-[color:var(--fyxvo-panel-soft)] p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-text-muted)]">
                      TypeScript SDK
                    </div>
                    <pre className="mt-3 overflow-x-auto text-xs leading-6 text-[var(--fyxvo-text-soft)]">
                      <code>{sdkExample}</code>
                    </pre>
                  </div>
                  <CopyButton value={sdkExample} className="self-start sm:shrink-0" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Notice tone="neutral" title="Wallet session flow">
            The frontend requests a challenge from the API, asks the connected wallet to sign the
            message, then exchanges the signed payload for a JWT. That session becomes the bridge
            between wallet identity and project-scoped API actions.
          </Notice>
          <Notice tone="neutral" title="Funding flow">
            Funding requests are prepared by the API against the Anchor program. The browser can
            keep the unsigned transaction for review or send it directly through the connected
            wallet for a devnet confirmation path.
          </Notice>
          <Notice tone="neutral" title="Relay usage">
            Standard traffic goes to <code>/rpc</code>. Latency-sensitive traffic goes to{" "}
            <code>/priority</code>. Keeping these two paths separate gives teams clearer pricing and
            better operational discipline.
          </Notice>
          <Notice tone="neutral" title="Wallet support">
            Fyxvo supports Phantom, Solflare, Backpack, and Wallet Standard compatible wallets
            through the Solana wallet adapter layer. Phantom remains the most direct path for the
            browser-first devnet flow.
          </Notice>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
          <CardHeader>
            <CardTitle>Project activation</CardTitle>
            <CardDescription>
              Project creation is not just an off-chain record. It includes the live activation
              transaction for the on-chain project account.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm leading-7 text-[var(--fyxvo-text-soft)]">
            After wallet auth, the API creates the project record, derives the PDA, and prepares the
            activation transaction. The project is only fully ready once the wallet signs it and the
            API verifies confirmation.
          </CardContent>
        </Card>
        <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
          <CardHeader>
            <CardTitle>Devnet wallet funding</CardTitle>
            <CardDescription>
              The first SOL funding pass should be small and deliberate.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm leading-7 text-[var(--fyxvo-text-soft)]">
            Fund your devnet wallet first, then fund the project through Fyxvo. That keeps the
            control plane, the Anchor program, and the gateway aligned before you scale request
            volume.
          </CardContent>
        </Card>
        <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
          <CardHeader>
            <CardTitle>Status and troubleshooting</CardTitle>
            <CardDescription>
              When something feels off, the shortest path to clarity is the status surface plus one
              direct health check.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm leading-7 text-[var(--fyxvo-text-soft)]">
            Check <code>{webEnv.statusPageUrl}</code>, then compare{" "}
            <code>{webEnv.apiBaseUrl}/health</code> and{" "}
            <code>{webEnv.gatewayBaseUrl}/v1/status</code>. If SOL funding confirmed but relay
            access still fails, check the selected project and API key before assuming a chain
            issue.
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
