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
  description: "Get in touch with Fyxvo about alpha access, planning your rollout, chatting with the founders, or getting help with something. Every message goes straight into our product review queue.",
  openGraph: {
    title: "Contact — Fyxvo",
    description: "Get in touch with Fyxvo about alpha access, planning your rollout, chatting with the founders, or getting help with something. Every message goes straight into our product review queue.",
    images: [{ url: webEnv.socialImageUrl }]
  },
  twitter: {
    card: "summary_large_image",
    title: "Contact — Fyxvo",
    description: "Get in touch with Fyxvo about alpha access, planning your rollout, chatting with the founders, or getting help with something. Every message goes straight into our product review queue.",
    images: [webEnv.socialImageUrl]
  }
};

export default function ContactPage() {
  return (
    <div className="space-y-10 lg:space-y-12">
      <PageHeader
        eyebrow="Contact"
        title="We actually read every message. Let us know how we can help."
        description="If you want to explore whether Fyxvo is the right fit or talk through a rollout, use the interest form. If something is broken or confusing, use the feedback form. Both go straight to the team."
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
            title="Interested in alpha access? Tell us about your team."
            description="Share what your team is building, the workload you have in mind, your expected volume, and what matters most to you right now. That way we can make the follow-up actually useful during the devnet alpha."
          />
        </div>

        <div className="space-y-6">
          <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
            <CardHeader>
              <CardTitle>How to get the best response</CardTitle>
              <CardDescription>
                The more specific you are about your workload, the faster and more helpful our
                follow-up will be.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-7 text-[var(--fyxvo-text-soft)]">
              <p>Tell us what you want to test on devnet and why now feels like the right time to start.</p>
              <p>Give us a rough sense of your request volume and whether you need standard RPC or priority relay.</p>
              <p>
                Let us know if analytics visibility, hands-on rollout support, or operator
                participation is something your team cares about.
              </p>
            </CardContent>
          </Card>

          <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]" id="community">
            <CardHeader>
              <CardTitle>Find us where it makes sense</CardTitle>
              <CardDescription>Different conversations work better in different places.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-7 text-[var(--fyxvo-text-soft)]">
                We post launch updates on X, answer product questions on Discord, and use Telegram
                for quick back-and-forth around devnet rollout logistics.
              </p>
              <SocialLinkButtons />
            </CardContent>
          </Card>

          <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
            <CardHeader>
              <CardTitle>Not sure where to start?</CardTitle>
              <CardDescription>Each of these goes to a different queue so the right person sees it first.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {[
                {
                  title: "General interest",
                  body: "You want to talk about alpha fit, plan a rollout, or just have a conversation about where Fyxvo is headed.",
                  href: "#contact-interest",
                  label: "Open interest form",
                },
                {
                  title: "Technical support",
                  body: "Something is broken, confusing, or not working the way you expected. We want to hear about it.",
                  href: "#contact-support",
                  label: "Open support form",
                },
                {
                  title: "Enterprise interest",
                  body: "Your needs are bigger in scope and you want to talk about workload sizing, dedicated rollout support, or commercial terms.",
                  href: "/enterprise",
                  label: "Open enterprise path",
                },
                {
                  title: "Security disclosure",
                  body: "You found a vulnerability or have a sensitive report. Please use our private disclosure process.",
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

          <Notice tone="neutral" title="Two separate queues, on purpose">
            Interest submissions are about fit, rollout plans, and founder conversations. Feedback
            submissions are for bugs, support requests, and things that felt harder than they should.
            Both land directly in our internal review flow so nothing gets lost.
          </Notice>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <div id="contact-support">
          <FeedbackCaptureForm
            source="contact-page"
            page="/contact"
            title="Something not working? Tell us what happened."
            description="This is the right place if you ran into trouble during wallet auth, project activation, funding, key creation, or your first relay request. We genuinely want to know."
            includeProjectContext={false}
          />
        </div>

        <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
          <CardHeader>
            <CardTitle>A few things that help us help you faster</CardTitle>
            <CardDescription>
              The easier it is for us to reproduce what you saw, the faster we can get it sorted.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-7 text-[var(--fyxvo-text-soft)]">
            <p>Tell us which page or step you were on when things went sideways.</p>
            <p>
              It helps to know whether the issue is blocking your first request setup, a funding
              confirmation, or something with API key usage.
            </p>
            <p>
              Mention whether your project is already activated and funded. That helps us figure out
              if the problem is an onboarding issue or something with relay behavior after funding.
            </p>
            <p>
              If your question is really about fit, rollout planning, pricing, or a general founder
              conversation, the interest form above is a better starting point.
            </p>
            <p>
              For larger commercial discussions, head to the enterprise page. For vulnerability
              reports, please use the security page instead of public channels.
            </p>
            <Notice tone="neutral" title="Where we are right now">
              Fyxvo is working with a small number of external teams on devnet. There is no
              approval gate in the product today, but we are intentionally focusing our support and
              rollout attention on the early teams we are building alongside.
            </Notice>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
