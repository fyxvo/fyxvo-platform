import { Card, CardContent, CardDescription, CardHeader, CardTitle, Notice } from "@fyxvo/ui";
import { FeedbackCaptureForm } from "../../components/feedback-capture-form";
import { InterestCaptureForm } from "../../components/interest-capture-form";
import { PageHeader } from "../../components/page-header";
import { SocialLinkButtons } from "../../components/social-links";
import { TrackedLinkButton } from "../../components/tracked-link-button";

export default function ContactPage() {
  return (
    <div className="space-y-10 lg:space-y-12">
      <PageHeader
        eyebrow="Contact"
        title="Talk to Fyxvo about private alpha fit, support, or managed rollout."
        description="Use this path when you want a direct product conversation, need help during the alpha flow, or want to report friction without losing the current project context."
        actions={
          <>
            <TrackedLinkButton
              href="/pricing"
              eventName="landing_cta_clicked"
              eventSource="contact-header-pricing"
            >
              View pricing
            </TrackedLinkButton>
            <TrackedLinkButton
              href="/docs"
              eventName="landing_cta_clicked"
              eventSource="contact-header-docs"
              variant="secondary"
            >
              Read quickstart
            </TrackedLinkButton>
          </>
        }
      />

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <InterestCaptureForm
          source="contact-page"
          title="Request alpha access or rollout follow-up"
          description="Capture your team, use case, expected volume, and what you care about most so follow-up can stay relevant for the current devnet alpha."
        />

        <div className="space-y-6">
          <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
            <CardHeader>
              <CardTitle>What to include</CardTitle>
              <CardDescription>
                The clearest launch conversations start with concrete workload detail.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-7 text-[var(--fyxvo-text-soft)]">
              <p>The workload you want to run on devnet.</p>
              <p>Your expected request volume and whether you need the priority path.</p>
              <p>
                Whether analytics visibility or managed operator participation matters to your team.
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

          <Notice tone="neutral" title="Real follow-up path">
            This form persists directly into the Fyxvo backend so launch interest, expected traffic,
            and product fit notes stay attached to a real review queue.
          </Notice>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <FeedbackCaptureForm
          source="contact-page"
          page="/contact"
          title="Report an issue or onboarding friction"
          description="Use this when you hit something confusing during wallet auth, project activation, funding, key creation, or your first relay request."
          includeProjectContext={false}
        />

        <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
          <CardHeader>
            <CardTitle>What helps the alpha queue most</CardTitle>
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
