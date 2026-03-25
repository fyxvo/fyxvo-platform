"use client";

import Link from "next/link";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@fyxvo/ui";
import { CopyButton } from "./copy-button";
import { usePortal } from "./portal-provider";
import { webEnv } from "../lib/env";
import type { PortalProject } from "../lib/types";

export function QuickstartLauncher({ project }: { readonly project?: PortalProject | null }) {
  const portal = usePortal();
  const effectiveProject = project ?? portal.selectedProject ?? null;
  const hasProject = Boolean(effectiveProject);
  const isActivated = Boolean(portal.onchainSnapshot.projectAccountExists);
  const hasFunding = (effectiveProject?._count?.fundingRequests ?? 0) > 0;
  const hasApiKey = portal.apiKeys.some((key) => key.status === "ACTIVE");
  const hasTraffic = (effectiveProject?._count?.requestLogs ?? 0) > 0 || portal.projectAnalytics.totals.requestLogs > 0;
  const keyValue = portal.lastGeneratedApiKey ?? "YOUR_API_KEY";
  const curlExample = `curl -X POST ${webEnv.gatewayBaseUrl}/rpc \\
  -H "content-type: application/json" \\
  -H "x-api-key: ${keyValue}" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}'`;

  const step = !hasProject
    ? {
        title: "Create your first project",
        description: "Start with one project so activation, funding, keys, and analytics all stay attached to the same workflow.",
        primaryHref: "/dashboard",
        primaryLabel: "Create project",
        secondaryHref: "/docs#quickstart",
        secondaryLabel: "Read quickstart",
      }
    : !isActivated
      ? {
          title: "Activate the project on chain",
          description: "The control-plane record exists, but the on-chain project account still needs to confirm before funded traffic can flow.",
          primaryHref: "/dashboard",
          primaryLabel: "Finish activation",
          secondaryHref: "/docs#quickstart",
          secondaryLabel: "Activation guide",
        }
      : !hasFunding
        ? {
            title: "Fund the project",
            description: "Devnet SOL is the current alpha funding path. Funding validates accounting and usage before mainnet launch.",
            primaryHref: "/funding",
            primaryLabel: "Fund on devnet",
            secondaryHref: "/docs#quickstart",
            secondaryLabel: "Funding docs",
          }
        : !hasApiKey
          ? {
              title: "Create an API key",
              description: "Issue one project-scoped key so you can make the first real gateway request and see analytics populate.",
              primaryHref: "/api-keys",
              primaryLabel: "Create API key",
              secondaryHref: "/docs#authentication",
              secondaryLabel: "Auth docs",
            }
          : !hasTraffic
            ? {
                title: "Make the first request",
                description: "Everything is ready. Send one request, verify the gateway response, and watch analytics update from real traffic.",
                primaryHref: "/playground",
                primaryLabel: "Open playground",
                secondaryHref: "/docs#quickstart",
                secondaryLabel: "Quickstart docs",
              }
            : {
                title: "Project is live",
                description: "Traffic is already flowing. Use analytics, trace lookup, and the assistant to debug and iterate faster.",
                primaryHref: "/analytics",
                primaryLabel: "Open analytics",
                secondaryHref: "/playground",
                secondaryLabel: "Open playground",
              };

  return (
    <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
      <CardHeader>
        <CardTitle>Get Started</CardTitle>
        <CardDescription>
          This launcher follows the live project state and keeps the next highest-signal action visible.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-text-muted)]">Next step</p>
          <h3 className="mt-2 text-lg font-semibold text-[var(--fyxvo-text)]">{step.title}</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--fyxvo-text-soft)]">{step.description}</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href={step.primaryHref}>{step.primaryLabel}</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href={step.secondaryHref}>{step.secondaryLabel}</Link>
          </Button>
          {hasApiKey && !hasTraffic ? <CopyButton value={curlExample} label="Copy curl example" /> : null}
        </div>
      </CardContent>
    </Card>
  );
}
