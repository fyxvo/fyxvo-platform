"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Button, Notice } from "@fyxvo/ui";
import { LoadingSkeleton } from "../../../components/loading-skeleton";
import { RetryBanner } from "../../../components/retry-banner";
import { AuthGate } from "../../../components/state-panels";
import {
  archiveProject,
  createProjectWebhook,
  deleteProjectWebhook,
  getProject,
  getProjectMembers,
  getProjectWebhooks,
  inviteProjectMember,
  updateProject,
} from "../../../lib/api";
import { usePortal } from "../../../lib/portal-context";
import type { ProjectDetail, ProjectMemberItem, WebhookItem } from "../../../lib/types";

const WEBHOOK_EVENTS = [
  "funding.confirmed",
  "apikey.created",
  "apikey.revoked",
  "balance.low",
  "project.activated",
] as const;

export default function DashboardSettingsPage() {
  const router = useRouter();
  const { token, selectedProject, refreshProjects, setSelectedProject } = usePortal();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [members, setMembers] = useState<ProjectMemberItem[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [inviteWallet, setInviteWallet] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookEvents, setWebhookEvents] = useState<string[]>(["project.activated"]);

  const loadSettings = useCallback(async () => {
    if (!token || !selectedProject) return;
    setLoading(true);
    setError(null);

    try {
      const [detail, memberList, webhookList] = await Promise.all([
        getProject({ projectId: selectedProject.id, token }),
        getProjectMembers({ projectId: selectedProject.id, token }),
        getProjectWebhooks({ projectId: selectedProject.id, token }),
      ]);
      setProject(detail);
      setMembers(memberList);
      setWebhooks(webhookList);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Unable to load project settings."
      );
    } finally {
      setLoading(false);
    }
  }, [selectedProject, token]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  async function handleGeneralSave() {
    if (!token || !project) return;
    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      const updated = await updateProject({
        projectId: project.id,
        token,
        name: project.name,
        slug: project.slug,
        description: project.description ?? null,
        displayName: project.displayName ?? null,
        isPublic: project.isPublic ?? false,
        publicSlug: project.publicSlug ?? null,
        leaderboardVisible: project.leaderboardVisible ?? false,
      });
      setProject(updated);

      const refreshedProjects = await refreshProjects();
      const refreshedSelection =
        refreshedProjects.find((item) => item.id === updated.id) ?? null;
      if (refreshedSelection) setSelectedProject(refreshedSelection);
      setNotice("Project settings saved.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save project.");
    } finally {
      setSaving(false);
    }
  }

  async function handleInvite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !project) return;
    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      const response = await inviteProjectMember({
        projectId: project.id,
        token,
        walletAddress: inviteWallet.trim(),
      });
      setMembers((current) => [...current, response.item]);
      setInviteWallet("");
      setNotice("Invitation sent.");
    } catch (inviteError) {
      setError(inviteError instanceof Error ? inviteError.message : "Unable to invite member.");
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateWebhook(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !project) return;
    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      const response = await createProjectWebhook({
        projectId: project.id,
        token,
        url: webhookUrl.trim(),
        events: webhookEvents,
      });
      setWebhooks((current) => [...current, response.item]);
      setWebhookUrl("");
      setWebhookEvents(["project.activated"]);
      setNotice("Webhook created.");
    } catch (webhookError) {
      setError(
        webhookError instanceof Error ? webhookError.message : "Unable to create webhook."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteWebhook(webhookId: string) {
    if (!token || !project) return;
    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      await deleteProjectWebhook({ projectId: project.id, webhookId, token });
      setWebhooks((current) => current.filter((item) => item.id !== webhookId));
      setNotice("Webhook removed.");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to remove webhook.");
    } finally {
      setSaving(false);
    }
  }

  async function handleArchive() {
    if (!token || !project) return;
    const confirmed = window.confirm(
      `Archive ${project.name}? This removes the project from the workspace list.`
    );
    if (!confirmed) return;

    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      await archiveProject({ projectId: project.id, token });
      await refreshProjects();
      router.push("/dashboard");
    } catch (archiveError) {
      setError(
        archiveError instanceof Error ? archiveError.message : "Unable to archive project."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <AuthGate>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--fyxvo-text)]">
            Project settings
          </h1>
          <p className="mt-1 text-sm text-[var(--fyxvo-text-muted)]">
            Manage the selected project&apos;s public settings, members, webhooks, and archive
            controls.
          </p>
        </div>

        {error ? <RetryBanner message={error} onRetry={() => void loadSettings()} /> : null}
        {notice ? <Notice tone="success">{notice}</Notice> : null}

        {!selectedProject ? (
          <div className="rounded-[2rem] border border-dashed border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-8 text-center">
            <p className="text-base font-medium text-[var(--fyxvo-text)]">No project selected</p>
            <p className="mt-2 text-sm leading-6 text-[var(--fyxvo-text-muted)]">
              Pick a project from the dashboard before editing project-level settings.
            </p>
          </div>
        ) : loading || !project ? (
          <div className="space-y-4">
            <LoadingSkeleton className="h-48 rounded-2xl" />
            <LoadingSkeleton className="h-48 rounded-2xl" />
            <LoadingSkeleton className="h-48 rounded-2xl" />
          </div>
        ) : (
          <div className="space-y-6">
            <section className="rounded-[2rem] border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-6">
              <h2 className="text-xl font-semibold text-[var(--fyxvo-text)]">General</h2>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-medium text-[var(--fyxvo-text)]">Name</span>
                  <input
                    value={project.name}
                    onChange={(event) =>
                      setProject((current) => (current ? { ...current, name: event.target.value } : current))
                    }
                    className="mt-2 h-11 w-full rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 text-sm text-[var(--fyxvo-text)] outline-none focus:border-[var(--fyxvo-brand)]"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-[var(--fyxvo-text)]">Slug</span>
                  <input
                    value={project.slug}
                    onChange={(event) =>
                      setProject((current) => (current ? { ...current, slug: event.target.value } : current))
                    }
                    className="mt-2 h-11 w-full rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 text-sm text-[var(--fyxvo-text)] outline-none focus:border-[var(--fyxvo-brand)]"
                  />
                </label>
              </div>
              <label className="mt-4 block">
                <span className="text-sm font-medium text-[var(--fyxvo-text)]">Display name</span>
                <input
                  value={project.displayName ?? ""}
                  onChange={(event) =>
                    setProject((current) =>
                      current ? { ...current, displayName: event.target.value || null } : current
                    )
                  }
                  className="mt-2 h-11 w-full rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 text-sm text-[var(--fyxvo-text)] outline-none focus:border-[var(--fyxvo-brand)]"
                />
              </label>
              <label className="mt-4 block">
                <span className="text-sm font-medium text-[var(--fyxvo-text)]">Description</span>
                <textarea
                  rows={5}
                  value={project.description ?? ""}
                  onChange={(event) =>
                    setProject((current) =>
                      current ? { ...current, description: event.target.value || null } : current
                    )
                  }
                  className="mt-2 w-full rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 py-3 text-sm text-[var(--fyxvo-text)] outline-none focus:border-[var(--fyxvo-brand)]"
                />
              </label>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <label className="flex items-center gap-3 rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 py-3 text-sm text-[var(--fyxvo-text)]">
                  <input
                    type="checkbox"
                    checked={project.isPublic ?? false}
                    onChange={(event) =>
                      setProject((current) =>
                        current ? { ...current, isPublic: event.target.checked } : current
                      )
                    }
                  />
                  Enable public project page
                </label>
                <label className="flex items-center gap-3 rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 py-3 text-sm text-[var(--fyxvo-text)]">
                  <input
                    type="checkbox"
                    checked={project.leaderboardVisible ?? false}
                    onChange={(event) =>
                      setProject((current) =>
                        current
                          ? { ...current, leaderboardVisible: event.target.checked }
                          : current
                      )
                    }
                  />
                  Show on public leaderboard
                </label>
              </div>
              <label className="mt-4 block">
                <span className="text-sm font-medium text-[var(--fyxvo-text)]">Public slug</span>
                <input
                  value={project.publicSlug ?? ""}
                  onChange={(event) =>
                    setProject((current) =>
                      current ? { ...current, publicSlug: event.target.value || null } : current
                    )
                  }
                  className="mt-2 h-11 w-full rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 text-sm text-[var(--fyxvo-text)] outline-none focus:border-[var(--fyxvo-brand)]"
                />
              </label>
              <div className="mt-5">
                <Button type="button" onClick={() => void handleGeneralSave()} loading={saving}>
                  Save project
                </Button>
              </div>
            </section>

            <section className="rounded-[2rem] border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-6">
              <h2 className="text-xl font-semibold text-[var(--fyxvo-text)]">Team</h2>
              <form className="mt-5 flex flex-col gap-3 sm:flex-row" onSubmit={(event) => void handleInvite(event)}>
                <input
                  value={inviteWallet}
                  onChange={(event) => setInviteWallet(event.target.value)}
                  placeholder="Wallet address"
                  className="h-11 flex-1 rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 text-sm text-[var(--fyxvo-text)] outline-none focus:border-[var(--fyxvo-brand)]"
                />
                <Button type="submit" disabled={!inviteWallet.trim() || saving}>
                  Invite member
                </Button>
              </form>

              <div className="mt-5 space-y-3">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-[var(--fyxvo-text)]">
                        {member.user.displayName || member.user.walletAddress}
                      </p>
                      <span className="rounded-full border border-[var(--fyxvo-border)] px-3 py-1 text-xs text-[var(--fyxvo-text-muted)]">
                        {member.role}
                      </span>
                    </div>
                    <p className="mt-2 font-mono text-xs text-[var(--fyxvo-text-muted)]">
                      {member.user.walletAddress}
                    </p>
                    <p className="mt-2 text-sm text-[var(--fyxvo-text-soft)]">
                      {member.acceptedAt
                        ? `Accepted ${new Date(member.acceptedAt).toLocaleString()}`
                        : `Invited ${new Date(member.invitedAt).toLocaleString()}`}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[2rem] border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-6">
              <h2 className="text-xl font-semibold text-[var(--fyxvo-text)]">Webhooks</h2>
              <form className="mt-5 space-y-4" onSubmit={(event) => void handleCreateWebhook(event)}>
                <label className="block">
                  <span className="text-sm font-medium text-[var(--fyxvo-text)]">URL</span>
                  <input
                    value={webhookUrl}
                    onChange={(event) => setWebhookUrl(event.target.value)}
                    placeholder="https://example.com/fyxvo-webhook"
                    className="mt-2 h-11 w-full rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 text-sm text-[var(--fyxvo-text)] outline-none focus:border-[var(--fyxvo-brand)]"
                  />
                </label>
                <div className="grid gap-3 md:grid-cols-2">
                  {WEBHOOK_EVENTS.map((eventName) => (
                    <label
                      key={eventName}
                      className="flex items-center gap-3 rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 py-3 text-sm text-[var(--fyxvo-text)]"
                    >
                      <input
                        type="checkbox"
                        checked={webhookEvents.includes(eventName)}
                        onChange={(event) =>
                          setWebhookEvents((current) =>
                            event.target.checked
                              ? [...current, eventName]
                              : current.filter((item) => item !== eventName)
                          )
                        }
                      />
                      {eventName}
                    </label>
                  ))}
                </div>
                <Button type="submit" disabled={!webhookUrl.trim() || webhookEvents.length === 0 || saving}>
                  Create webhook
                </Button>
              </form>

              <div className="mt-5 space-y-3">
                {webhooks.map((webhook) => (
                  <div
                    key={webhook.id}
                    className="rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="break-all font-medium text-[var(--fyxvo-text)]">{webhook.url}</p>
                        <p className="mt-2 text-sm leading-6 text-[var(--fyxvo-text-soft)]">
                          {webhook.events.join(", ")}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => void handleDeleteWebhook(webhook.id)}
                        disabled={saving}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[2rem] border border-rose-500/20 bg-rose-500/6 p-6">
              <h2 className="text-xl font-semibold text-[var(--fyxvo-text)]">Advanced</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--fyxvo-text-soft)]">
                Archive removes the project from the workspace list. Use it only when you are sure
                the project should no longer be operated from this control plane.
              </p>
              <div className="mt-5">
                <Button type="button" onClick={() => void handleArchive()} disabled={saving}>
                  Archive project
                </Button>
              </div>
            </section>
          </div>
        )}
      </div>
    </AuthGate>
  );
}
