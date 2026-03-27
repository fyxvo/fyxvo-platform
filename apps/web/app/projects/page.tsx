"use client";

import Link from "next/link";
import { Badge, Button, Card, CardContent } from "@fyxvo/ui";
import { PageHeader } from "../../components/page-header";
import { usePortal } from "../../components/portal-provider";
import { formatInteger, shortenAddress } from "../../lib/format";

function environmentTone(environment: "development" | "staging" | "production") {
  if (environment === "production") {
    return "brand" as const;
  }

  if (environment === "staging") {
    return "warning" as const;
  }

  return "neutral" as const;
}

export default function ProjectsIndexPage() {
  const portal = usePortal();

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Projects"
        title="Every relay workspace, in one place."
        description="Switch projects, review traffic posture, check key counts, and jump directly into the live workspace that needs attention."
        actions={
          <>
            <Button asChild variant="secondary">
              <Link href="/dashboard">Open dashboard</Link>
            </Button>
            <Button asChild>
              <Link href="/funding">Review funding</Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
        <div className="grid gap-4">
          {portal.projects.length === 0 ? (
            <Card className="rounded-[1.75rem]">
              <CardContent className="space-y-3">
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--fyxvo-text-muted)]">
                  No projects yet
                </p>
                <h2 className="text-2xl font-semibold text-[var(--fyxvo-text)]">
                  Create your first Fyxvo project from the dashboard.
                </h2>
                <p className="max-w-xl leading-7 text-[var(--fyxvo-text-muted)]">
                  Activation, funding, API keys, and request logging all hang off a single project workspace.
                </p>
                <Button asChild>
                  <Link href="/dashboard">Go to dashboard</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            portal.projects.map((project) => {
              const isSelected = portal.selectedProject?.id === project.id;

              return (
                <Card
                  key={project.id}
                  className="rounded-[1.75rem] border-[var(--fyxvo-border)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--fyxvo-panel)_90%,transparent),color-mix(in_srgb,var(--fyxvo-panel-soft)_88%,transparent))]"
                >
                  <CardContent className="space-y-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          {isSelected ? <Badge tone="brand">Selected</Badge> : null}
                          <Badge tone={environmentTone(project.environment)}>{project.environment}</Badge>
                          <Badge tone={project.isPublic ? "success" : "neutral"}>
                            {project.isPublic ? "Public" : "Private"}
                          </Badge>
                          {project.starred ? <Badge tone="warning">Starred</Badge> : null}
                        </div>

                        <div>
                          <h2 className="text-2xl font-semibold tracking-tight text-[var(--fyxvo-text)]">
                            {project.displayName ?? project.name}
                          </h2>
                          <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--fyxvo-text-muted)]">
                            {project.description ?? "No project description added yet."}
                          </p>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--fyxvo-text-muted)]">
                          Owner
                        </p>
                        <p className="mt-1 font-mono text-sm text-[var(--fyxvo-text)]">
                          {shortenAddress(project.owner.walletAddress, 6, 6)}
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--fyxvo-text-muted)]">
                          Request logs
                        </p>
                        <p className="mt-2 text-2xl font-semibold text-[var(--fyxvo-text)]">
                          {formatInteger(project._count?.requestLogs ?? 0)}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--fyxvo-text-muted)]">
                          API keys
                        </p>
                        <p className="mt-2 text-2xl font-semibold text-[var(--fyxvo-text)]">
                          {formatInteger(project._count?.apiKeys ?? 0)}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--fyxvo-text-muted)]">
                          Funding events
                        </p>
                        <p className="mt-2 text-2xl font-semibold text-[var(--fyxvo-text)]">
                          {formatInteger(project._count?.fundingRequests ?? 0)}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--fyxvo-border)] bg-[color-mix(in_srgb,var(--fyxvo-panel)_72%,transparent)] px-4 py-3">
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--fyxvo-text-muted)]">
                          Workspace route
                        </p>
                        <p className="truncate font-mono text-sm text-[var(--fyxvo-text)]">/projects/{project.slug}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="secondary"
                          onClick={() => portal.selectProject(project.id)}
                        >
                          Make active
                        </Button>
                        <Button asChild>
                          <Link href={`/projects/${project.slug}`} onClick={() => portal.selectProject(project.id)}>
                            Open workspace
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        <div className="space-y-4">
          <Card className="rounded-[1.75rem]">
            <CardContent className="space-y-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--fyxvo-brand-soft)]">
                  Workspace defaults
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--fyxvo-text)]">
                  Project selection now has a real home.
                </h2>
              </div>
              <p className="text-sm leading-7 text-[var(--fyxvo-text-muted)]">
                Sidebar links, command palette entries, and dashboard shortcuts can all land here first,
                then move into the specific project workspace you want.
              </p>
              <div className="grid gap-3">
                <Link
                  href="/api-keys"
                  className="rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 py-3 text-sm text-[var(--fyxvo-text-soft)] transition hover:text-[var(--fyxvo-text)]"
                >
                  Manage API keys
                </Link>
                <Link
                  href="/analytics"
                  className="rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 py-3 text-sm text-[var(--fyxvo-text-soft)] transition hover:text-[var(--fyxvo-text)]"
                >
                  Review analytics
                </Link>
                <Link
                  href="/playground"
                  className="rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 py-3 text-sm text-[var(--fyxvo-text-soft)] transition hover:text-[var(--fyxvo-text)]"
                >
                  Test in playground
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[1.75rem]">
            <CardContent className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--fyxvo-brand-soft)]">
                Selected project
              </p>
              <h2 className="text-xl font-semibold text-[var(--fyxvo-text)]">
                {portal.selectedProject?.displayName ?? portal.selectedProject?.name ?? "None selected"}
              </h2>
              <p className="text-sm leading-7 text-[var(--fyxvo-text-muted)]">
                {portal.selectedProject?.description ??
                  "Pick a project to make downstream workspace pages, funding actions, and analytics views resolve against the right context."}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
