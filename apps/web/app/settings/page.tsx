"use client";

import Link from "next/link";
import { useState } from "react";
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
      <div className="shrink-0">{children}</div>
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

export default function SettingsPage() {
  const portal = usePortal();
  const [dangerConfirm, setDangerConfirm] = useState(false);
  const [displayName, setDisplayName] = useState(
    (portal.selectedProject as { displayName?: string } | null)?.displayName ?? ""
  );
  const [displayNameSaving, setDisplayNameSaving] = useState(false);
  const [lowBalanceSol, setLowBalanceSol] = useState(
    (portal.selectedProject as { lowBalanceThresholdSol?: number } | null)?.lowBalanceThresholdSol?.toString() ?? ""
  );
  const [lowBalanceSolSaving, setLowBalanceSolSaving] = useState(false);
  const [dailyAlertThreshold, setDailyAlertThreshold] = useState("");
  const [dailyAlertSaving, setDailyAlertSaving] = useState(false);

  const isAuthenticated = portal.walletPhase === "authenticated";

  async function saveDisplayName() {
    if (!portal.selectedProject || !portal.token) return;
    setDisplayNameSaving(true);
    try {
      await fetch(new URL(`/v1/projects/${portal.selectedProject.id}`, webEnv.apiBaseUrl), {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${portal.token}`,
        },
        body: JSON.stringify({ displayName }),
      });
    } finally {
      setDisplayNameSaving(false);
    }
  }

  async function saveLowBalanceSol() {
    if (!portal.selectedProject || !portal.token) return;
    setLowBalanceSolSaving(true);
    try {
      await fetch(new URL(`/v1/projects/${portal.selectedProject.id}`, webEnv.apiBaseUrl), {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${portal.token}`,
        },
        body: JSON.stringify({ lowBalanceThresholdSol: lowBalanceSol === "" ? 0 : Number(lowBalanceSol) }),
      });
    } finally {
      setLowBalanceSolSaving(false);
    }
  }

  async function saveDailyAlertThreshold() {
    if (!portal.selectedProject || !portal.token) return;
    setDailyAlertSaving(true);
    try {
      await fetch(new URL(`/v1/projects/${portal.selectedProject.id}`, webEnv.apiBaseUrl), {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${portal.token}`,
        },
        body: JSON.stringify({ dailyRequestAlertThreshold: dailyAlertThreshold === "" ? 0 : Number(dailyAlertThreshold) }),
      });
    } finally {
      setDailyAlertSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Settings"
        title="Account, wallet, and workspace preferences."
        description="Manage your connected wallet session, appearance, security posture, and workspace options."
      />

      {!isAuthenticated ? (
        <Notice tone="neutral" title="Connect a wallet to see your settings">
          Most settings require an active wallet session. Connect a wallet from the header or
          dashboard to access your account, security, and profile settings.
        </Notice>
      ) : null}

      <div className="grid gap-6">
        {/* Profile */}
        <SectionCard
          title="Profile"
          description="Display name and identity information from your wallet session."
        >
          <SettingRow
            label="Display name"
            description="Short identifier derived from your wallet address."
          >
            <p className="text-sm font-medium text-[var(--fyxvo-text)]">
              {portal.user?.displayName ?? (
                <span className="text-[var(--fyxvo-text-muted)]">Not signed in</span>
              )}
            </p>
          </SettingRow>
          <SettingRow label="Role" description="Your role within the Fyxvo workspace.">
            {portal.user ? (
              <Badge
                tone={
                  portal.user.role === "OWNER" || portal.user.role === "ADMIN"
                    ? "brand"
                    : "neutral"
                }
              >
                {portal.user.role}
              </Badge>
            ) : (
              <span className="text-sm text-[var(--fyxvo-text-muted)]">—</span>
            )}
          </SettingRow>
          <SettingRow label="Account status" description="Current state of your Fyxvo account.">
            {portal.user ? (
              <Badge tone={portal.user.status === "ACTIVE" ? "success" : "warning"}>
                {portal.user.status}
              </Badge>
            ) : (
              <span className="text-sm text-[var(--fyxvo-text-muted)]">—</span>
            )}
          </SettingRow>
        </SectionCard>

        {/* Wallet */}
        <SectionCard
          title="Wallet"
          description="Your connected Solana wallet. This is the authentication anchor for your session."
        >
          <SettingRow
            label="Connected wallet"
            description="The wallet currently authenticated with Fyxvo."
          >
            {portal.walletAddress ? (
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm text-[var(--fyxvo-text)]">
                  {shortenAddress(portal.walletAddress, 6, 6)}
                </span>
                {portal.walletName ? (
                  <Badge tone="neutral">{portal.walletName}</Badge>
                ) : null}
              </div>
            ) : (
              <span className="text-sm text-[var(--fyxvo-text-muted)]">No wallet connected</span>
            )}
          </SettingRow>
          <SettingRow
            label="Network"
            description="The Solana cluster your wallet is connected to."
          >
            <div className="flex items-center gap-2">
              <span className="text-sm text-[var(--fyxvo-text)]">{portal.walletCluster}</span>
              {portal.networkMismatch ? (
                <Badge tone="warning">Network mismatch</Badge>
              ) : isAuthenticated ? (
                <Badge tone="success">Correct network</Badge>
              ) : null}
            </div>
          </SettingRow>
          <SettingRow
            label="Session"
            description="Disconnecting ends your current session and clears the auth token."
          >
            {isAuthenticated ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void portal.disconnectWallet()}
              >
                Disconnect wallet
              </Button>
            ) : (
              <span className="text-sm text-[var(--fyxvo-text-muted)]">Not connected</span>
            )}
          </SettingRow>
        </SectionCard>

        {/* Appearance */}
        <SectionCard
          title="Appearance"
          description="Choose between dark and light mode. Your preference is saved locally."
        >
          <SettingRow
            label="Theme"
            description="Dark mode is the default. Light mode is fully supported."
          >
            <ThemeToggle />
          </SettingRow>
        </SectionCard>

        {/* Security */}
        <SectionCard
          title="Security"
          description="Session information and access control overview."
        >
          <SettingRow
            label="Auth model"
            description="Sessions are authenticated via wallet signature — no password is stored."
          >
            <Badge tone="neutral">Wallet-signed JWT</Badge>
          </SettingRow>
          <SettingRow
            label="Active session"
            description="Your current auth token is valid as long as you remain connected."
          >
            {isAuthenticated ? (
              <Badge tone="success">Active</Badge>
            ) : (
              <Badge tone="neutral">None</Badge>
            )}
          </SettingRow>
          <SettingRow
            label="API keys"
            description="Manage project-scoped credentials from the API keys page."
          >
            <Button asChild variant="secondary" size="sm">
              <Link href="/api-keys">Manage API keys</Link>
            </Button>
          </SettingRow>
          <SettingRow
            label="Scope enforcement"
            description="All gateway routes enforce key scopes. Under-scoped keys are rejected."
          >
            <Badge tone="success">Enforced</Badge>
          </SettingRow>
        </SectionCard>

        {/* Notifications */}
        <SectionCard
          title="Notifications"
          description="Notification preferences for workspace events."
        >
          <Notice tone="neutral" title="Not yet available">
            Notification settings are planned for a future release. Currently, operational updates
            are available on the status page and community channels.
          </Notice>
          <SettingRow
            label="Status page"
            description="Check live service condition at any time."
          >
            <Button asChild variant="secondary" size="sm">
              <Link href="/status">View status</Link>
            </Button>
          </SettingRow>
        </SectionCard>

        {/* Team & Ownership */}
        <SectionCard
          title="Team & Ownership"
          description="Project ownership and collaboration settings."
        >
          <SettingRow
            label="Project owner"
            description="The wallet that owns the currently selected project."
          >
            {portal.selectedProject ? (
              <span className="font-mono text-sm text-[var(--fyxvo-text)]">
                {shortenAddress(portal.selectedProject.owner.walletAddress, 8, 8)}
              </span>
            ) : (
              <span className="text-sm text-[var(--fyxvo-text-muted)]">No project selected</span>
            )}
          </SettingRow>
          <SettingRow
            label="Project display name"
            description="A human-readable label shown in the project header. Stored in the database."
          >
            <div className="flex items-center gap-2">
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. My Production Project"
                className="h-9 text-sm"
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void saveDisplayName()}
                disabled={displayNameSaving || !portal.selectedProject || !portal.token}
              >
                {displayNameSaving ? "Saving…" : "Save"}
              </Button>
            </div>
          </SettingRow>
          <Notice tone="neutral">
            The current version is single-owner per project. Team collaboration roles are on the roadmap.
          </Notice>
        </SectionCard>

        {/* Usage Alerts */}
        <SectionCard
          title="Usage Alerts"
          description="Configure automatic notifications for project thresholds."
        >
          <SettingRow
            label="Low balance threshold (SOL)"
            description="Get notified when available SOL credits drop below this amount. Set to 0 to disable."
          >
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={lowBalanceSol}
                onChange={(e) => setLowBalanceSol(e.target.value)}
                placeholder="0"
                className="h-9 text-sm"
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void saveLowBalanceSol()}
                disabled={lowBalanceSolSaving || !portal.selectedProject || !portal.token}
              >
                {lowBalanceSolSaving ? "Saving…" : "Save"}
              </Button>
            </div>
          </SettingRow>
          <SettingRow
            label="Daily request alert"
            description="Get notified when daily requests exceed this count. Set to 0 to disable."
          >
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={dailyAlertThreshold}
                onChange={(e) => setDailyAlertThreshold(e.target.value)}
                placeholder="0"
                className="h-9 text-sm"
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void saveDailyAlertThreshold()}
                disabled={dailyAlertSaving || !portal.selectedProject || !portal.token}
              >
                {dailyAlertSaving ? "Saving…" : "Save"}
              </Button>
            </div>
          </SettingRow>
          <Notice tone="neutral" title="How alerts work">
            When thresholds are crossed, a notification appears in the bell icon in the dashboard header.
            Low-balance checks run with each metrics aggregation cycle.
          </Notice>
        </SectionCard>

        {/* Danger Zone */}
        <Card className="fyxvo-surface border-rose-500/25">
          <CardHeader>
            <CardTitle className="text-rose-500">Danger zone</CardTitle>
            <CardDescription>
              Irreversible actions. Read carefully before proceeding.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Notice tone="warning" title="Private alpha context">
              Account deletion during the private alpha is handled manually. On-chain data
              (project PDAs, funding transactions) cannot be deleted from the Solana blockchain.
              Fyxvo control-plane data can be removed on request.
            </Notice>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 sm:max-w-xs">
                <p className="text-sm font-medium text-[var(--fyxvo-text)]">Request account deletion</p>
                <p className="mt-1 text-xs text-[var(--fyxvo-text-muted)]">
                  Submits a deletion request for all control-plane data associated with your wallet
                  address. Processed manually within 5 business days.
                </p>
              </div>
              <div className="shrink-0">
                {!dangerConfirm ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setDangerConfirm(true)}
                    disabled={!isAuthenticated}
                  >
                    Request deletion
                  </Button>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => {
                        setDangerConfirm(false);
                        window.open("/contact", "_blank");
                      }}
                    >
                      Confirm — open contact form
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDangerConfirm(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
