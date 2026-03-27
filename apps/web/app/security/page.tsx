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
        title="Where Fyxvo stands on security right now"
        description="We are running a devnet private alpha, so we want to be straightforward about what protections are already in place, what still needs work, and how you can let us know if you find something wrong."
      />

      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
          <CardHeader>
            <CardTitle>Found a vulnerability?</CardTitle>
            <CardDescription>If it could affect user funds, credentials, or service integrity, please reach out privately first.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-7 text-[var(--fyxvo-text-soft)]">
            <p>Send security disclosures to <a className="text-[var(--fyxvo-brand)]" href="mailto:security@fyxvo.com">security@fyxvo.com</a>.</p>
            <p>The more detail you can share, the better. Reproduction steps, a description of the impact, and any proof-of-concept material all help us validate and respond quickly.</p>
            <p>We ask that you hold off on publishing exploit details until we have had a reasonable window to investigate and address the issue.</p>
            <p>
              You can also find our disclosure policy in the repository:{" "}
              <Link className="text-[var(--fyxvo-brand)]" href="https://github.com/fyxvo/fyxvo-platform/blob/main/SECURITY.md" target="_blank" rel="noopener noreferrer">
                SECURITY.md
              </Link>
            </p>
          </CardContent>
        </Card>

        <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
          <CardHeader>
            <CardTitle>What we have in place today</CardTitle>
            <CardDescription>These are the security controls that are live in the product right now.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-7 text-[var(--fyxvo-text-soft)]">
            <p>Authentication works through signed wallet challenges. There are no passwords involved.</p>
            <p>Gateway access is gated behind project-scoped API keys. Each key has explicit scopes, and you can revoke them cleanly whenever you need to.</p>
            <p>All secrets live in managed runtime configuration. Nothing sensitive gets committed to the repo.</p>
            <p>Webhook URLs go through validation that blocks private and internal address targets, which helps reduce SSRF exposure.</p>
            <p>On the operational side, we have CSP reporting, request logging, incident tracking, and support workflows running so we can actually see what is happening.</p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
          <CardHeader>
            <CardTitle>How we handle secrets and keys</CardTitle>
            <CardDescription>A clear picture of what Fyxvo touches and what it does not.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-7 text-[var(--fyxvo-text-soft)]">
            <p>We will never ask you for your wallet private keys, and we do not store them.</p>
            <p>When you create an API key, you see it once. After that, we only store a hash on our end. You can rotate or revoke keys directly from the product whenever you want.</p>
            <p>Each webhook endpoint gets its own generated secret, which is used for HMAC verification so you can confirm that requests are genuinely coming from Fyxvo.</p>
            <p>The AI assistant runs through backend runtime secrets. None of that credential material is ever exposed to your browser.</p>
          </CardContent>
        </Card>

        <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
          <CardHeader>
            <CardTitle>What has not been audited yet</CardTitle>
            <CardDescription>We think it is important to be honest about where the boundaries are.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-7 text-[var(--fyxvo-text-soft)]">
            <p>We have not completed a formal external security audit of the full platform stack. That is the truth of where things stand today.</p>
            <p>The devnet launch exists so we can do controlled evaluation, run real integration tests, and harden operations before making any claims about mainnet readiness.</p>
            <p>Broader external review, stronger governance, and a proper mainnet security posture are all things we are working toward, but they are not done yet.</p>
          </CardContent>
        </Card>
      </section>

      <Notice tone="warning" title="Current stage">
        Fyxvo is live on Solana devnet for real developer evaluation, but this is still a private alpha. Please test carefully, keep your wallet hygiene tight, and do not treat the current environment as though it has been through a mainnet-grade audit. We are not there yet, and we would rather be upfront about that.
      </Notice>
    </div>
  );
}
