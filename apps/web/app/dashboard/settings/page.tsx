"use client";

import { useState, useEffect } from "react";
import { Badge, Button, Input, Notice } from "@fyxvo/ui";
import { AuthGate } from "../../../components/state-panels";
import { PageHeader } from "../../../components/page-header";
import { usePortal } from "../../../components/portal-provider";
import {
  listProjectMembers,
  inviteProjectMember,
  removeProjectMember,
} from "../../../lib/api";
import { shortenAddress } from "../../../lib/format";
import { webEnv } from "../../../lib/env";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ProjectMember {
  id: string;
  userId: string;
  role: string;
  invitedAt: string;
  acceptedAt: string | null;
  user: {
    walletAddress: string;
    displayName: string;
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function updateProject(
  id: string,
  data: Record<string, unknown>,
  token: string,
): Promise<unknown> {
  const res = await fetch(new URL(`/v1/projects/${id}`, webEnv.apiBaseUrl), {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update project");
  return res.json();
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ProjectSettingsPage() {
  const portal = usePortal();
  const project = portal.selectedProject;
  const token = portal.token;

  // Public profile
  const [isPublic, setIsPublic] = useState(false);
  const [publicSaving, setPublicSaving] = useState(false);
  const [publicError, setPublicError] = useState<string | null>(null);

  // Notes
  const [notes, setNotes] = useState("");
  const [notesSaving, setNotesSaving] = useState(false);
  const [notesError, setNotesError] = useState<string | null>(null);
  const [notesSavedAt, setNotesSavedAt] = useState<string | null>(null);

  // Runbook
  const [runbook, setRunbook] = useState("");
  const [runbookSaving, setRunbookSaving] = useState(false);
  const [runbookError, setRunbookError] = useState<string | null>(null);
  const [runbookSavedAt, setRunbookSavedAt] = useState<string | null>(null);

  // Team
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState<string | null>(null);
  const [inviteWallet, setInviteWallet] = useState("");
  const [inviteRole, setInviteRole] = useState<"ADMIN" | "MEMBER" | "VIEWER">("MEMBER");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState(false);

  // Sync project data into state on selection change
  useEffect(() => {
    if (!project) return;
    setIsPublic(project.isPublic ?? false);
    setNotes(project.notes ?? "");
    setRunbook("");
    setNotesSavedAt(project.notesUpdatedAt ?? null);
  }, [project]);

  // Load members when project changes
  useEffect(() => {
    if (!project || !token) return;
    setMembersLoading(true);
    setMembersError(null);
    listProjectMembers(project.id, token)
      .then((data) => setMembers(data.items ?? []))
      .catch((err: unknown) =>
        setMembersError(err instanceof Error ? err.message : "Failed to load members"),
      )
      .finally(() => setMembersLoading(false));
  }, [project, token]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  async function handlePublicToggle(value: boolean) {
    if (!project || !token) return;
    setPublicSaving(true);
    setPublicError(null);
    try {
      await updateProject(project.id, { isPublic: value }, token);
      setIsPublic(value);
      await portal.refresh();
    } catch (err) {
      setPublicError(err instanceof Error ? err.message : "Failed to update visibility");
    } finally {
      setPublicSaving(false);
    }
  }

  async function saveNotes() {
    if (!project || !token) return;
    setNotesSaving(true);
    setNotesError(null);
    try {
      await updateProject(project.id, { notes }, token);
      setNotesSavedAt(new Date().toISOString());
      await portal.refresh();
    } catch (err) {
      setNotesError(err instanceof Error ? err.message : "Failed to save notes");
    } finally {
      setNotesSaving(false);
    }
  }

  async function saveRunbook() {
    if (!project || !token) return;
    setRunbookSaving(true);
    setRunbookError(null);
    try {
      await updateProject(project.id, { runbook }, token);
      setRunbookSavedAt(new Date().toISOString());
    } catch (err) {
      setRunbookError(err instanceof Error ? err.message : "Failed to save runbook");
    } finally {
      setRunbookSaving(false);
    }
  }

  async function handleInvite() {
    if (!project || !token || !inviteWallet.trim()) return;
    setInviting(true);
    setInviteError(null);
    setInviteSuccess(false);
    try {
      await inviteProjectMember(project.id, inviteWallet.trim(), token);
      setInviteWallet("");
      setInviteSuccess(true);
      // Refresh member list
      const data = await listProjectMembers(project.id, token);
      setMembers(data.items ?? []);
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "Failed to invite member");
    } finally {
      setInviting(false);
    }
  }

  async function handleRemoveMember(memberId: string) {
    if (!project || !token) return;
    try {
      await removeProjectMember(project.id, memberId, token);
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
    } catch (err) {
      setMembersError(err instanceof Error ? err.message : "Failed to remove member");
    }
  }

  // ---------------------------------------------------------------------------
  // Auth / project guard
  // ---------------------------------------------------------------------------

  if (portal.walletPhase !== "authenticated") {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <AuthGate />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-10 text-center">
          <p className="text-sm text-[var(--fyxvo-text-muted)]">
            Select a project to manage its settings.
          </p>
        </div>
      </div>
    );
  }

  const displayName = project.displayName ?? project.name;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <PageHeader
        eyebrow="Settings"
        title={displayName}
        description="Manage visibility, notes, runbook, and team access for this project."
      />

      {/* Public profile */}
      <section className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-5 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-[var(--fyxvo-text)]">Public profile</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--fyxvo-text-muted)]">
            Enable public visibility for this project. A public project appears in the Explore view
            and can generate a badge for your README.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <button
            role="switch"
            aria-checked={isPublic}
            onClick={() => void handlePublicToggle(!isPublic)}
            disabled={publicSaving}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--fyxvo-brand)]/40 disabled:opacity-50 ${
              isPublic ? "bg-[var(--fyxvo-brand)]" : "bg-[var(--fyxvo-border)]"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
                isPublic ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
          <span className="text-sm text-[var(--fyxvo-text)]">
            {isPublic ? "Public" : "Private"}
          </span>
          {publicSaving && (
            <span className="text-xs text-[var(--fyxvo-text-muted)]">Saving...</span>
          )}
        </div>

        {publicError && (
          <p className="text-xs text-rose-400">{publicError}</p>
        )}

        {isPublic && project.publicSlug && (
          <div className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-4 space-y-2">
            <div>
              <p className="text-xs font-medium text-[var(--fyxvo-text-muted)] mb-1">
                Public page
              </p>
              <a
                href={`/p/${project.publicSlug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-xs text-[var(--fyxvo-brand)] hover:underline"
              >
                {webEnv.siteUrl}/p/{project.publicSlug}
              </a>
            </div>
            <div>
              <p className="text-xs font-medium text-[var(--fyxvo-text-muted)] mb-1">
                Badge URL
              </p>
              <p className="font-mono text-xs text-[var(--fyxvo-text-soft)]">
                {webEnv.apiBaseUrl}/badge/project/{project.publicSlug}
              </p>
            </div>
          </div>
        )}
      </section>

      {/* Owner notes */}
      <section className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-5 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-[var(--fyxvo-text)]">Owner notes</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--fyxvo-text-muted)]">
            Private notes visible only to you and your team. Useful for runbooks, context, and
            operational notes. Notes are never exposed publicly.
          </p>
        </div>

        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={5}
          placeholder="Add context, references, or anything useful for your team..."
          className="w-full resize-y rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] px-4 py-3 text-sm text-[var(--fyxvo-text)] placeholder-[var(--fyxvo-text-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--fyxvo-brand)]/40 leading-6"
        />

        <div className="flex items-center justify-between">
          <div>
            {notesSavedAt && (
              <p className="text-xs text-[var(--fyxvo-text-muted)]">
                Last saved{" "}
                {new Date(notesSavedAt).toLocaleString([], {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                {project.notesEditedByWallet && (
                  <span className="ml-1">
                    by {shortenAddress(project.notesEditedByWallet)}
                  </span>
                )}
              </p>
            )}
            {notesError && <p className="text-xs text-rose-400">{notesError}</p>}
          </div>
          <button
            onClick={() => void saveNotes()}
            disabled={notesSaving}
            className="rounded-lg bg-[var(--fyxvo-brand)] px-4 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {notesSaving ? "Saving..." : "Save notes"}
          </button>
        </div>
      </section>

      {/* Runbook */}
      <section className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-5 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-[var(--fyxvo-text)]">Runbook</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--fyxvo-text-muted)]">
            Document your standard operating procedures for this project. Runbooks help your team
            respond consistently to incidents and routine tasks.
          </p>
        </div>

        <textarea
          value={runbook}
          onChange={(e) => setRunbook(e.target.value)}
          rows={6}
          placeholder="Document procedures, escalation paths, and operational checklists..."
          className="w-full resize-y rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] px-4 py-3 text-sm text-[var(--fyxvo-text)] placeholder-[var(--fyxvo-text-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--fyxvo-brand)]/40 leading-6"
        />

        <div className="flex items-center justify-between">
          <div>
            {runbookSavedAt && (
              <p className="text-xs text-[var(--fyxvo-text-muted)]">
                Last saved{" "}
                {new Date(runbookSavedAt).toLocaleString([], {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            )}
            {runbookError && <p className="text-xs text-rose-400">{runbookError}</p>}
          </div>
          <button
            onClick={() => void saveRunbook()}
            disabled={runbookSaving}
            className="rounded-lg bg-[var(--fyxvo-brand)] px-4 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {runbookSaving ? "Saving..." : "Save runbook"}
          </button>
        </div>
      </section>

      {/* Team management */}
      <section className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-5 space-y-6">
        <div>
          <h2 className="text-sm font-semibold text-[var(--fyxvo-text)]">Team members</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--fyxvo-text-muted)]">
            Manage who has access to this project. Invite members by wallet address and assign
            roles to control what they can view or modify.
          </p>
        </div>

        {membersError && (
          <Notice tone="danger">{membersError}</Notice>
        )}

        {/* Current members */}
        <div className="space-y-2">
          {membersLoading && (
            <p className="text-xs text-[var(--fyxvo-text-muted)]">Loading members...</p>
          )}

          {!membersLoading && members.length === 0 && (
            <p className="text-xs text-[var(--fyxvo-text-muted)]">
              No team members yet. Invite someone below.
            </p>
          )}

          {members.map((member) => {
            const isPending = !member.acceptedAt;
            return (
              <div
                key={member.id}
                className="flex items-center justify-between rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <div>
                    <p className="font-mono text-xs text-[var(--fyxvo-text)]">
                      {shortenAddress(member.user.walletAddress)}
                    </p>
                    {member.user.displayName && (
                      <p className="text-xs text-[var(--fyxvo-text-muted)]">
                        {member.user.displayName}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={member.role === "ADMIN" ? "brand" : "neutral"} className="text-xs">
                      {member.role}
                    </Badge>
                    {isPending && (
                      <Badge tone="warning" className="text-xs">
                        Pending
                      </Badge>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => void handleRemoveMember(member.id)}
                  className="text-xs text-[var(--fyxvo-text-muted)] hover:text-rose-400 transition-colors"
                >
                  Remove
                </button>
              </div>
            );
          })}
        </div>

        {/* Invite form */}
        <div className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-4 space-y-3">
          <p className="text-xs font-medium text-[var(--fyxvo-text)]">Invite a member</p>

          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              value={inviteWallet}
              onChange={(e) => setInviteWallet(e.target.value)}
              placeholder="Wallet address"
              className="flex-1 rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-3 py-2 font-mono text-xs text-[var(--fyxvo-text)] placeholder-[var(--fyxvo-text-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--fyxvo-brand)]/40"
              onKeyDown={(e) => e.key === "Enter" && void handleInvite()}
            />

            <select
              value={inviteRole}
              onChange={(e) =>
                setInviteRole(e.target.value as "ADMIN" | "MEMBER" | "VIEWER")
              }
              className="rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-3 py-2 text-xs text-[var(--fyxvo-text)] focus:outline-none focus:ring-2 focus:ring-[var(--fyxvo-brand)]/40"
            >
              <option value="ADMIN">Admin</option>
              <option value="MEMBER">Member</option>
              <option value="VIEWER">Viewer</option>
            </select>

            <button
              onClick={() => void handleInvite()}
              disabled={inviting || !inviteWallet.trim()}
              className="rounded-lg bg-[var(--fyxvo-brand)] px-4 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {inviting ? "Inviting..." : "Invite"}
            </button>
          </div>

          {inviteError && (
            <p className="text-xs text-rose-400">{inviteError}</p>
          )}

          {inviteSuccess && (
            <p className="text-xs text-[var(--fyxvo-success)]">
              Invitation sent successfully.
            </p>
          )}

          <div className="space-y-1 pt-1">
            <p className="text-xs text-[var(--fyxvo-text-muted)]">
              Admin members can manage API keys, settings, and team access.
            </p>
            <p className="text-xs text-[var(--fyxvo-text-muted)]">
              Members can view analytics and use the playground.
            </p>
            <p className="text-xs text-[var(--fyxvo-text-muted)]">
              Viewers have read-only access to project data.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
