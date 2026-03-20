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
import { revokeApiKey } from "../../lib/api";

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

  // Rename project
  const [renamingProject, setRenamingProject] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renameSaving, setRenameSaving] = useState(false);

  // Revoke key
  const [revokingKeyId, setRevokingKeyId] = useState<string | null>(null);

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
    try { await patchProject(portal.selectedProject.id, { displayName }); } finally { setDisplayNameSaving(false); }
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

  function saveDensity(value: "comfortable" | "compact") {
    setDensity(value);
    localStorage.setItem("fyxvo-density", value);
  }

  const totalRequests = portal.projects.reduce((sum, p) => sum + (p._count?.requestLogs ?? 0), 0);
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
        <SectionCard title="Projects" description="All your projects and their current state.">
          {!isAuthenticated || portal.projects.length === 0 ? (
            <Notice tone="neutral" title="No projects">
              <Link href="/dashboard" className="underline">Create your first project</Link> to get started.
            </Notice>
          ) : (
            <div className="space-y-3">
              {portal.projects.map((project) => (
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
            <div className="flex items-center gap-2">
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="e.g. My Production Project" className="h-9 text-sm" />
              <Button variant="secondary" size="sm" onClick={() => void saveDisplayName()} disabled={displayNameSaving || !portal.selectedProject || !portal.token}>
                {displayNameSaving ? "Saving…" : "Save"}
              </Button>
            </div>
          </SettingRow>
          <SettingRow label="Project owner" description="The wallet that owns the selected project.">
            {portal.selectedProject ? (
              <span className="font-mono text-sm text-[var(--fyxvo-text)]">{shortenAddress(portal.selectedProject.owner.walletAddress, 8, 8)}</span>
            ) : <span className="text-sm text-[var(--fyxvo-text-muted)]">No project selected</span>}
          </SettingRow>
        </SectionCard>

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
          <Notice tone="neutral" title="How alerts work">
            Notifications appear in the bell icon in the dashboard header when thresholds are crossed.
            Low-balance checks run with each metrics aggregation cycle.
          </Notice>
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
