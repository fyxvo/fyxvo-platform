"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Notice,
} from "@fyxvo/ui";
import { PageHeader } from "../../components/page-header";
import { usePortal } from "../../components/portal-provider";
import { ThemeToggle } from "../../components/theme-toggle";
import { shortenAddress } from "../../lib/format";
import { webEnv } from "../../lib/env";
import { revokeApiKey, getReferralStats, generateReferralCode, getNotificationPreferences, updateNotificationPreferences, listWebhooks, createWebhook, deleteWebhook, listProjectMembers, inviteProjectMember, removeProjectMember } from "../../lib/api";

function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 border-b border-[var(--fyxvo-border)] pb-6 last:border-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 sm:max-w-xs">
        <p className="text-sm font-medium text-[var(--fyxvo-text)]">{label}</p>
        {description ? (
          <p className="mt-1 text-xs text-[var(--fyxvo-text-muted)]">{description}</p>
        ) : null}
      </div>
      <div className="shrink-0 sm:max-w-xs">{children}</div>
    </div>
  );
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="space-y-6">{children}</CardContent>
    </Card>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        void navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="rounded px-2 py-1 text-xs text-[var(--fyxvo-text-muted)] hover:text-[var(--fyxvo-text)] transition-colors border border-[var(--fyxvo-border)] hover:border-[var(--fyxvo-border-strong)]"
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

export default function SettingsPage() {
  const portal = usePortal();

  // Profile
  const [displayName, setDisplayName] = useState(
    (portal.selectedProject as { displayName?: string } | null)?.displayName ?? ""
  );
  const [displayNameSaving, setDisplayNameSaving] = useState(false);
  const [displayNameSaved, setDisplayNameSaved] = useState(false);

  // Notifications / Alerts
  const [lowBalanceSol, setLowBalanceSol] = useState(
    (portal.selectedProject as { lowBalanceThresholdSol?: number } | null)?.lowBalanceThresholdSol?.toString() ?? ""
  );
  const [lowBalanceSolSaving, setLowBalanceSolSaving] = useState(false);
  const [dailyAlertThreshold, setDailyAlertThreshold] = useState(
    (portal.selectedProject as { dailyRequestAlertThreshold?: number } | null)?.dailyRequestAlertThreshold?.toString() ?? ""
  );
  const [dailyAlertSaving, setDailyAlertSaving] = useState(false);

  // Appearance
  const [density, setDensity] = useState<"comfortable" | "compact">("comfortable");
  useEffect(() => {
    const saved = localStorage.getItem("fyxvo-density");
    if (saved === "compact" || saved === "comfortable") setDensity(saved);
  }, []);

  // Security / Danger
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteRequested, setDeleteRequested] = useState(false);

  // Project new fields
  const [projectEnvironment, setProjectEnvironment] = useState<"development" | "staging" | "production">(
    (portal.selectedProject?.environment as "development" | "staging" | "production" | undefined) ?? "development"
  );
  const [projectNotes, setProjectNotes] = useState(portal.selectedProject?.notes ?? "");
  const [projectStarred, setProjectStarred] = useState(portal.selectedProject?.starred ?? false);
  const [projectGithubUrl, setProjectGithubUrl] = useState(portal.selectedProject?.githubUrl ?? "");
  const [projectIsPublic, setProjectIsPublic] = useState(portal.selectedProject?.isPublic ?? false);
  const [projectPublicSlug, setProjectPublicSlug] = useState(portal.selectedProject?.publicSlug ?? "");
  const [projectFieldsSaving, setProjectFieldsSaving] = useState(false);

  // Rename project
  const [renamingProject, setRenamingProject] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renameSaving, setRenameSaving] = useState(false);

  // Revoke key
  const [revokingKeyId, setRevokingKeyId] = useState<string | null>(null);

  // Archived projects
  const [restoringProjectId, setRestoringProjectId] = useState<string | null>(null);

  // Email
  const [emailValue, setEmailValue] = useState("");
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailSaved, setEmailSaved] = useState(false);

  // Notification preferences
  const [notifPrefs, setNotifPrefs] = useState<{
    notifyProjectActivation: boolean;
    notifyApiKeyEvents: boolean;
    notifyFundingConfirmed: boolean;
    notifyLowBalance: boolean;
    notifyDailyAlert: boolean;
    notifyWeeklySummary: boolean;
    notifyReferralConversion: boolean;
  } | null>(null);
  const [notifPrefsSaving, setNotifPrefsSaving] = useState<string | null>(null);

  // Referral
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referralStats, setReferralStats] = useState<{ totalClicks: number; conversions: number } | null>(null);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [referralCopied, setReferralCopied] = useState(false);

  // Webhooks
  const [webhooks, setWebhooks] = useState<Array<{ id: string; url: string; events: string[]; secret: string; active: boolean; lastTriggeredAt: string | null; createdAt: string }>>([]);
  const [webhooksLoaded, setWebhooksLoaded] = useState(false);
  const [newWebhookUrl, setNewWebhookUrl] = useState("");
  const [newWebhookEvents, setNewWebhookEvents] = useState<string[]>(["funding.confirmed"]);
  const [webhookSaving, setWebhookSaving] = useState(false);
  const [webhookSecret, setWebhookSecret] = useState<string | null>(null);
  const [deletingWebhookId, setDeletingWebhookId] = useState<string | null>(null);

  // Team members
  const [members, setMembers] = useState<Array<{ id: string; userId: string; role: string; invitedAt: string; acceptedAt: string | null; user: { walletAddress: string; displayName: string } }>>([]);
  const [membersLoaded, setMembersLoaded] = useState(false);
  const [inviteWallet, setInviteWallet] = useState("");
  const [inviteSaving, setInviteSaving] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);

  const isAuthenticated = portal.walletPhase === "authenticated";

  async function patchProject(projectId: string, patch: Record<string, unknown>) {
    if (!portal.token) return;
    await fetch(new URL(`/v1/projects/${projectId}`, webEnv.apiBaseUrl), {
      method: "PATCH",
      headers: { "content-type": "application/json", authorization: `Bearer ${portal.token}` },
      body: JSON.stringify(patch),
    });
  }

  async function saveDisplayName() {
    if (!portal.selectedProject) return;
    setDisplayNameSaving(true);
    try {
      await patchProject(portal.selectedProject.id, { displayName });
      setDisplayNameSaved(true);
      setTimeout(() => setDisplayNameSaved(false), 2500);
    } finally { setDisplayNameSaving(false); }
  }

  async function saveProjectFields() {
    if (!portal.selectedProject) return;
    setProjectFieldsSaving(true);
    try {
      await patchProject(portal.selectedProject.id, {
        environment: projectEnvironment,
        notes: projectNotes || null,
        starred: projectStarred,
        githubUrl: projectGithubUrl || null,
        isPublic: projectIsPublic,
        publicSlug: projectIsPublic && projectPublicSlug ? projectPublicSlug.trim() : null,
      });
      await portal.refresh();
    } finally { setProjectFieldsSaving(false); }
  }

  async function saveEmail() {
    if (!portal.token) return;
    setEmailSaving(true);
    try {
      await updateNotificationPreferences({ email: emailValue || null }, portal.token);
      setEmailSaved(true);
      setTimeout(() => setEmailSaved(false), 2500);
    } finally {
      setEmailSaving(false);
    }
  }

  async function saveLowBalanceSol() {
    if (!portal.selectedProject) return;
    setLowBalanceSolSaving(true);
    try { await patchProject(portal.selectedProject.id, { lowBalanceThresholdSol: lowBalanceSol === "" ? 0 : Number(lowBalanceSol) }); } finally { setLowBalanceSolSaving(false); }
  }

  async function saveDailyAlert() {
    if (!portal.selectedProject) return;
    setDailyAlertSaving(true);
    try { await patchProject(portal.selectedProject.id, { dailyRequestAlertThreshold: dailyAlertThreshold === "" ? 0 : Number(dailyAlertThreshold) }); } finally { setDailyAlertSaving(false); }
  }

  async function handleRenameProject(projectId: string) {
    setRenameSaving(true);
    try { await patchProject(projectId, { name: renameValue }); await portal.refresh(); setRenamingProject(null); } finally { setRenameSaving(false); }
  }

  async function handleRevokeKey(projectId: string, keyId: string) {
    if (!portal.token) return;
    setRevokingKeyId(keyId);
    try { await revokeApiKey({ projectId, apiKeyId: keyId, token: portal.token }); await portal.refresh(); } finally { setRevokingKeyId(null); }
  }

  // Load referral stats + notification prefs
  useEffect(() => {
    if (!portal.token || !isAuthenticated) return;
    getReferralStats(portal.token)
      .then((data) => {
        setReferralCode(data.referralCode);
        setReferralStats({ totalClicks: data.totalClicks, conversions: data.conversions });
      })
      .catch(() => undefined);
    getNotificationPreferences(portal.token)
      .then((prefs) => {
        setEmailValue(prefs.email ?? "");
        setNotifPrefs(prefs);
      })
      .catch(() => undefined);
  }, [portal.token, isAuthenticated]);

  useEffect(() => {
    if (!portal.token || !portal.selectedProject || !isAuthenticated) return;
    const projectId = portal.selectedProject.id;
    listWebhooks(projectId, portal.token)
      .then((data) => { setWebhooks(data.items); setWebhooksLoaded(true); })
      .catch(() => setWebhooksLoaded(true));
    listProjectMembers(projectId, portal.token)
      .then((data) => { setMembers(data.items); setMembersLoaded(true); })
      .catch(() => setMembersLoaded(true));
  }, [portal.token, portal.selectedProject, isAuthenticated]);

  async function handleGenerateReferralCode() {
    if (!portal.token) return;
    setGeneratingCode(true);
    try {
      const data = await generateReferralCode(portal.token);
      setReferralCode(data.referralCode);
    } finally {
      setGeneratingCode(false);
    }
  }

  const WEBHOOK_EVENT_OPTIONS = ["funding.confirmed", "apikey.created", "apikey.revoked", "balance.low", "project.activated"] as const;

  async function handleCreateWebhook() {
    if (!portal.token || !portal.selectedProject || !newWebhookUrl || newWebhookEvents.length === 0) return;
    setWebhookSaving(true);
    try {
      const data = await createWebhook(portal.selectedProject.id, { url: newWebhookUrl, events: newWebhookEvents }, portal.token);
      setWebhooks((prev) => [data.item, ...prev]);
      setWebhookSecret(data.item.secret);
      setNewWebhookUrl("");
    } finally {
      setWebhookSaving(false);
    }
  }

  async function handleDeleteWebhook(webhookId: string) {
    if (!portal.token || !portal.selectedProject) return;
    setDeletingWebhookId(webhookId);
    try {
      await deleteWebhook(portal.selectedProject.id, webhookId, portal.token);
      setWebhooks((prev) => prev.filter((w) => w.id !== webhookId));
    } finally {
      setDeletingWebhookId(null);
    }
  }

  async function handleInviteMember() {
    if (!portal.token || !portal.selectedProject || !inviteWallet) return;
    setInviteSaving(true);
    try {
      await inviteProjectMember(portal.selectedProject.id, inviteWallet, portal.token);
      const data = await listProjectMembers(portal.selectedProject.id, portal.token);
      setMembers(data.items);
      setInviteWallet("");
    } finally {
      setInviteSaving(false);
    }
  }

  async function handleRemoveMember(memberId: string) {
    if (!portal.token || !portal.selectedProject) return;
    setRemovingMemberId(memberId);
    try {
      await removeProjectMember(portal.selectedProject.id, memberId, portal.token);
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
    } finally {
      setRemovingMemberId(null);
    }
  }

  async function toggleNotifPref(key: keyof NonNullable<typeof notifPrefs>) {
    if (!portal.token || !notifPrefs) return;
    const next = { ...notifPrefs, [key]: !notifPrefs[key] };
    setNotifPrefs(next);
    setNotifPrefsSaving(key);
    try {
      await updateNotificationPreferences({ [key]: next[key] }, portal.token);
    } finally {
      setNotifPrefsSaving(null);
    }
  }

  async function handleRestoreProject(projectId: string) {
    if (!portal.token) return;
    setRestoringProjectId(projectId);
    try {
      await fetch(new URL(`/v1/projects/${projectId}`, webEnv.apiBaseUrl), {
        method: "PATCH",
        headers: { "content-type": "application/json", authorization: `Bearer ${portal.token}` },
        body: JSON.stringify({ archivedAt: null }),
      });
      await portal.refresh();
    } finally {
      setRestoringProjectId(null);
    }
  }

  function saveDensity(value: "comfortable" | "compact") {
    setDensity(value);
    localStorage.setItem("fyxvo-density", value);
  }

  const archivedProjects = portal.projects.filter((p) => p.archivedAt != null);
  const activeProjects = portal.projects.filter((p) => p.archivedAt == null);

  const totalRequests = activeProjects.reduce((sum, p) => sum + (p._count?.requestLogs ?? 0), 0);
  const totalKeys = portal.projects.reduce((sum, p) => sum + (p._count?.apiKeys ?? 0), 0);
  const estimatedLamports = totalRequests * 1000;
  const estimatedSol = (estimatedLamports / 1e9).toFixed(6);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Settings"
        title="Account, wallet, and workspace preferences."
        description="Manage your profile, security, notifications, and workspace configuration."
      />

      {!isAuthenticated ? (
        <Notice tone="neutral" title="Connect a wallet to access settings">
          Most settings require an active wallet session.
        </Notice>
      ) : null}

      <div className="grid gap-6">
        {/* Profile */}
        <SectionCard title="Profile" description="Identity information linked to your wallet.">
          {portal.walletAddress ? (
            <div className="flex items-center gap-4 pb-4 border-b border-[var(--fyxvo-border)]">
              {/* Identicon avatar */}
              <div
                className="h-14 w-14 shrink-0 rounded-full border-2 border-[var(--fyxvo-border)] overflow-hidden"
                aria-hidden="true"
              >
                <svg viewBox="0 0 56 56" width="56" height="56" xmlns="http://www.w3.org/2000/svg">
                  {Array.from({ length: 5 }).map((_, row) =>
                    Array.from({ length: 5 }).map((__, col) => {
                      const addr = portal.walletAddress ?? "";
                      const idx = (row * 5 + col) % Math.max(addr.length, 1);
                      const code = addr.charCodeAt(idx) ?? 0;
                      const hue = ((code * 37 + row * 71 + col * 113) % 360);
                      const lit = 45 + (code % 30);
                      const show = (code + row + col) % 2 === 0;
                      return show ? (
                        <rect
                          key={`${row}-${col}`}
                          x={col * 11 + 0.5}
                          y={row * 11 + 0.5}
                          width={10}
                          height={10}
                          fill={`hsl(${hue},70%,${lit}%)`}
                        />
                      ) : null;
                    })
                  )}
                </svg>
              </div>
              <div>
                <p className="font-medium text-[var(--fyxvo-text)]">{portal.user?.displayName ?? "Anonymous"}</p>
                <p className="text-xs text-[var(--fyxvo-text-muted)] font-mono">{shortenAddress(portal.walletAddress, 6, 6)}</p>
                {portal.user?.createdAt ? (
                  <p className="mt-1 text-xs text-[var(--fyxvo-text-muted)]">
                    Member since {new Date(portal.user.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}
          <SettingRow label="Wallet address" description="Your primary authentication identity. Read-only.">
            {portal.walletAddress ? (
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm text-[var(--fyxvo-text)]">
                  {shortenAddress(portal.walletAddress, 8, 8)}
                </span>
                <CopyButton text={portal.walletAddress} />
              </div>
            ) : (
              <span className="text-sm text-[var(--fyxvo-text-muted)]">Not connected</span>
            )}
          </SettingRow>
          <SettingRow label="Email address" description="Used for alerts and digest emails. Coming soon — stored but not yet delivered.">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Input
                  type="email"
                  value={emailValue}
                  onChange={(e) => setEmailValue(e.target.value)}
                  placeholder="you@example.com"
                  className="h-9 text-sm w-full max-w-xs"
                  disabled={!isAuthenticated}
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => void saveEmail()}
                  disabled={emailSaving || !isAuthenticated || !portal.token}
                >
                  {emailSaving ? "Saving…" : "Save"}
                </Button>
              </div>
              {emailSaved ? (
                <p className="text-xs text-emerald-600 dark:text-emerald-400">Email saved.</p>
              ) : null}
              <p className="text-xs text-[var(--fyxvo-text-muted)]">
                <span className="rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-amber-600 dark:text-amber-400">Coming soon</span>
                {" "}Email delivery is not yet active.
              </p>
            </div>
          </SettingRow>
          <SettingRow label="Display name" description="Auto-generated from your wallet address.">
            <p className="text-sm font-medium text-[var(--fyxvo-text)]">
              {portal.user?.displayName ?? <span className="text-[var(--fyxvo-text-muted)]">—</span>}
            </p>
          </SettingRow>
          <SettingRow label="Role" description="Your role in the Fyxvo workspace.">
            {portal.user ? (
              <Badge tone={portal.user.role === "OWNER" || portal.user.role === "ADMIN" ? "brand" : "neutral"}>
                {portal.user.role}
              </Badge>
            ) : <span className="text-sm text-[var(--fyxvo-text-muted)]">—</span>}
          </SettingRow>
          <SettingRow label="Account status" description="Current state of your account.">
            {portal.user ? (
              <Badge tone={portal.user.status === "ACTIVE" ? "success" : "warning"}>{portal.user.status}</Badge>
            ) : <span className="text-sm text-[var(--fyxvo-text-muted)]">—</span>}
          </SettingRow>
        </SectionCard>

        {/* Projects overview */}
        <SectionCard title="Projects" description="All your active projects and their current state.">
          {!isAuthenticated || activeProjects.length === 0 ? (
            <Notice tone="neutral" title="No projects">
              <Link href="/dashboard" className="underline">Create your first project</Link> to get started.
            </Notice>
          ) : (
            <div className="space-y-3">
              {activeProjects.map((project) => (
                <div key={project.id} className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      {renamingProject === project.id ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            className="h-8 text-sm"
                            placeholder="Project name"
                          />
                          <Button size="sm" variant="secondary" onClick={() => void handleRenameProject(project.id)} disabled={renameSaving || !renameValue.trim()}>
                            {renameSaving ? "…" : "Save"}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setRenamingProject(null)}>Cancel</Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-[var(--fyxvo-text)] truncate">{project.name}</p>
                          <Badge tone="neutral" className="text-xs">{project.slug}</Badge>
                        </div>
                      )}
                      <div className="mt-1 flex flex-wrap gap-3 text-xs text-[var(--fyxvo-text-muted)]">
                        <span>{(project._count?.requestLogs ?? 0).toLocaleString()} requests</span>
                        <span>{project._count?.apiKeys ?? 0} keys</span>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {renamingProject !== project.id && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => { setRenamingProject(project.id); setRenameValue(project.name); }}
                          className="text-xs"
                        >
                          Rename
                        </Button>
                      )}
                      <Button asChild size="sm" variant="secondary">
                        <Link href={`/projects/${project.slug}`}>View</Link>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* Archived projects */}
        {isAuthenticated && archivedProjects.length > 0 ? (
          <SectionCard title="Archived projects" description="Restore archived projects to make them active again.">
            <div className="space-y-3">
              {archivedProjects.map((project) => (
                <div key={project.id} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-[var(--fyxvo-text)] truncate">{project.name}</p>
                    <p className="text-xs text-[var(--fyxvo-text-muted)]">
                      Archived {project.archivedAt ? new Date(project.archivedAt).toLocaleDateString() : ""}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => void handleRestoreProject(project.id)}
                    disabled={restoringProjectId === project.id}
                    className="shrink-0"
                  >
                    {restoringProjectId === project.id ? "Restoring…" : "Restore"}
                  </Button>
                </div>
              ))}
            </div>
          </SectionCard>
        ) : null}

        {/* API Keys overview */}
        <SectionCard title="API Keys" description="All API keys across your projects.">
          {!isAuthenticated ? (
            <Notice tone="neutral" title="Sign in to view API keys" />
          ) : portal.apiKeys.length === 0 && portal.projects.length === 0 ? (
            <Notice tone="neutral" title="No API keys">Create a project first, then issue API keys from the API Keys page.</Notice>
          ) : (
            <div className="space-y-3">
              {portal.apiKeys.length === 0 ? (
                <p className="text-sm text-[var(--fyxvo-text-muted)]">No API keys for the selected project. <Link href="/api-keys" className="underline">Create one</Link>.</p>
              ) : (
                portal.apiKeys.map((key) => (
                  <div key={key.id} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-mono text-sm font-medium text-[var(--fyxvo-text)] truncate">{key.prefix}…</p>
                        <Badge tone={key.status === "ACTIVE" ? "success" : "neutral"}>{key.status}</Badge>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-3 text-xs text-[var(--fyxvo-text-muted)]">
                        <span>{key.label ?? "No label"}</span>
                        {key.lastUsedAt && <span>Last used {new Date(key.lastUsedAt).toLocaleDateString()}</span>}
                      </div>
                    </div>
                    {key.status === "ACTIVE" && portal.selectedProject && (
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => void handleRevokeKey(portal.selectedProject!.id, key.id)}
                        disabled={revokingKeyId === key.id}
                        className="shrink-0 text-xs"
                      >
                        {revokingKeyId === key.id ? "Revoking…" : "Revoke"}
                      </Button>
                    )}
                  </div>
                ))
              )}
              <Button asChild variant="secondary" size="sm">
                <Link href="/api-keys">Manage all keys</Link>
              </Button>
            </div>
          )}
        </SectionCard>

        {/* Billing & Usage */}
        <SectionCard title="Billing & Usage" description="Request usage and estimated cost across all projects.">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4">
              <p className="text-xs uppercase tracking-wider text-[var(--fyxvo-text-muted)]">Total requests</p>
              <p className="mt-1 font-display text-2xl font-semibold text-[var(--fyxvo-text)]">{totalRequests.toLocaleString()}</p>
            </div>
            <div className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4">
              <p className="text-xs uppercase tracking-wider text-[var(--fyxvo-text-muted)]">API keys</p>
              <p className="mt-1 font-display text-2xl font-semibold text-[var(--fyxvo-text)]">{totalKeys}</p>
            </div>
            <div className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4">
              <p className="text-xs uppercase tracking-wider text-[var(--fyxvo-text-muted)]">Est. SOL spent</p>
              <p className="mt-1 font-display text-2xl font-semibold text-[var(--fyxvo-text)]">{estimatedSol}</p>
              <p className="text-xs text-[var(--fyxvo-text-muted)]">at standard rate</p>
            </div>
          </div>
          <Notice tone="neutral" title="Devnet alpha pricing">
            All usage shown is devnet. Costs reflect the pricing model: 1,000 lamports per standard request.
            Volume discounts apply at 1M+ requests/month.
          </Notice>
          <Button asChild variant="secondary" size="sm">
            <Link href="/funding">Fund a project</Link>
          </Button>
        </SectionCard>

        {/* Wallet */}
        <SectionCard title="Wallet" description="Your connected Solana wallet and session status.">
          <SettingRow label="Connected wallet" description="The wallet currently authenticated with Fyxvo.">
            {portal.walletAddress ? (
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm text-[var(--fyxvo-text)]">{shortenAddress(portal.walletAddress, 6, 6)}</span>
                {portal.walletName ? <Badge tone="neutral">{portal.walletName}</Badge> : null}
              </div>
            ) : <span className="text-sm text-[var(--fyxvo-text-muted)]">No wallet connected</span>}
          </SettingRow>
          <SettingRow label="Network" description="The Solana cluster your wallet is connected to.">
            <div className="flex items-center gap-2">
              <span className="text-sm text-[var(--fyxvo-text)]">{portal.walletCluster}</span>
              {portal.networkMismatch ? (
                <Badge tone="warning">Network mismatch — switch to devnet</Badge>
              ) : isAuthenticated ? (
                <Badge tone="success">Devnet ✓</Badge>
              ) : null}
            </div>
          </SettingRow>
          <SettingRow label="Session" description="Disconnecting ends your current session and clears the auth token.">
            {isAuthenticated ? (
              <Button variant="secondary" size="sm" onClick={() => void portal.disconnectWallet()}>
                Disconnect wallet
              </Button>
            ) : <span className="text-sm text-[var(--fyxvo-text-muted)]">Not connected</span>}
          </SettingRow>
        </SectionCard>

        {/* Project Settings */}
        <SectionCard title="Project settings" description="Settings for the currently selected project.">
          <SettingRow label="Project display name" description="Human-readable label shown in the project header.">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="e.g. My Production Project" className="h-9 text-sm" />
                <Button variant="secondary" size="sm" onClick={() => void saveDisplayName()} disabled={displayNameSaving || !portal.selectedProject || !portal.token}>
                  {displayNameSaving ? "Saving…" : "Save"}
                </Button>
              </div>
              {displayNameSaved ? (
                <p className="text-xs text-emerald-600 dark:text-emerald-400">Display name saved.</p>
              ) : null}
            </div>
          </SettingRow>
          <SettingRow label="Environment" description="Label this project as development, staging, or production.">
            <div className="flex flex-wrap gap-2">
              {(["development", "staging", "production"] as const).map((env) => (
                <button
                  key={env}
                  type="button"
                  onClick={() => setProjectEnvironment(env)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                    projectEnvironment === env
                      ? "border-brand-500/50 bg-brand-500/10 text-[var(--fyxvo-text)]"
                      : "border-[var(--fyxvo-border)] text-[var(--fyxvo-text-muted)] hover:text-[var(--fyxvo-text)]"
                  }`}
                >
                  {env}
                </button>
              ))}
            </div>
          </SettingRow>
          <SettingRow label="Star project" description="Starred projects appear at the top of the project list.">
            <button
              type="button"
              onClick={() => setProjectStarred(!projectStarred)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                projectStarred
                  ? "border-brand-500/50 bg-brand-500/10 text-[var(--fyxvo-text)]"
                  : "border-[var(--fyxvo-border)] text-[var(--fyxvo-text-muted)] hover:text-[var(--fyxvo-text)]"
              }`}
            >
              {projectStarred ? "★ Starred" : "☆ Star this project"}
            </button>
          </SettingRow>
          <SettingRow label="Project notes" description="Internal documentation for your team. Not exposed publicly.">
            <div className="flex flex-col gap-2 w-full max-w-xs">
              <textarea
                value={projectNotes}
                onChange={(e) => setProjectNotes(e.target.value)}
                placeholder="Internal notes about this project…"
                rows={3}
                maxLength={2000}
                className="w-full rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-3 py-2 text-sm text-[var(--fyxvo-text)] placeholder:text-[var(--fyxvo-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--fyxvo-accent)] resize-none"
              />
            </div>
          </SettingRow>
          <SettingRow label="GitHub repository" description="Link to the GitHub repo for this project. Shown on the project overview page.">
            <Input
              value={projectGithubUrl}
              onChange={(e) => setProjectGithubUrl(e.target.value)}
              placeholder="https://github.com/org/repo"
              type="url"
              className="h-9 text-sm w-full max-w-xs"
            />
          </SettingRow>
          <SettingRow label="Public profile" description="Make this project's stats visible without authentication.">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  role="switch"
                  aria-checked={projectIsPublic}
                  onClick={() => setProjectIsPublic(!projectIsPublic)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                    projectIsPublic ? "bg-brand-500" : "bg-[var(--fyxvo-border-strong)]"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                      projectIsPublic ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
                <span className="text-xs text-[var(--fyxvo-text-muted)]">{projectIsPublic ? "Public" : "Private"}</span>
              </div>
              {projectIsPublic && (
                <Input
                  value={projectPublicSlug}
                  onChange={(e) => setProjectPublicSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                  placeholder="public-slug"
                  className="h-9 text-sm font-mono w-full max-w-xs"
                />
              )}
            </div>
          </SettingRow>
          {projectIsPublic && projectPublicSlug && (
            <SettingRow label="README badge" description="Embed this in your GitHub README to show live gateway status.">
              <div className="space-y-2">
                <div className="rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)] p-3">
                  <code className="block text-xs text-[var(--fyxvo-text-muted)] font-mono break-all">
                    {`[![Fyxvo Status](https://api.fyxvo.com/badge/project/${projectPublicSlug})](https://www.fyxvo.com/p/${projectPublicSlug})`}
                  </code>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    void navigator.clipboard.writeText(`[![Fyxvo Status](https://api.fyxvo.com/badge/project/${projectPublicSlug})](https://www.fyxvo.com/p/${projectPublicSlug})`);
                  }}
                >
                  Copy markdown
                </Button>
              </div>
            </SettingRow>
          )}
          <SettingRow label="" description="">
            <Button variant="secondary" size="sm" onClick={() => void saveProjectFields()} disabled={projectFieldsSaving || !portal.selectedProject || !portal.token}>
              {projectFieldsSaving ? "Saving…" : "Save project fields"}
            </Button>
          </SettingRow>
          <SettingRow label="Project owner" description="The wallet that owns the selected project.">
            {portal.selectedProject ? (
              <span className="font-mono text-sm text-[var(--fyxvo-text)]">{shortenAddress(portal.selectedProject.owner.walletAddress, 8, 8)}</span>
            ) : <span className="text-sm text-[var(--fyxvo-text-muted)]">No project selected</span>}
          </SettingRow>
        </SectionCard>

        {/* Webhooks */}
        {isAuthenticated && portal.selectedProject ? (
          <SectionCard title="Webhooks" description="Receive HTTP callbacks when key events happen in your project.">
            {webhooksLoaded && webhooks.length > 0 ? (
              <div className="space-y-2">
                {webhooks.map((wh) => (
                  <div key={wh.id} className="flex items-start justify-between gap-3 rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-sm text-[var(--fyxvo-text)] truncate">{wh.url}</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {wh.events.map((e) => (
                          <span key={e} className="rounded border border-[var(--fyxvo-border)] px-1.5 py-0.5 text-xs text-[var(--fyxvo-text-muted)]">{e}</span>
                        ))}
                      </div>
                    </div>
                    <Button size="sm" variant="danger" className="shrink-0 text-xs" disabled={deletingWebhookId === wh.id} onClick={() => void handleDeleteWebhook(wh.id)}>
                      {deletingWebhookId === wh.id ? "…" : "Remove"}
                    </Button>
                  </div>
                ))}
              </div>
            ) : webhooksLoaded ? (
              <p className="text-sm text-[var(--fyxvo-text-muted)]">No webhooks configured.</p>
            ) : (
              <p className="text-sm text-[var(--fyxvo-text-muted)]">Loading…</p>
            )}
            {webhookSecret && (
              <Notice tone="success" title="Webhook secret (shown once)">
                <code className="block font-mono text-xs break-all">{webhookSecret}</code>
                <p className="mt-1 text-xs">Save this now. It will not be shown again.</p>
              </Notice>
            )}
            <div className="border-t border-[var(--fyxvo-border)] pt-4 space-y-3">
              <p className="text-xs font-medium uppercase tracking-wider text-[var(--fyxvo-text-muted)]">Add webhook</p>
              <Input value={newWebhookUrl} onChange={(e) => setNewWebhookUrl(e.target.value)} placeholder="https://your-server.com/webhook" type="url" className="h-9 text-sm" />
              <div className="flex flex-wrap gap-2">
                {WEBHOOK_EVENT_OPTIONS.map((ev) => (
                  <button
                    key={ev}
                    type="button"
                    onClick={() => setNewWebhookEvents((prev) => prev.includes(ev) ? prev.filter((x) => x !== ev) : [...prev, ev])}
                    className={`rounded-lg border px-2 py-1 text-xs font-medium transition-colors ${
                      newWebhookEvents.includes(ev)
                        ? "border-brand-500/50 bg-brand-500/10 text-[var(--fyxvo-text)]"
                        : "border-[var(--fyxvo-border)] text-[var(--fyxvo-text-muted)] hover:text-[var(--fyxvo-text)]"
                    }`}
                  >
                    {ev}
                  </button>
                ))}
              </div>
              <Button variant="secondary" size="sm" onClick={() => void handleCreateWebhook()} disabled={webhookSaving || !newWebhookUrl || newWebhookEvents.length === 0}>
                {webhookSaving ? "Adding…" : "Add webhook"}
              </Button>
            </div>
          </SectionCard>
        ) : null}

        {/* Team members */}
        {isAuthenticated && portal.selectedProject && portal.selectedProject.ownerId === portal.user?.id ? (
          <SectionCard title="Team" description="Invite team members to collaborate on this project.">
            {membersLoaded && members.length > 0 ? (
              <div className="space-y-2">
                {members.map((m) => (
                  <div key={m.id} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[var(--fyxvo-text)]">{m.user.displayName}</p>
                      <p className="font-mono text-xs text-[var(--fyxvo-text-muted)]">{shortenAddress(m.user.walletAddress, 6, 6)}</p>
                      <p className="text-xs text-[var(--fyxvo-text-muted)]">
                        {m.acceptedAt ? "Accepted" : "Pending"} · {m.role}
                      </p>
                    </div>
                    <Button size="sm" variant="danger" className="shrink-0 text-xs" disabled={removingMemberId === m.id} onClick={() => void handleRemoveMember(m.id)}>
                      {removingMemberId === m.id ? "…" : "Remove"}
                    </Button>
                  </div>
                ))}
              </div>
            ) : membersLoaded ? (
              <p className="text-sm text-[var(--fyxvo-text-muted)]">No team members yet.</p>
            ) : (
              <p className="text-sm text-[var(--fyxvo-text-muted)]">Loading…</p>
            )}
            <div className="border-t border-[var(--fyxvo-border)] pt-4 space-y-3">
              <p className="text-xs font-medium uppercase tracking-wider text-[var(--fyxvo-text-muted)]">Invite by wallet address</p>
              <div className="flex items-center gap-2">
                <Input value={inviteWallet} onChange={(e) => setInviteWallet(e.target.value)} placeholder="Wallet address (base58)" className="h-9 text-sm font-mono flex-1" />
                <Button variant="secondary" size="sm" onClick={() => void handleInviteMember()} disabled={inviteSaving || !inviteWallet}>
                  {inviteSaving ? "Inviting…" : "Invite"}
                </Button>
              </div>
            </div>
          </SectionCard>
        ) : null}

        {/* Notifications */}
        <SectionCard title="Notifications" description="Configure automatic alerts for your project.">
          <SettingRow label="Low balance alert (SOL)" description="Alert when available SOL credits drop below this. Set 0 to disable.">
            <div className="flex items-center gap-2">
              <Input type="number" value={lowBalanceSol} onChange={(e) => setLowBalanceSol(e.target.value)} placeholder="0.05" className="h-9 w-28 text-sm" />
              <Button variant="secondary" size="sm" onClick={() => void saveLowBalanceSol()} disabled={lowBalanceSolSaving || !portal.selectedProject || !portal.token}>
                {lowBalanceSolSaving ? "Saving…" : "Save"}
              </Button>
            </div>
          </SettingRow>
          <SettingRow label="Daily request alert" description="Alert when daily requests exceed this count. Set 0 to disable.">
            <div className="flex items-center gap-2">
              <Input type="number" value={dailyAlertThreshold} onChange={(e) => setDailyAlertThreshold(e.target.value)} placeholder="10000" className="h-9 w-28 text-sm" />
              <Button variant="secondary" size="sm" onClick={() => void saveDailyAlert()} disabled={dailyAlertSaving || !portal.selectedProject || !portal.token}>
                {dailyAlertSaving ? "Saving…" : "Save"}
              </Button>
            </div>
          </SettingRow>
          {notifPrefs && isAuthenticated ? (
            <div className="space-y-3 pt-2 border-t border-[var(--fyxvo-border)]">
              <p className="text-xs font-medium uppercase tracking-wider text-[var(--fyxvo-text-muted)]">Notification types</p>
              {([
                { key: "notifyProjectActivation", label: "Project activation", description: "When a project activates on-chain" },
                { key: "notifyApiKeyEvents", label: "API key events", description: "Key created or revoked" },
                { key: "notifyFundingConfirmed", label: "Funding confirmed", description: "SOL or USDC deposit confirmed" },
                { key: "notifyLowBalance", label: "Low balance", description: "When SOL credits fall below your threshold" },
                { key: "notifyDailyAlert", label: "Daily request alert", description: "Daily request count threshold crossed" },
                { key: "notifyWeeklySummary", label: "Weekly summary", description: "Weekly digest of your project activity" },
                { key: "notifyReferralConversion", label: "Referral conversion", description: "When a referral signs up" },
              ] as const).map(({ key, label, description }) => (
                <div key={key} className="flex items-center justify-between gap-4 py-1">
                  <div>
                    <p className="text-sm text-[var(--fyxvo-text)]">{label}</p>
                    <p className="text-xs text-[var(--fyxvo-text-muted)]">{description}</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={notifPrefs[key]}
                    disabled={notifPrefsSaving === key}
                    onClick={() => void toggleNotifPref(key)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--fyxvo-accent)] ${
                      notifPrefs[key] ? "bg-brand-500" : "bg-[var(--fyxvo-border-strong)]"
                    } ${notifPrefsSaving === key ? "opacity-50" : ""}`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                        notifPrefs[key] ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          ) : null}
          <Notice tone="neutral" title="How alerts work">
            Notifications appear in the bell icon in the dashboard header when thresholds are crossed.
            Low-balance checks run with each metrics aggregation cycle.
          </Notice>
        </SectionCard>

        {/* Referral */}
        <SectionCard title="Referrals" description="Share your referral link and track invites.">
          {!isAuthenticated ? (
            <Notice tone="neutral" title="Connect a wallet to see your referral code" />
          ) : (
            <>
              {referralCode ? (
                <>
                  <SettingRow label="Your referral link" description="Share this link to earn credit when new users sign up.">
                    <div className="flex items-center gap-2">
                      <code className="rounded bg-[var(--fyxvo-panel-soft)] border border-[var(--fyxvo-border)] px-2 py-1 text-xs font-mono text-[var(--fyxvo-text)]">
                        {`${webEnv.siteUrl}/join/${referralCode}`}
                      </code>
                      <button
                        onClick={() => {
                          void navigator.clipboard.writeText(`${webEnv.siteUrl}/join/${referralCode}`);
                          setReferralCopied(true);
                          setTimeout(() => setReferralCopied(false), 2000);
                        }}
                        className="rounded border border-[var(--fyxvo-border)] px-2 py-1 text-xs text-[var(--fyxvo-text-muted)] hover:text-[var(--fyxvo-text)] transition-colors"
                      >
                        {referralCopied ? "Copied!" : "Copy"}
                      </button>
                    </div>
                  </SettingRow>
                  {referralStats && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4">
                        <p className="text-xs uppercase tracking-wider text-[var(--fyxvo-text-muted)]">Total clicks</p>
                        <p className="mt-1 font-display text-2xl font-semibold text-[var(--fyxvo-text)]">{referralStats.totalClicks}</p>
                      </div>
                      <div className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4">
                        <p className="text-xs uppercase tracking-wider text-[var(--fyxvo-text-muted)]">Conversions</p>
                        <p className="mt-1 font-display text-2xl font-semibold text-[var(--fyxvo-text)]">{referralStats.conversions}</p>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <SettingRow label="Referral code" description="Generate a unique code to start tracking invites.">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => void handleGenerateReferralCode()}
                    disabled={generatingCode}
                  >
                    {generatingCode ? "Generating…" : "Generate referral code"}
                  </Button>
                </SettingRow>
              )}
            </>
          )}
        </SectionCard>

        {/* Appearance */}
        <SectionCard title="Appearance" description="Visual preferences saved to your browser.">
          <SettingRow label="Theme" description="Dark mode is default. Light mode is fully supported.">
            <ThemeToggle />
          </SettingRow>
          <SettingRow label="Dashboard density" description="Controls spacing throughout the dashboard.">
            <div className="flex gap-2">
              {(["comfortable", "compact"] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => saveDensity(d)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                    density === d
                      ? "border-brand-500/50 bg-brand-500/10 text-[var(--fyxvo-text)]"
                      : "border-[var(--fyxvo-border)] text-[var(--fyxvo-text-muted)] hover:text-[var(--fyxvo-text)]"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </SettingRow>
        </SectionCard>

        {/* Security */}
        <SectionCard title="Security" description="Session information and access control.">
          <SettingRow label="Auth model" description="Sessions are authenticated via wallet signature.">
            <Badge tone="neutral">Wallet-signed JWT</Badge>
          </SettingRow>
          <SettingRow label="Active session" description="Your current auth token is valid while connected.">
            {isAuthenticated ? <Badge tone="success">Active</Badge> : <Badge tone="neutral">None</Badge>}
          </SettingRow>
          <SettingRow label="Scope enforcement" description="All gateway routes enforce key scopes. Under-scoped keys are rejected.">
            <Badge tone="success">Enforced</Badge>
          </SettingRow>
          <SettingRow label="API keys" description="Manage project-scoped credentials.">
            <Button asChild variant="secondary" size="sm">
              <Link href="/api-keys">Manage API keys</Link>
            </Button>
          </SettingRow>
          {portal.apiKeys.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wider text-[var(--fyxvo-text-muted)]">Recent key activity</p>
              {portal.apiKeys.slice(0, 3).map((key) => (
                <div key={key.id} className="flex items-center justify-between text-xs text-[var(--fyxvo-text-muted)]">
                  <span>{key.prefix}… — {key.label ?? "Unnamed key"}</span>
                  <span>{key.lastUsedAt ? `Last used ${new Date(key.lastUsedAt).toLocaleDateString()}` : "Never used"}</span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* Danger Zone */}
        <Card className="fyxvo-surface border-rose-500/25">
          <CardHeader>
            <CardTitle className="text-rose-500">Danger zone</CardTitle>
            <CardDescription>Irreversible actions. Read carefully before proceeding.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Notice tone="warning" title="Devnet alpha context">
              Account deletion during the private alpha is handled manually. On-chain data (project PDAs, funding transactions) cannot be deleted from the Solana blockchain. Fyxvo control-plane data can be removed on request within 48 hours.
            </Notice>
            {deleteRequested ? (
              <Notice tone="success" title="Deletion request received">
                Your request has been received and will be processed within 48 hours. You will receive confirmation via the contact email you provide.
              </Notice>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-[var(--fyxvo-text-muted)]">
                  Type <span className="font-mono font-semibold text-rose-400">DELETE</span> to confirm account deletion request.
                </p>
                <div className="flex items-center gap-2">
                  <Input
                    value={deleteConfirm}
                    onChange={(e) => setDeleteConfirm(e.target.value)}
                    placeholder="Type DELETE to confirm"
                    className="h-9 font-mono text-sm"
                  />
                  <Button
                    variant="danger"
                    size="sm"
                    disabled={deleteConfirm !== "DELETE" || !isAuthenticated}
                    onClick={() => {
                      setDeleteRequested(true);
                      setDeleteConfirm("");
                    }}
                  >
                    Request deletion
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
