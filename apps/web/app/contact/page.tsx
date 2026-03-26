import Link from "next/link";
import type { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Notice } from "@fyxvo/ui";
import { FeedbackCaptureForm } from "../../components/feedback-capture-form";
import { InterestCaptureForm } from "../../components/interest-capture-form";
import { PageHeader } from "../../components/page-header";
import { SocialLinkButtons } from "../../components/social-links";
import { TrackedLinkButton } from "../../components/tracked-link-button";
import { webEnv } from "../../lib/env";

export const metadata: Metadata = {
  title: "Contact — Fyxvo",
  description: "Reach Fyxvo for alpha access, rollout planning, founder follow-up, or support. Both interest and feedback routes land directly in the product review flow.",
  openGraph: {
    title: "Contact — Fyxvo",
    description: "Reach Fyxvo for alpha access, rollout planning, founder follow-up, or support. Both interest and feedback routes land directly in the product review flow.",
    images: [{ url: webEnv.socialImageUrl }]
  },
  twitter: {
    card: "summary_large_image",
    title: "Contact — Fyxvo",
    description: "Reach Fyxvo for alpha access, rollout planning, founder follow-up, or support. Both interest and feedback routes land directly in the product review flow.",
    images: [webEnv.socialImageUrl]
  }
};

export default function ContactPage() {
  return (
    <div className="space-y-10 lg:space-y-12">
      <PageHeader
        eyebrow="Contact"
        title="Talk to Fyxvo about alpha fit, rollout planning, or support without losing context."
        description="Use the interest path for founder follow-up and workload planning. Use the feedback path for bugs, onboarding friction, or support. Both routes land in the real product review flow."
        actions={
          <>
            <TrackedLinkButton
              href="/docs"
              eventName="landing_cta_clicked"
              eventSource="contact-header-docs"
            >
              Open quickstart
            </TrackedLinkButton>
            <TrackedLinkButton
              href="/pricing"
              eventName="landing_cta_clicked"
              eventSource="contact-header-pricing"
              variant="secondary"
            >
              Review pricing
            </TrackedLinkButton>
          </>
        }
      />

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <div id="contact-interest">
          <InterestCaptureForm
            source="contact-page"
            title="Request alpha access or rollout follow-up"
            description="Capture your team, use case, expected volume, and what you care about most so follow-up can stay relevant for the current devnet alpha."
          />
        </div>

        <div className="space-y-6">
          <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
            <CardHeader>
              <CardTitle>Best first outreach</CardTitle>
              <CardDescription>
                The clearest founder follow-up starts with concrete workload detail and a clear next
                question.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-7 text-[var(--fyxvo-text-soft)]">
              <p>The workload you want to validate on devnet and why now is the right timing.</p>
              <p>Your expected request volume and whether standard RPC or priority relay matters.</p>
              <p>
                Whether analytics visibility, managed rollout help, or operator participation
                matters to your team.
              </p>
            </CardContent>
          </Card>

          <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]" id="community">
            <CardHeader>
              <CardTitle>Community paths</CardTitle>
              <CardDescription>Use the channels that fit the conversation best.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-7 text-[var(--fyxvo-text-soft)]">
                X is best for launch updates, Discord is best for product questions, and Telegram is
                open for quick coordination around devnet rollout.
              </p>
              <SocialLinkButtons />
            </CardContent>
          </Card>

          <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
            <CardHeader>
              <CardTitle>Choose the right path</CardTitle>
              <CardDescription>Each route lands in a different review flow so follow-up stays relevant.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {[
                {
                  title: "General interest",
                  body: "Use the alpha access form for fit, rollout planning, and launch conversations.",
                  href: "#contact-interest",
                  label: "Open interest form",
                },
                {
                  title: "Technical support",
                  body: "Use the feedback path below for bugs, onboarding friction, or product questions tied to a real workflow.",
                  href: "#contact-support",
                  label: "Open support form",
                },
                {
                  title: "Enterprise interest",
                  body: "Use the enterprise page when the conversation is about workload size, rollout support, or commercial fit.",
                  href: "/enterprise",
                  label: "Open enterprise path",
                },
                {
                  title: "Security disclosure",
                  body: "Use the security page and private disclosure path for vulnerabilities or sensitive reports.",
                  href: "/security",
                  label: "Open security page",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-[1.25rem] border border-[color:var(--fyxvo-border)] bg-[color:var(--fyxvo-panel-soft)] p-4"
                >
                  <div className="text-sm font-semibold text-[var(--fyxvo-text)]">{item.title}</div>
                  <p className="mt-2 text-sm leading-6 text-[var(--fyxvo-text-soft)]">{item.body}</p>
                  <Link href={item.href} className="mt-3 inline-flex text-sm font-medium text-[var(--fyxvo-brand)]">
                    {item.label}
                  </Link>
                </div>
              ))}
            </CardContent>
          </Card>

          <Notice tone="neutral" title="Two distinct queues">
            Interest submissions are for fit, rollout, and founder follow-up. Feedback submissions
            are for bugs, support, and onboarding friction. Both persist directly into the Fyxvo
            backend review flow.
          </Notice>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <div id="contact-support">
          <FeedbackCaptureForm
            source="contact-page"
            page="/contact"
            title="Report an issue or onboarding friction"
            description="Use this when you hit something confusing during wallet auth, project activation, funding, key creation, or your first relay request."
            includeProjectContext={false}
          />
        </div>

        <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
          <CardHeader>
            <CardTitle>What helps the support queue most</CardTitle>
            <CardDescription>
              The best support reports are easy to replay and easy to route to the right part of the
              stack.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-7 text-[var(--fyxvo-text-soft)]">
            <p>Call out the exact page or step where the friction started.</p>
            <p>
              Include whether the issue is blocking first request setup, funding confirmation, or
              API key usage.
            </p>
            <p>
              Say whether the project is already activated and funded so support can separate
              onboarding friction from funded relay behavior.
            </p>
            <p>
              Use the interest form above instead when the main question is fit, rollout planning,
              pricing context, or a founder review of the workload.
            </p>
            <p>
              Use the enterprise path for larger commercial planning and use the security page for
              vulnerability disclosure instead of public support channels.
            </p>
            <Notice tone="neutral" title="Private alpha support posture">
              Fyxvo is open to a small number of external teams on devnet. Access is not
              approval-gated in product today, but support and rollout attention are intentionally
              focused on curated early teams.
            </Notice>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
