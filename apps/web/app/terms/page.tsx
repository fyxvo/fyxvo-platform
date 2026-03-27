import type { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle, Notice } from "@fyxvo/ui";
import { PageHeader } from "../../components/page-header";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms governing use of the Fyxvo devnet private alpha infrastructure platform.",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm leading-7 text-[var(--fyxvo-text-soft)]">
        {children}
      </CardContent>
    </Card>
  );
}

export default function TermsPage() {
  const effectiveDate = "March 19, 2026";

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 space-y-8">
      <PageHeader
        eyebrow="Legal"
        title="Terms of Service"
        description={`Effective date: ${effectiveDate}. These terms govern your use of the Fyxvo devnet private alpha platform.`}
      />

      <Notice tone="warning" title="Private alpha — please read this carefully">
        Fyxvo is a private alpha running on Solana devnet. There is no service level agreement, no
        uptime guarantee, and no warranty of any kind. This is a place to evaluate whether Fyxvo
        works for you, not a place to run production workloads.
      </Notice>

      <div className="space-y-6">
        <Section title="1. What this service is">
          <p>
            Fyxvo is developer infrastructure built on Solana devnet. It gives you wallet-authenticated
            project controls, SOL-funded JSON-RPC relay, priority relay, analytics, and managed
            operator infrastructure. The web interface is at www.fyxvo.com, the control plane API at
            api.fyxvo.com, and the relay gateway at rpc.fyxvo.com.
          </p>
          <p>
            The whole platform is in private alpha. That means features, pricing, data structures,
            and access policies can all shift at any time without advance notice.
          </p>
        </Section>

        <Section title="2. Who can use it">
          <p>
            Fyxvo is currently open to teams that received an invitation to the private alpha or
            signed up through the public interest form. By using the platform, you are confirming
            that:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>You are at least 18 years old, or have the legal capacity to enter into contracts in your jurisdiction.</li>
            <li>You are here to develop, evaluate, or test software.</li>
            <li>You will not use the platform for anything illegal, fraudulent, or harmful.</li>
            <li>You understand this is devnet infrastructure and not a mainnet production service.</li>
          </ul>
        </Section>

        <Section title="3. Devnet alpha status and no-SLA disclaimer">
          <p>
            Fyxvo runs on Solana devnet. Devnet is a test environment maintained by the Solana
            Foundation, and it can be unstable, get reset, or go offline for reasons entirely outside
            our control.
          </p>
          <p>
            We do not make promises about uptime, latency, data persistence, or uninterrupted
            service during the private alpha. There is no SLA, no uptime commitment, and no
            obligation for us to notify you before something goes down.
          </p>
          <p>
            We may pause, restructure, or discontinue services at any time. By using the platform,
            you are accepting that reality.
          </p>
        </Section>

        <Section title="4. Acceptable use">
          <p>When you use Fyxvo, you agree that you will not:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Send spam, abusive requests, or traffic designed to degrade the experience for other users.</li>
            <li>Attempt to circumvent rate limiting, scope enforcement, or funding balance checks.</li>
            <li>Reverse-engineer, scrape, or extract non-public platform data or infrastructure details.</li>
            <li>Route requests through the relay gateway to unauthorized or malicious nodes.</li>
            <li>Misrepresent your identity, your team, or your intended use case in any submission form.</li>
            <li>Use the platform in any jurisdiction where doing so would violate the law.</li>
          </ul>
          <p>
            If you break these rules, we reserve the right to suspend or terminate your access
            without warning.
          </p>
        </Section>

        <Section title="5. API key responsibility">
          <p>
            Your API keys are yours to protect. Keep them secret, assign the narrowest scopes that
            make sense, and revoke any key you no longer need or that may have been exposed.
          </p>
          <p>
            We are not responsible for unauthorized usage that results from a key being improperly
            secured on your end. Every key has explicit scopes and is tied to a funded project. If a
            key is under-scoped or has been revoked, the gateway will reject it automatically.
          </p>
        </Section>

        <Section title="6. Crypto funding and devnet SOL">
          <p>
            All funding transactions on Fyxvo use Solana devnet SOL, which has no real-world
            monetary value. You can get devnet SOL from public faucets for free. Fyxvo does not sell
            devnet SOL and does not charge for devnet access.
          </p>
          <p>
            When you spend SOL credits through relay usage, those credits are consumed according to
            the pricing model published at www.fyxvo.com/pricing. There are no refunds for consumed
            devnet credits, because there is nothing of monetary value to refund.
          </p>
          <p>
            When we move to mainnet, we will publish a separate terms document covering real funding,
            fees, and refund policies. These terms apply exclusively to devnet.
          </p>
        </Section>

        <Section title="7. Intellectual property">
          <p>
            The code, documentation, design, and infrastructure behind Fyxvo belong to us. During
            the private alpha, you have a limited, non-exclusive license to use the platform for
            evaluation and development purposes.
          </p>
          <p>
            Everything you build on top of Fyxvo is yours. Your project data, your wallet identity,
            and the workloads you send through the relay all belong to you. We make no claim over
            any traffic or data you transmit through the gateway.
          </p>
        </Section>

        <Section title="8. Limitation of liability">
          <p>
            To the fullest extent the law allows, Fyxvo and its contributors are not liable for:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Lost devnet SOL or funded credits caused by platform outages or software bugs.</li>
            <li>Data loss resulting from platform resets or infrastructure changes.</li>
            <li>Indirect, consequential, or incidental damages arising from your use of the platform.</li>
            <li>Downtime, latency spikes, or errors on the Solana devnet network itself.</li>
          </ul>
          <p>
            You are using this platform at your own risk. It is a private alpha, and we ask that you
            treat it accordingly.
          </p>
        </Section>

        <Section title="9. How terms may change">
          <p>
            We may update these terms at any time. The effective date at the top of this page always
            reflects the latest revision. If you continue using the platform after we publish
            changes, that counts as your acceptance of the updated terms.
          </p>
          <p>
            When something significant changes, we will announce it through our community channels
            (X, Discord, Telegram) and the status page.
          </p>
        </Section>

        <Section title="10. Governing law">
          <p>
            These terms are governed by applicable law. If a court finds any portion of this
            agreement unenforceable, the remainder stands. This document represents the complete
            agreement between you and Fyxvo regarding use of the private alpha platform.
          </p>
        </Section>
      </div>
    </div>
  );
}
