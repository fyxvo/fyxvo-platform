"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Notice } from "@fyxvo/ui";
import { AuthGate } from "../../components/state-panels";
import { usePortal } from "../../components/portal-provider";

function ProjectsEntry() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const portal = usePortal();
  const wantsNewProject = searchParams.get("new") === "1";
  const targetHref = wantsNewProject
    ? "/dashboard?new=1"
    : portal.selectedProject
      ? `/projects/${portal.selectedProject.slug}`
      : "/dashboard";

  useEffect(() => {
    if (!portal.token || portal.loading) {
      return;
    }

    router.replace(targetHref);
  }, [portal.loading, portal.token, router, targetHref]);

  if (!portal.token) {
    return <AuthGate />;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-6">
      <Notice tone="neutral" title={wantsNewProject ? "Create your next project" : "Opening your project workspace"}>
        {wantsNewProject
          ? "We are taking you to the dashboard project launcher so you can create a project without losing your authenticated session."
          : "We are routing you to the best project workspace for your current session."}
      </Notice>
      <div className="rounded-[1.75rem] border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-6">
        <p className="text-sm leading-6 text-[var(--fyxvo-text-muted)]">
          If the redirect stalls, use one of the direct actions below.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button asChild>
            <Link href={targetHref}>Continue</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/dashboard">Open dashboard</Link>
          </Button>
          {portal.selectedProject ? (
            <Button asChild variant="ghost">
              <Link href={`/projects/${portal.selectedProject.slug}`}>Open selected project</Link>
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function ProjectsEntryPage() {
  return <ProjectsEntry />;
}
