import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Notice } from "@fyxvo/ui";
import { PageHeader } from "../../components/page-header";
import { webEnv } from "../../lib/env";

export const metadata: Metadata = {
  title: "Security — Fyxvo",
  description:
    "How Fyxvo handles vulnerability reporting, secrets, API keys, and the current scope of security review during the devnet private alpha.",
  alternates: {
    canonical: `${webEnv.siteUrl}/security`,
  },
  openGraph: {
    title: "Security — Fyxvo",
    description:
      "How Fyxvo handles vulnerability reporting, secrets, API keys, and the current scope of security review during the devnet private alpha.",
    url: `${webEnv.siteUrl}/security`,
    siteName: "Fyxvo",
    type: "website",
    images: [{ url: webEnv.socialImageUrl }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Security — Fyxvo",
    description:
      "How Fyxvo handles vulnerability reporting, secrets, API keys, and the current scope of security review during the devnet private alpha.",
    images: [webEnv.socialImageUrl],
  },
};

export default function SecurityPage() {
  return (
    <div className="space-y-10 lg:space-y-12">
      <PageHeader
        eyebrow="Security"
        title="Security posture for the current Fyxvo stage"
        description="Fyxvo is in a devnet private alpha, so this page is intentionally specific about what is in place today, what still needs review, and how to report issues responsibly."
      />

      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
          <CardHeader>
            <CardTitle>Report a vulnerability</CardTitle>
            <CardDescription>Use a private channel for anything that could affect user funds, credentials, or service integrity.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-7 text-[var(--fyxvo-text-soft)]">
            <p>Email security disclosures to <a className="text-[var(--fyxvo-brand)]" href="mailto:security@fyxvo.com">security@fyxvo.com</a>.</p>
            <p>Include reproduction steps, impact, and any proof-of-concept details that help validate the issue quickly.</p>
            <p>Do not publish exploit details before Fyxvo has had a reasonable chance to investigate and respond.</p>
            <p>
              Repository policy:{" "}
              <Link className="text-[var(--fyxvo-brand)]" href="https://github.com/fyxvo/fyxvo-platform/blob/main/SECURITY.md" target="_blank" rel="noopener noreferrer">
                SECURITY.md
              </Link>
            </p>
          </CardContent>
        </Card>

        <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
          <CardHeader>
            <CardTitle>Current security scope</CardTitle>
            <CardDescription>High-level controls that exist today in the live product.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-7 text-[var(--fyxvo-text-soft)]">
            <p>Wallet authentication uses signed challenges rather than password login.</p>
            <p>Gateway access requires project-scoped API keys with explicit scopes and clean revocation paths.</p>
            <p>Secrets are stored in managed runtime configuration, not committed to the repository.</p>
            <p>Webhook URLs are validated against private and internal address targets to reduce SSRF risk.</p>
            <p>CSP reporting, request logging, incident tracking, and support workflows are live for operational visibility.</p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
          <CardHeader>
            <CardTitle>Secrets and keys</CardTitle>
            <CardDescription>What Fyxvo does and does not handle.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-7 text-[var(--fyxvo-text-soft)]">
            <p>Fyxvo never asks for or stores wallet private keys.</p>
            <p>API keys are shown once at creation time, stored as hashes server-side, and can be rotated or revoked from the product.</p>
            <p>Webhook secrets are generated per endpoint and used for HMAC verification.</p>
            <p>Anthropic access for the assistant is handled by backend runtime secrets, not exposed to browsers.</p>
          </CardContent>
        </Card>

        <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
          <CardHeader>
            <CardTitle>What is not audited yet</CardTitle>
            <CardDescription>Honest scope boundaries for a devnet private alpha.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-7 text-[var(--fyxvo-text-soft)]">
            <p>Fyxvo does not claim a completed external security audit for the full platform stack today.</p>
            <p>The devnet launch is intended for controlled evaluation, integration testing, and operational hardening before any future mainnet posture is claimed.</p>
            <p>Mainnet readiness, broader external review, and stronger governance posture are still future work.</p>
          </CardContent>
        </Card>
      </section>

      <Notice tone="warning" title="Current stage">
        Fyxvo is live for real developer evaluation on Solana devnet, but this is still a private alpha. Test code carefully, keep wallet hygiene strict, and do not treat the current stack as a mainnet-grade audited environment yet.
      </Notice>
    </div>
  );
}
