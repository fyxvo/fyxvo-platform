import type { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Notice } from "@fyxvo/ui";
import { PageHeader } from "../../components/page-header";
import { webEnv } from "../../lib/env";

export const metadata: Metadata = {
  title: "Reliability — Fyxvo",
  description:
    "How Fyxvo monitors gateway and API health, tracks incidents, and thinks about reliability during the current devnet private alpha.",
  alternates: {
    canonical: `${webEnv.siteUrl}/reliability`,
  },
  openGraph: {
    title: "Reliability — Fyxvo",
    description:
      "How Fyxvo monitors gateway and API health, tracks incidents, and thinks about reliability during the current devnet private alpha.",
    url: `${webEnv.siteUrl}/reliability`,
    siteName: "Fyxvo",
    type: "website",
    images: [{ url: webEnv.socialImageUrl }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Reliability — Fyxvo",
    description:
      "How Fyxvo monitors gateway and API health, tracks incidents, and thinks about reliability during the current devnet private alpha.",
    images: [webEnv.socialImageUrl],
  },
};

export default function ReliabilityPage() {
  return (
    <div className="space-y-10 lg:space-y-12">
      <PageHeader
        eyebrow="Reliability"
        title="How we think about reliability during private alpha"
        description="This is what our operational reality looks like today on devnet: real monitoring, visible incidents, managed infrastructure, and no uptime promises we cannot actually back up."
      />

      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
          <CardHeader>
            <CardTitle>What we are watching</CardTitle>
            <CardDescription>The live monitoring that covers our API, gateway, and supporting services right now.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-7 text-[var(--fyxvo-text-soft)]">
            <p>We run continuous health checks on the gateway and API, and those results feed directly into our public status page so you can see exactly what we see.</p>
            <p>Internally, we track request logs, latency rollups, webhook delivery failures, CSP violations, and assistant health through admin and product diagnostics.</p>
            <p>If your team is running a real integration, you also get project-level analytics, alerting, and request traces through your authenticated dashboard.</p>
          </CardContent>
        </Card>

        <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
          <CardHeader>
            <CardTitle>When something breaks</CardTitle>
            <CardDescription>How we handle incidents when things go wrong.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-7 text-[var(--fyxvo-text-soft)]">
            <p>We log incidents explicitly and post them on the status page. You will not see vague language about "experiencing issues" without context.</p>
            <p>When a platform-wide problem might explain symptoms you are seeing at the project level, our operational alerts link back to the relevant incident so you can connect the dots.</p>
            <p>Status history comes from actual service health snapshots, not hand-written summaries about how great our uptime has been.</p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
          <CardHeader>
            <CardTitle>Retries and safeguards</CardTitle>
            <CardDescription>The protection mechanisms that are live in the stack today.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-7 text-[var(--fyxvo-text-soft)]">
            <p>Webhook delivery has built-in retries, and we track permanent failures so nothing silently disappears into a void.</p>
            <p>API requests support idempotency, and scoped key checks make it harder to accidentally fire duplicate writes or grant overly broad access.</p>
            <p>If you want to test things without real funds on the line, simulation mode gives you a safer path before you move to live funded request flows.</p>
          </CardContent>
        </Card>

        <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
          <CardHeader>
            <CardTitle>Our infrastructure setup</CardTitle>
            <CardDescription>What "managed infrastructure" actually means at this stage.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-7 text-[var(--fyxvo-text-soft)]">
            <p>Right now, Fyxvo runs on managed operator infrastructure that we control for the devnet launch.</p>
            <p>That means reliability is something we can observe and influence directly, but we are not yet making the kind of claims you would expect from an open mainnet marketplace.</p>
            <p>The status page and admin readiness views exist specifically to make that distinction clear, both for us and for you.</p>
          </CardContent>
        </Card>

        <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
          <CardHeader>
            <CardTitle>What devnet reliability actually means</CardTitle>
            <CardDescription>Why we are careful with our wording at this stage.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-7 text-[var(--fyxvo-text-soft)]">
            <p>Devnet is genuinely useful. You can validate integrations, test funded request flows, and build real operational muscle with it.</p>
            <p>But it is not a stand-in for the reliability work, governance hardening, and external auditing that mainnet will demand.</p>
            <p>We would rather be specific about what is live and what is still ahead than let anyone assume more than what is actually true today.</p>
          </CardContent>
        </Card>
      </section>

      <Notice tone="neutral" title="No fake SLA claims">
        We are not publishing a formal SLA for the devnet private alpha. What we are doing instead is making reliability visible through real monitoring, status history, incident updates, and honest product diagnostics. You can judge for yourself.
      </Notice>
    </div>
  );
}
