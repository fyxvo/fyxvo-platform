import type { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle, Notice } from "@fyxvo/ui";
import { PageHeader } from "../../components/page-header";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Fyxvo collects, uses, and protects your data on the devnet private alpha platform.",
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

export default function PrivacyPage() {
  const effectiveDate = "March 19, 2026";

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 space-y-8">
      <PageHeader
        eyebrow="Legal"
        title="Privacy Policy"
        description={`Effective date: ${effectiveDate}. Here is how we look after your personal information while you use the Fyxvo devnet private alpha.`}
      />

      <Notice tone="neutral" title="Private alpha context">
        Fyxvo is currently in private alpha on Solana devnet. This policy describes what we actually
        do with your data today. As the platform grows and moves closer to mainnet, we will revisit
        and update it accordingly.
      </Notice>

      <div className="space-y-6">
        <Section title="1. Who we are">
          <p>
            Fyxvo is a Solana devnet infrastructure platform. We provide wallet-authenticated project
            controls, funded JSON-RPC relay, and managed operator infrastructure. The main platform
            lives at www.fyxvo.com, the API at api.fyxvo.com, and the gateway at rpc.fyxvo.com.
          </p>
          <p>
            Got a question about how we handle your data? You can reach us through the contact
            channels listed at{" "}
            <span className="font-mono text-[var(--fyxvo-text)]">www.fyxvo.com/contact</span>.
          </p>
        </Section>

        <Section title="2. What data we collect">
          <p className="font-medium text-[var(--fyxvo-text)]">Wallet addresses</p>
          <p>
            When you connect a Solana wallet, we store your public wallet address. That is how we
            know who you are and how we authenticate your API sessions. We never ask for your private
            key or seed phrase, we never store them, and we have zero access to them.
          </p>
          <p className="font-medium text-[var(--fyxvo-text)]">Session data</p>
          <p>
            Once you sign in with your wallet, we create a JWT (JSON Web Token) for your session.
            Your browser holds onto that token and sends it with each API request. When the token
            expires, we do not keep a copy on our servers.
          </p>
          <p className="font-medium text-[var(--fyxvo-text)]">Request logs</p>
          <p>
            Every JSON-RPC request that flows through the gateway gets logged with a project
            identifier, route, method, HTTP status code, and response latency. These logs are
            associated with the project that owns the API key, not with you personally beyond the
            wallet address of the project owner.
          </p>
          <p className="font-medium text-[var(--fyxvo-text)]">Project data</p>
          <p>
            We store your project names, slugs, descriptions, on-chain program-derived addresses
            (PDAs), and funding history. All of it is tied to your wallet address.
          </p>
          <p className="font-medium text-[var(--fyxvo-text)]">API keys</p>
          <p>
            We hold onto metadata about your API keys: labels, scopes, prefixes, status, and
            timestamps for when they were created and last used. The full key value is shown to you
            exactly once at creation. After that moment, we cannot recover it and neither can you.
          </p>
          <p className="font-medium text-[var(--fyxvo-text)]">Interest and feedback submissions</p>
          <p>
            If you fill out an interest or feedback form, we collect the name, email, team name, use
            case, expected request volume, and whatever message you write. We use that to follow up
            with you personally and to improve the product.
          </p>
          <p className="font-medium text-[var(--fyxvo-text)]">Analytics events</p>
          <p>
            We record lightweight, first-party events such as landing page CTA clicks, wallet
            connect attempts, project creation starts, funding flow starts, and API key creation.
            There are no third-party tracking scripts on the site. We do not follow you around the
            internet.
          </p>
        </Section>

        <Section title="3. How wallet addresses are handled">
          <p>
            Your wallet address is already publicly visible on the Solana blockchain. Inside Fyxvo,
            we use it to tie your account to your projects, API keys, and funding records. We will
            never sell it, share it with advertisers, or cross-reference it with third-party identity
            services.
          </p>
          <p>
            Wallet addresses may appear in internal admin logs and audit tools so we can investigate
            potential fraud or governance issues. Other users on the platform cannot see your wallet
            address.
          </p>
        </Section>

        <Section title="4. Request log storage">
          <p>
            We keep request logs so we can power your analytics dashboards, reconcile billing,
            enforce rate limits, and monitor operator health. Each log entry captures a timestamp,
            route, method, HTTP status, latency, service identifier, and project identifier.
          </p>
          <p>
            We never store the actual body of your RPC requests. Only routing metadata is retained.
            On devnet, request logs are kept for 90 days unless operational circumstances require a
            shorter window.
          </p>
        </Section>

        <Section title="5. Analytics tracking">
          <p>
            All of our analytics are first-party. The product usage events described in Section 2 go
            through our own API endpoints. We do not use Google Analytics, Mixpanel, Segment, or any
            other third-party analytics tool in this alpha.
          </p>
          <p>
            On the browser side, our tracking footprint is minimal. We do not follow you across
            sessions or across other websites, and we do not use fingerprinting techniques.
          </p>
        </Section>

        <Section title="6. Interest and feedback submission storage">
          <p>
            When you submit an interest or feedback form, that data lives in our control plane
            database where the Fyxvo team can review and follow up on it. We do not share it outside
            the team. If you give us your email address, we will only use it for direct, personal
            follow-up. We will not add you to any marketing list unless you explicitly tell us you
            want that.
          </p>
        </Section>

        <Section title="7. Third-party services">
          <p>A few third-party services help us run the platform.</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <span className="font-medium text-[var(--fyxvo-text)]">Vercel</span> hosts our
              frontend and handles edge delivery. Vercel may log request metadata such as IP
              addresses and request paths on their infrastructure.
            </li>
            <li>
              <span className="font-medium text-[var(--fyxvo-text)]">Railway</span> hosts the API
              and gateway backends. Railway may log container-level request metadata for their own
              operational needs.
            </li>
            <li>
              <span className="font-medium text-[var(--fyxvo-text)]">Solana devnet</span> is a
              public blockchain, which means all on-chain transactions are visible to anyone. Data
              like project PDAs and funding transactions is immutable and public by nature.
            </li>
          </ul>
          <p>
            We do not use advertising networks, social media tracking pixels, or third-party
            identity resolution services.
          </p>
        </Section>

        <Section title="8. Data retention">
          <p>
            Your account data (wallet address, projects, API keys) sticks around as long as your
            account is active. Request logs on devnet are kept for 90 days. Interest and feedback
            submissions are kept indefinitely so we can refer back to them when making product
            decisions.
          </p>
          <p>
            When we move to mainnet, we will publish a formal data retention schedule. If you want
            something deleted during the private alpha, just reach out and we will take care of it.
          </p>
        </Section>

        <Section title="9. Your rights">
          <p>
            You can ask us for a copy of all the data tied to your wallet address. You can ask us
            to delete your account data. You can leave the private alpha whenever you want.
          </p>
          <p>
            For any of these requests, contact us through the support channels at
            www.fyxvo.com/contact. During the private alpha we handle these manually, and we aim
            to respond within five business days.
          </p>
          <p>
            One thing worth knowing: on-chain data such as transactions and PDAs lives on the public
            Solana blockchain ledger and cannot be removed. That is simply how blockchains work.
          </p>
        </Section>

        <Section title="10. Changes to this policy">
          <p>
            As the platform evolves, we may update this policy. If we make a meaningful change, we
            will let you know through the status page or our community channels (X, Discord,
            Telegram). The effective date at the top of this page will always reflect the latest
            revision.
          </p>
        </Section>
      </div>
    </div>
  );
}
