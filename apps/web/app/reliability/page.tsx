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
        title="How Fyxvo approaches reliability in private alpha"
        description="This is the operational posture for today’s devnet deployment: honest monitoring, visible incidents, managed infrastructure, and no fake SLA promises."
      />

      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
          <CardHeader>
            <CardTitle>What is monitored</CardTitle>
            <CardDescription>The current live control points across API, gateway, and supporting services.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-7 text-[var(--fyxvo-text-soft)]">
            <p>Gateway and API health checks are captured continuously and surfaced on the public status page.</p>
            <p>Request logs, latency rollups, webhook failures, CSP violations, and assistant health are visible in admin and product diagnostics.</p>
            <p>Project-level analytics, alerting, and request traces are available to authenticated teams operating real integrations.</p>
          </CardContent>
        </Card>

        <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
          <CardHeader>
            <CardTitle>Incident handling</CardTitle>
            <CardDescription>What happens when something is degraded or broken.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-7 text-[var(--fyxvo-text-soft)]">
            <p>Incidents are recorded explicitly and shown on the status page rather than hidden behind vague “issues” language.</p>
            <p>Operational alerts link back to incident context when a platform-wide problem may explain project-level symptoms.</p>
            <p>Status history is generated from service health snapshots instead of hand-written uptime claims.</p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
          <CardHeader>
            <CardTitle>Retries and safeguards</CardTitle>
            <CardDescription>Current protection mechanisms in the live stack.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-7 text-[var(--fyxvo-text-soft)]">
            <p>Webhook retries and permanent failure tracking are built into the delivery pipeline.</p>
            <p>API idempotency and scoped key checks reduce accidental duplicate writes and overly broad access.</p>
            <p>Simulation mode offers a safer testing path before sending live funded request flow.</p>
          </CardContent>
        </Card>

        <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
          <CardHeader>
            <CardTitle>Managed infrastructure</CardTitle>
            <CardDescription>What that means in the current devnet phase.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-7 text-[var(--fyxvo-text-soft)]">
            <p>Fyxvo currently runs managed operator infrastructure for the devnet launch.</p>
            <p>The reliability posture is controlled and observable, but it is not yet an open mainnet marketplace claim.</p>
            <p>The status page and admin readiness views are designed to make that distinction visible.</p>
          </CardContent>
        </Card>

        <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
          <CardHeader>
            <CardTitle>What devnet reliability means</CardTitle>
            <CardDescription>Why the wording stays careful today.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-7 text-[var(--fyxvo-text-soft)]">
            <p>Devnet is useful for integration validation, funded request flow, and operational practice.</p>
            <p>It is not a substitute for future mainnet reliability work, governance hardening, or external audit posture.</p>
            <p>Fyxvo is explicit about current scope so teams know exactly what is live and what is still ahead.</p>
          </CardContent>
        </Card>
      </section>

      <Notice tone="neutral" title="No fake SLA claims">
        Fyxvo does not publish a formal SLA for the current devnet private alpha. Reliability work is visible through real monitoring, status history, incident updates, and honest product diagnostics.
      </Notice>
    </div>
  );
}
