"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
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
import { formatRelativeDate, shortenAddress } from "../../lib/format";
import { webEnv } from "../../lib/env";
import { revokeApiKey, getReferralStats, generateReferralCode, getNotificationPreferences, updateNotificationPreferences, listWebhooks, createWebhook, deleteWebhook, listProjectMembers, inviteProjectMember, removeProjectMember, getEmailDeliveryStatus, getSessionDiagnostics, recordProjectAccessView, sendEmailDeliveryTest } from "../../lib/api";
import type { EmailDeliveryStatus } from "../../lib/types";

function buildProjectNotesTemplate(projectName: string) {
  return `# Overview
${projectName}

# Use case
Describe what this project is doing and which environments matter.

# Owner notes
- Primary owner:
- Escalation path:

# Runbook
- Activate the project
- Confirm funding
- Generate or review the active API key
- Send a first request and confirm request logs

# Known issues
- Add current limitations, caveats, and open questions here.

# Links
- Docs:
- Status:
- Repo:`;
}

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

function parseRpcUrl(url: string): { provider: string; network: string; fyxvoEndpoint: string } | null {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    if (host.includes("helius")) return { provider: "Helius", network: "mainnet-beta", fyxvoEndpoint: "https://rpc.fyxvo.com/rpc" };
    if (host.includes("quicknode")) return { provider: "QuickNode", network: "mainnet-beta", fyxvoEndpoint: "https://rpc.fyxvo.com/rpc" };
    if (host.includes("alchemy")) return { provider: "Alchemy", network: "mainnet-beta", fyxvoEndpoint: "https://rpc.fyxvo.com/rpc" };
    return null;
  } catch { return null; }
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

  // Daily cost alert
  const [dailyCostAlertSol, setDailyCostAlertSol] = useState(
    (() => {
      const lamports = (portal.selectedProject as { dailyCostAlertLamports?: string | null } | null)?.dailyCostAlertLamports;
      if (!lamports) return "";
      try { return (Number(BigInt(lamports)) / 1e9).toString(); } catch { return ""; }
    })()
  );
  const [dailyCostAlertSaving, setDailyCostAlertSaving] = useState(false);

  // Appearance
  const [density, setDensity] = useState<"comfortable" | "compact">("comfortable");

  // Notification sound
  const [soundEnabled, setSoundEnabled] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("fyxvo_notification_sound") === "1" : false
  );

  // Weekly digest
  const [digestEnabled, setDigestEnabled] = useState(false);
  const [digestSaving, setDigestSaving] = useState(false);
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
  const [projectLeaderboardVisible, setProjectLeaderboardVisible] = useState(portal.selectedProject?.leaderboardVisible ?? false);
  const [dailyBudgetLamports, setDailyBudgetLamports] = useState(portal.selectedProject?.dailyBudgetLamports ?? "");
  const [monthlyBudgetLamports, setMonthlyBudgetLamports] = useState(portal.selectedProject?.monthlyBudgetLamports ?? "");
  const [budgetWarningThresholdPct, setBudgetWarningThresholdPct] = useState(
    portal.selectedProject?.budgetWarningThresholdPct?.toString() ?? "80"
  );
  const [budgetHardStop, setBudgetHardStop] = useState(portal.selectedProject?.budgetHardStop ?? false);
  const [projectFieldsSaving, setProjectFieldsSaving] = useState(false);
  const [notesPreview, setNotesPreview] = useState(false);
  const [notesSaveState, setNotesSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [sessionDiagnostics, setSessionDiagnostics] = useState<{
    sessionActive: boolean;
    walletAddress: string;
    authMode: string;
    issuedAt: string | null;
    expiresAt: string | null;
    termsAccepted: boolean;
    onboardingDismissed: boolean;
    assistantAvailable: boolean;
    environment: string;
    suggestions: readonly string[];
  } | null>(null);
  const [emailDeliveryStatus, setEmailDeliveryStatus] = useState<EmailDeliveryStatus | null>(null);
  const [signaturePayload, setSignaturePayload] = useState("{\n  \"event\": \"request.completed\",\n  \"project\": \"demo\"\n}");
  const [signatureHeader, setSignatureHeader] = useState("");
  const [signatureSecret, setSignatureSecret] = useState("");
  const [signatureResult, setSignatureResult] = useState<{
    valid: boolean;
    expected: string;
  } | null>(null);

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
  const [emailVerificationSending, setEmailVerificationSending] = useState(false);
  const [emailVerificationMessage, setEmailVerificationMessage] = useState<string | null>(null);
  const [emailTestSending, setEmailTestSending] = useState(false);
  const [emailTestMessage, setEmailTestMessage] = useState<string | null>(null);

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
  const [cancellingInviteId, setCancellingInviteId] = useState<string | null>(null);

  // Invite link
  const [inviteLinkUrl, setInviteLinkUrl] = useState<string | null>(null);
  const [inviteLinkExpiry, setInviteLinkExpiry] = useState<string | null>(null);
  const [inviteLinkLoading, setInviteLinkLoading] = useState(false);
  const [inviteLinkCopied, setInviteLinkCopied] = useState(false);

  // Webhook event log
  const [webhookEvents, setWebhookEvents] = useState<Array<{
    id: string;
    eventType: string;
    webhookUrl: string;
    status: "delivered" | "failed" | "pending";
    responseStatus: number | null;
    responseBody: string | null;
    attemptNumber: number;
    nextRetryAt: string | null;
    permanentlyFailed: boolean;
    payload: Record<string, unknown> | null;
    signature: string;
    createdAt: string;
  }>>([]);
  const [webhookEventsLoaded, setWebhookEventsLoaded] = useState(false);
  const [redelivering, setRedelivering] = useState<string | null>(null);

  // Reputation level
  const [reputationLevel, setReputationLevel] = useState<string | null>(null);

  // Project tags
  const [projectTags, setProjectTags] = useState<string[]>((portal.selectedProject as { tags?: string[] } | null)?.tags ?? []);
  const [tagInput, setTagInput] = useState("");
  const [tagError, setTagError] = useState<string | null>(null);
  const [tagsSaving, setTagsSaving] = useState(false);

  // Archive modal
  const [archiveModalOpen, setArchiveModalOpen] = useState(false);
  const [archiveReason, setArchiveReason] = useState<string | null>(null);
  const [archiving, setArchiving] = useState(false);

  // Import configuration
  const [importUrl, setImportUrl] = useState("");
  const [importParsed, setImportParsed] = useState<{ provider: string; network: string; fyxvoEndpoint: string } | null>(null);

  // Transfer ownership
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferTargetId, setTransferTargetId] = useState("");
  const [transferConfirmText, setTransferConfirmText] = useState("");
  const [transferring, setTransferring] = useState(false);
  const [transferSuccess, setTransferSuccess] = useState(false);

  const isAuthenticated = portal.walletPhase === "authenticated";
  const selectedProject = portal.selectedProject;
  const refreshPortal = portal.refresh;

  useEffect(() => {
    setProjectEnvironment((selectedProject?.environment as "development" | "staging" | "production" | undefined) ?? "development");
    setProjectNotes(selectedProject?.notes ?? "");
    setProjectStarred(selectedProject?.starred ?? false);
    setProjectGithubUrl(selectedProject?.githubUrl ?? "");
    setProjectIsPublic(selectedProject?.isPublic ?? false);
    setProjectPublicSlug(selectedProject?.publicSlug ?? "");
    setProjectLeaderboardVisible(selectedProject?.leaderboardVisible ?? false);
    setDailyBudgetLamports(selectedProject?.dailyBudgetLamports ?? "");
    setMonthlyBudgetLamports(selectedProject?.monthlyBudgetLamports ?? "");
    setBudgetWarningThresholdPct(selectedProject?.budgetWarningThresholdPct?.toString() ?? "80");
    setBudgetHardStop(selectedProject?.budgetHardStop ?? false);
    setNotesSaveState("idle");
  }, [selectedProject?.id, selectedProject?.environment, selectedProject?.notes, selectedProject?.starred, selectedProject?.githubUrl, selectedProject?.isPublic, selectedProject?.publicSlug, selectedProject?.leaderboardVisible, selectedProject?.dailyBudgetLamports, selectedProject?.monthlyBudgetLamports, selectedProject?.budgetWarningThresholdPct, selectedProject?.budgetHardStop]);

  const patchProject = useCallback(async (projectId: string, patch: Record<string, unknown>) => {
    if (!portal.token) return;
    await fetch(new URL(`/v1/projects/${projectId}`, webEnv.apiBaseUrl), {
      method: "PATCH",
      headers: { "content-type": "application/json", authorization: `Bearer ${portal.token}` },
      body: JSON.stringify(patch),
    });
  }, [portal.token]);

  useEffect(() => {
    if (!selectedProject || !portal.token) return;
    if ((selectedProject.notes ?? "") === projectNotes) return;
    setNotesSaveState("saving");
    const timeoutId = window.setTimeout(() => {
      patchProject(selectedProject.id, { notes: projectNotes || null })
        .then(() => {
          setNotesSaveState("saved");
          void refreshPortal();
        })
        .catch(() => {
          setNotesSaveState("error");
        });
    }, 900);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [patchProject, projectNotes, refreshPortal, selectedProject, portal.token]);

  useEffect(() => {
    if (!portal.token) {
      setSessionDiagnostics(null);
      setEmailDeliveryStatus(null);
      return;
    }
    let cancelled = false;
    Promise.all([getSessionDiagnostics(portal.token), getEmailDeliveryStatus(portal.token)])
      .then(([diagnostics, delivery]) => {
        if (cancelled) return;
        setSessionDiagnostics(diagnostics);
        setEmailDeliveryStatus(delivery);
      })
      .catch(() => {
        if (!cancelled) {
          setSessionDiagnostics(null);
          setEmailDeliveryStatus(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [portal.token]);

  useEffect(() => {
    if (!selectedProject?.id || !portal.token) return;
    void recordProjectAccessView(selectedProject.id, portal.token).catch(() => undefined);
  }, [selectedProject?.id, portal.token]);

  async function verifyWebhookSignature() {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(signatureSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(signaturePayload));
    const expected = Array.from(new Uint8Array(signatureBuffer))
      .map((value) => value.toString(16).padStart(2, "0"))
      .join("");
    const normalizedHeader = signatureHeader.trim().replace(/^sha256=/i, "");
    setSignatureResult({
      valid: normalizedHeader.length > 0 && normalizedHeader === expected,
      expected,
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
        leaderboardVisible: projectLeaderboardVisible,
        dailyBudgetLamports: dailyBudgetLamports.trim() ? dailyBudgetLamports.trim() : null,
        monthlyBudgetLamports: monthlyBudgetLamports.trim() ? monthlyBudgetLamports.trim() : null,
        budgetWarningThresholdPct: budgetWarningThresholdPct.trim() ? Number(budgetWarningThresholdPct) : null,
        budgetHardStop,
      });
      await portal.refresh();
    } finally { setProjectFieldsSaving(false); }
  }

  async function saveEmail() {
    if (!portal.token) return;
    setEmailSaving(true);
    setEmailTestMessage(null);
    try {
      await updateNotificationPreferences({ email: emailValue || null }, portal.token);
      const [_, delivery] = await Promise.all([
        portal.refresh(),
        getEmailDeliveryStatus(portal.token).catch(() => null),
      ]);
      if (delivery) setEmailDeliveryStatus(delivery);
      setEmailSaved(true);
      setTimeout(() => setEmailSaved(false), 2500);
    } finally {
      setEmailSaving(false);
    }
  }

  async function requestEmailVerification() {
    if (!portal.token || !emailValue.trim()) return;
    setEmailVerificationSending(true);
    setEmailVerificationMessage(null);
    setEmailTestMessage(null);
    try {
      const response = await fetch(new URL("/v1/me/verify-email/request", webEnv.apiBaseUrl), {
        method: "POST",
        headers: { authorization: `Bearer ${portal.token}` },
      });
      const payload = (await response.json().catch(() => ({}))) as { message?: string; error?: string };
      setEmailVerificationMessage(
        response.ok
          ? payload.message ?? "Verification email sent."
          : payload.message ?? payload.error ?? "Unable to send verification email right now."
      );
      if (response.ok) {
        const delivery = await getEmailDeliveryStatus(portal.token).catch(() => null);
        if (delivery) setEmailDeliveryStatus(delivery);
      }
    } catch {
      setEmailVerificationMessage("Unable to send verification email right now.");
    } finally {
      setEmailVerificationSending(false);
    }
  }

  async function handleSendEmailTest() {
    if (!portal.token) return;
    setEmailTestSending(true);
    setEmailTestMessage(null);
    try {
      const response = await sendEmailDeliveryTest(portal.token);
      setEmailTestMessage(response.message ?? `Test email sent to ${response.recipient}.`);
      const delivery = await getEmailDeliveryStatus(portal.token).catch(() => null);
      if (delivery) setEmailDeliveryStatus(delivery);
    } catch (error) {
      setEmailTestMessage(error instanceof Error ? error.message : "Unable to send a test email right now.");
    } finally {
      setEmailTestSending(false);
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

  async function saveDailyCostAlert() {
    if (!portal.selectedProject) return;
    setDailyCostAlertSaving(true);
    try {
      const lamports = dailyCostAlertSol === "" ? "0" : String(Math.round(parseFloat(dailyCostAlertSol) * 1e9));
      await patchProject(portal.selectedProject.id, { dailyCostAlertLamports: lamports });
    } finally { setDailyCostAlertSaving(false); }
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

  // Load reputation level
  useEffect(() => {
    if (!portal.token || !isAuthenticated) return;
    void fetch(new URL("/v1/user/me", webEnv.apiBaseUrl), {
      headers: { authorization: `Bearer ${portal.token}` },
      cache: "no-store",
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((body: unknown) => {
        if (body && typeof body === "object" && "reputationLevel" in body) {
          const level = (body as { reputationLevel?: unknown }).reputationLevel;
          if (typeof level === "string") {
            setTimeout(() => setReputationLevel(level), 0);
          }
        }
      })
      .catch(() => undefined);
  }, [portal.token, isAuthenticated]);

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
    const tok = portal.token;
    listWebhooks(projectId, tok)
      .then((data) => { setWebhooks(data.items); setWebhooksLoaded(true); })
      .catch(() => setWebhooksLoaded(true));
    listProjectMembers(projectId, tok)
      .then((data) => { setMembers(data.items); setMembersLoaded(true); })
      .catch(() => setMembersLoaded(true));
    fetch(new URL(`/v1/projects/${projectId}/webhooks/events`, webEnv.apiBaseUrl), {
      headers: { authorization: `Bearer ${tok}` },
      cache: "no-store",
    })
      .then(async (res) => {
        if (!res.ok) return;
        const body = await res.json() as { items: Array<{ id: string; eventType: string; webhookUrl: string; status: "delivered" | "failed" | "pending"; responseStatus: number | null; responseBody: string | null; attemptNumber: number; nextRetryAt: string | null; permanentlyFailed: boolean; payload: Record<string, unknown> | null; signature: string; createdAt: string }> };
        setWebhookEvents(body.items ?? []);
      })
      .catch(() => undefined)
      .finally(() => setWebhookEventsLoaded(true));
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

  async function handleCancelInvite(memberId: string) {
    if (!portal.token || !portal.selectedProject) return;
    setCancellingInviteId(memberId);
    // Optimistic removal
    const prev = members;
    setMembers((current) => current.filter((m) => m.id !== memberId));
    try {
      await removeProjectMember(portal.selectedProject.id, memberId, portal.token);
    } catch {
      setMembers(prev);
    } finally {
      setCancellingInviteId(null);
    }
  }

  async function handleGenerateInviteLink() {
    if (!portal.token || !portal.selectedProject) return;
    setInviteLinkLoading(true);
    try {
      const res = await fetch(
        new URL(`/v1/projects/${portal.selectedProject.id}/invite-link`, webEnv.apiBaseUrl),
        { headers: { authorization: `Bearer ${portal.token}` } }
      );
      if (res.ok) {
        const body = await res.json() as { url: string; expiresAt?: string };
        setInviteLinkUrl(body.url);
        setInviteLinkExpiry(body.expiresAt ?? null);
      }
    } finally {
      setInviteLinkLoading(false);
    }
  }

  async function handleArchiveProject(skip: boolean) {
    if (!portal.token || !portal.selectedProject) return;
    setArchiving(true);
    try {
      const patch: Record<string, unknown> = { archived: true };
      if (!skip && archiveReason) {
        patch.archiveReason = archiveReason;
      }
      await patchProject(portal.selectedProject.id, patch);
      setArchiveModalOpen(false);
      setArchiveReason(null);
      await portal.refresh();
    } finally {
      setArchiving(false);
    }
  }

  async function handleRedeliver(eventId: string) {
    if (!portal.token || !portal.selectedProject) return;
    setRedelivering(eventId);
    try {
      await fetch(
        new URL(
          `/v1/projects/${portal.selectedProject.id}/webhooks/events/${eventId}/redeliver`,
          webEnv.apiBaseUrl
        ),
        {
          method: "POST",
          headers: { authorization: `Bearer ${portal.token}` },
        }
      );
      setWebhookEvents((prev) =>
        prev.map((ev) =>
          ev.id === eventId ? { ...ev, status: "pending" as const } : ev
        )
      );
    } finally {
      setRedelivering(null);
    }
  }

  async function handleTransferOwnership() {
    if (!portal.token || !portal.selectedProject || !transferTargetId) return;
    setTransferring(true);
    try {
      await fetch(
        new URL(
          `/v1/projects/${portal.selectedProject.id}/transfer-ownership`,
          webEnv.apiBaseUrl
        ),
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${portal.token}`,
          },
          body: JSON.stringify({ newOwnerId: transferTargetId }),
        }
      );
      setTransferSuccess(true);
      setTransferOpen(false);
      setTransferTargetId("");
      setTransferConfirmText("");
      await portal.refresh();
    } finally {
      setTransferring(false);
    }
  }

  async function toggleDigest() {
    if (!portal.token) return;
    setDigestSaving(true);
    const next = !digestEnabled;
    setDigestEnabled(next);
    try {
      await fetch(new URL("/v1/me/digest", webEnv.apiBaseUrl), {
        method: next ? "POST" : "DELETE",
        headers: { authorization: `Bearer ${portal.token}` },
      });
      const delivery = await getEmailDeliveryStatus(portal.token).catch(() => null);
      if (delivery) setEmailDeliveryStatus(delivery);
    } catch {
      // revert on error
      setDigestEnabled(!next);
    } finally {
      setDigestSaving(false);
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

  async function saveTags() {
    if (!portal.selectedProject || !portal.token) return;
    setTagsSaving(true);
    try {
      await fetch(
        new URL(`/v1/projects/${portal.selectedProject.slug}/tags`, webEnv.apiBaseUrl),
        {
          method: "PATCH",
          headers: { "content-type": "application/json", authorization: `Bearer ${portal.token}` },
          body: JSON.stringify({ tags: projectTags }),
        }
      );
    } finally {
      setTagsSaving(false);
    }
  }

  function addTag() {
    const tag = tagInput.trim().toLowerCase();
    if (!tag) return;
    if (!/^[a-z0-9-]+$/.test(tag)) {
      setTagError("Tags may only contain lowercase letters, numbers, and hyphens.");
      return;
    }
    if (tag.length > 20) {
      setTagError("Tags must be 20 characters or fewer.");
      return;
    }
    if (projectTags.length >= 10) {
      setTagError("Maximum 10 tags per project.");
      return;
    }
    if (projectTags.includes(tag)) {
      setTagError("Tag already added.");
      return;
    }
    setTagError(null);
    setProjectTags((prev) => [...prev, tag]);
    setTagInput("");
  }

  const archivedProjects = portal.projects.filter((p) => p.archivedAt != null);
  const activeProjects = portal.projects.filter((p) => p.archivedAt == null);

  const totalRequests = activeProjects.reduce((sum, p) => sum + (p._count?.requestLogs ?? 0), 0);
  const totalKeys = portal.projects.reduce((sum, p) => sum + (p._count?.apiKeys ?? 0), 0);
  const estimatedLamports = totalRequests * 1000;
  const estimatedSol = (estimatedLamports / 1e9).toFixed(6);

  const acceptedMembers = members.filter((m) => m.acceptedAt !== null && m.userId !== portal.user?.id);
  const pendingInvitations = members.filter((m) => m.acceptedAt === null);

  return (
    <div className="space-y-8">
      {/* Archive reason modal */}
      {archiveModalOpen && portal.selectedProject ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" aria-modal="true" role="dialog">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setArchiveModalOpen(false)} aria-hidden="true" />
          <div className="relative z-10 w-full max-w-sm rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg-elevated)] p-6 shadow-2xl">
            <h2 className="text-lg font-semibold text-[var(--fyxvo-text)]">Archive this project?</h2>
            <p className="mt-1 text-sm text-[var(--fyxvo-text-muted)]">Select a reason (optional) then confirm.</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {(["No longer needed", "Migrating to another project", "Testing only", "Other"] as const).map((reason) => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => setArchiveReason((prev) => (prev === reason ? null : reason))}
                  className={`rounded-xl border px-3 py-2 text-left text-xs font-medium transition-colors ${
                    archiveReason === reason
                      ? "border-[var(--fyxvo-brand)]/50 bg-[var(--fyxvo-brand-subtle)] text-[var(--fyxvo-text)]"
                      : "border-[var(--fyxvo-border)] text-[var(--fyxvo-text-muted)] hover:text-[var(--fyxvo-text)]"
                  }`}
                >
                  {reason}
                </button>
              ))}
            </div>
            <div className="mt-5 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => void handleArchiveProject(true)}
                className="text-sm text-[var(--fyxvo-text-muted)] underline hover:text-[var(--fyxvo-text)]"
                disabled={archiving}
              >
                Skip
              </button>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => setArchiveModalOpen(false)} disabled={archiving}>
                  Cancel
                </Button>
                <Button variant="danger" size="sm" onClick={() => void handleArchiveProject(false)} disabled={archiving}>
                  {archiving ? "Archiving…" : "Confirm Archive"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

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
                {reputationLevel ? (
                  <div className="mt-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                        reputationLevel === "Operator"
                          ? "bg-amber-500/15 text-[var(--fyxvo-warning)]"
                          : reputationLevel === "Architect"
                            ? "bg-purple-500/15 text-purple-600"
                            : reputationLevel === "Builder"
                              ? "bg-blue-500/15 text-blue-600"
                              : "bg-[var(--fyxvo-panel-soft)] text-[var(--fyxvo-text-muted)]"
                      }`}
                    >
                      {reputationLevel === "Explorer"
                        ? "🌱"
                        : reputationLevel === "Builder"
                          ? "🔨"
                          : reputationLevel === "Architect"
                            ? "🏗️"
                            : "⚙️"}{" "}
                      {reputationLevel}
                    </span>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
          {isAuthenticated && reputationLevel ? (
            <SettingRow
              label="Developer Level"
              description="Your reputation tier on the Fyxvo network based on usage and activity."
            >
              <span
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-semibold ${
                  reputationLevel === "Operator"
                    ? "bg-amber-500/15 text-[var(--fyxvo-warning)]"
                    : reputationLevel === "Architect"
                      ? "bg-purple-500/15 text-purple-600"
                      : reputationLevel === "Builder"
                        ? "bg-blue-500/15 text-blue-600"
                        : "bg-[var(--fyxvo-panel-soft)] text-[var(--fyxvo-text-muted)]"
                }`}
              >
                {reputationLevel === "Explorer"
                  ? "🌱"
                  : reputationLevel === "Builder"
                    ? "🔨"
                    : reputationLevel === "Architect"
                      ? "🏗️"
                      : "⚙️"}{" "}
                {reputationLevel}
              </span>
            </SettingRow>
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
          <SettingRow label="Email address" description="Used for alerts, status notices, and digest emails after verification.">
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
                {emailValue && !portal.user?.emailVerified ? (
                  <span className="ml-2 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs text-amber-400">Unverified</span>
                ) : emailValue ? (
                  <span className="ml-2 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-400">Verified</span>
                ) : null}
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
                <p className="text-xs text-[var(--fyxvo-success)]">Email saved.</p>
              ) : null}
              <p className="text-xs text-[var(--fyxvo-text-muted)]">
                Fyxvo uses this address for verification, weekly digests, and operational notices after you confirm it.
              </p>
              <p className="text-xs text-[var(--fyxvo-text-muted)]">
                Verification keeps delivery tied to the right wallet session and prevents notices from going to an unconfirmed address.
              </p>
              {emailValue && !portal.user?.emailVerified ? (
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => void requestEmailVerification()}
                    disabled={emailVerificationSending || !portal.token}
                  >
                    {emailVerificationSending ? "Sending…" : "Send verification email"}
                  </Button>
                  <span className="text-xs text-[var(--fyxvo-text-muted)]">
                    A secure confirmation link will be sent to this address.
                  </span>
                </div>
              ) : null}
              {emailVerificationMessage ? (
                <p className="text-xs text-[var(--fyxvo-text-muted)]">{emailVerificationMessage}</p>
              ) : null}
              {emailDeliveryStatus?.configured && emailDeliveryStatus.emailVerified ? (
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => void handleSendEmailTest()}
                    disabled={emailTestSending || !portal.token}
                  >
                    {emailTestSending ? "Sending test…" : "Send test email"}
                  </Button>
                  <span className="text-xs text-[var(--fyxvo-text-muted)]">
                    Confirm this inbox can receive live verification, digest, and status messages.
                  </span>
                </div>
              ) : null}
              {emailTestMessage ? (
                <p className="text-xs text-[var(--fyxvo-text-muted)]">{emailTestMessage}</p>
              ) : null}
              {emailDeliveryStatus ? (
                <div className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-3 py-3 text-xs text-[var(--fyxvo-text-muted)]">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={emailDeliveryStatus.configured ? "success" : "warning"}>
                      {emailDeliveryStatus.configured ? "Email delivery configured" : "Email delivery unavailable"}
                    </Badge>
                    <Badge tone={emailDeliveryStatus.statusSubscriberActive ? "success" : "neutral"}>
                      {emailDeliveryStatus.statusSubscriberActive ? "Status subscriber active" : "Status subscriber inactive"}
                    </Badge>
                    <Badge tone={emailDeliveryStatus.digestEnabled ? "success" : "neutral"}>
                      {emailDeliveryStatus.digestEnabled ? "Weekly digest enabled" : "Weekly digest disabled"}
                    </Badge>
                  </div>
                  <div className="mt-2 grid gap-1">
                    <div>
                      Provider: <span className="text-[var(--fyxvo-text)]">{emailDeliveryStatus.provider}</span>
                    </div>
                    <div>
                      Verification:{" "}
                      <span className="text-[var(--fyxvo-text)]">
                        {emailDeliveryStatus.emailVerified
                          ? "Verified"
                          : emailDeliveryStatus.verificationRequired
                            ? "Pending confirmation"
                            : "No email saved"}
                      </span>
                    </div>
                    <div>
                      Next digest:{" "}
                      <span className="text-[var(--fyxvo-text)]">
                        {emailDeliveryStatus.digestNextSendAt ? formatRelativeDate(emailDeliveryStatus.digestNextSendAt) : "Not scheduled"}
                      </span>
                    </div>
                    <div>
                      Latest digest:{" "}
                      <span className="text-[var(--fyxvo-text)]">
                        {emailDeliveryStatus.latestDigestGeneratedAt
                          ? `${formatRelativeDate(emailDeliveryStatus.latestDigestGeneratedAt)}${emailDeliveryStatus.latestDigestSent === false ? " (not sent)" : ""}`
                          : "None generated yet"}
                      </span>
                    </div>
                  </div>
                </div>
              ) : null}
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

        <SectionCard title="Session diagnostics" description="Useful auth and assistant diagnostics for the current wallet session.">
          {sessionDiagnostics ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-4 rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-[var(--fyxvo-text)]">Session status</span>
                  <Badge tone={sessionDiagnostics.sessionActive ? "success" : "warning"}>
                    {sessionDiagnostics.sessionActive ? "Active" : "Expired"}
                  </Badge>
                </div>
                <div className="space-y-2 text-sm text-[var(--fyxvo-text-soft)]">
                  <div>Auth mode: {sessionDiagnostics.authMode}</div>
                  <div>Issued: {sessionDiagnostics.issuedAt ? formatRelativeDate(sessionDiagnostics.issuedAt) : "Unavailable"}</div>
                  <div>Expires: {sessionDiagnostics.expiresAt ? formatRelativeDate(sessionDiagnostics.expiresAt) : "Unavailable"}</div>
                  <div>Terms accepted: {sessionDiagnostics.termsAccepted ? "Yes" : "No"}</div>
                  <div>Onboarding dismissed: {sessionDiagnostics.onboardingDismissed ? "Yes" : "No"}</div>
                  <div>Assistant available: {sessionDiagnostics.assistantAvailable ? "Yes" : "No"}</div>
                  <div>Environment: {sessionDiagnostics.environment}</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" size="sm" onClick={() => void portal.refresh()}>
                    Refresh workspace session
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => void portal.disconnectWallet()}>
                    Reconnect wallet
                  </Button>
                </div>
              </div>
              <div className="space-y-3 rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-[var(--fyxvo-text-muted)]">Common fixes</p>
                {sessionDiagnostics.suggestions.map((suggestion) => (
                  <p key={suggestion} className="text-sm leading-6 text-[var(--fyxvo-text-soft)]">
                    {suggestion}
                  </p>
                ))}
              </div>
            </div>
          ) : (
            <Notice tone="neutral" title="Diagnostics unavailable">
              Connect and authenticate to inspect session timing, Terms state, onboarding state, and assistant availability.
            </Notice>
          )}
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
                <p className="text-xs text-[var(--fyxvo-success)]">Display name saved.</p>
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
                      ? "border-[var(--fyxvo-brand)]/50 bg-[var(--fyxvo-brand-subtle)] text-[var(--fyxvo-text)]"
                      : "border-[var(--fyxvo-border)] text-[var(--fyxvo-text-muted)] hover:text-[var(--fyxvo-text)]"
                  }`}
                >
                  {env}
                </button>
              ))}
            </div>
          </SettingRow>
          <SettingRow label="Budgets" description="Optional daily and monthly lamport budgets for billable live requests. Simulation mode remains allowed even when hard stop is on.">
            <div className="w-full max-w-2xl space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                <Input
                  label="Daily budget (lamports)"
                  value={dailyBudgetLamports}
                  onChange={(e) => setDailyBudgetLamports(e.target.value.replace(/[^\d]/g, ""))}
                  placeholder="25000000"
                  className="h-9 text-sm"
                />
                <Input
                  label="Monthly budget (lamports)"
                  value={monthlyBudgetLamports}
                  onChange={(e) => setMonthlyBudgetLamports(e.target.value.replace(/[^\d]/g, ""))}
                  placeholder="500000000"
                  className="h-9 text-sm"
                />
              </div>
              <div className="grid gap-3 md:grid-cols-[200px_1fr]">
                <Input
                  label="Soft warning %"
                  value={budgetWarningThresholdPct}
                  onChange={(e) => setBudgetWarningThresholdPct(e.target.value.replace(/[^\d]/g, ""))}
                  placeholder="80"
                  className="h-9 text-sm"
                />
                <div className="rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 py-3">
                  <label className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-[var(--fyxvo-text)]">Hard stop</p>
                      <p className="text-xs text-[var(--fyxvo-text-muted)]">
                        Blocks new billable live requests after the budget is exceeded. Simulation mode still works.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={budgetHardStop}
                      onChange={(e) => setBudgetHardStop(e.target.checked)}
                      aria-label="Enable budget hard stop"
                    />
                  </label>
                </div>
              </div>
            </div>
          </SettingRow>
          <SettingRow label="Star project" description="Starred projects appear at the top of the project list.">
            <button
              type="button"
              onClick={() => setProjectStarred(!projectStarred)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                projectStarred
                  ? "border-[var(--fyxvo-brand)]/50 bg-[var(--fyxvo-brand-subtle)] text-[var(--fyxvo-text)]"
                  : "border-[var(--fyxvo-border)] text-[var(--fyxvo-text-muted)] hover:text-[var(--fyxvo-text)]"
              }`}
            >
              {projectStarred ? "★ Starred" : "☆ Star this project"}
            </button>
          </SettingRow>
          <SettingRow label="Project notes" description="Internal documentation for your team. Not exposed publicly.">
            <div className="w-full max-w-2xl space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    if (!projectNotes.trim()) {
                      setProjectNotes(buildProjectNotesTemplate(portal.selectedProject?.name ?? "Project"));
                    }
                  }}
                >
                  Insert template
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setNotesPreview((value) => !value)}>
                  {notesPreview ? "Edit notes" : "Preview notes"}
                </Button>
                <CopyButton text={projectNotes} />
                <span className="text-xs text-[var(--fyxvo-text-muted)]">
                  {notesSaveState === "saving" ? "Autosaving…" : notesSaveState === "saved" ? "Saved" : notesSaveState === "error" ? "Save failed" : "Idle"}
                </span>
              </div>
              {portal.selectedProject?.notesUpdatedAt ? (
                <p className="text-xs text-[var(--fyxvo-text-muted)]">
                  Last edited {new Date(portal.selectedProject.notesUpdatedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  {portal.selectedProject.notesEditedByWallet ? ` by ${shortenAddress(portal.selectedProject.notesEditedByWallet, 6, 6)}` : ""}
                </p>
              ) : null}
              {notesPreview ? (
                <div className="min-h-[220px] whitespace-pre-wrap rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 py-3 text-sm leading-7 text-[var(--fyxvo-text)]">
                  {projectNotes || "No project notes yet. Add overview, runbook, known issues, and useful links here."}
                </div>
              ) : (
                <textarea
                  value={projectNotes}
                  onChange={(e) => setProjectNotes(e.target.value)}
                  placeholder="Internal notes about this project…"
                  rows={12}
                  maxLength={4000}
                  className="w-full resize-y rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-3 py-3 text-sm leading-7 text-[var(--fyxvo-text)] placeholder:text-[var(--fyxvo-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--fyxvo-accent)]"
                />
              )}
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
                    projectIsPublic ? "bg-[var(--fyxvo-brand)]" : "bg-[var(--fyxvo-border-strong)]"
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
          <SettingRow label="Leaderboard" description="Include this project in the public developer leaderboard ranked by request volume.">
            <div className="flex items-center gap-3">
              <button
                type="button"
                role="switch"
                aria-checked={projectLeaderboardVisible}
                onClick={() => setProjectLeaderboardVisible(!projectLeaderboardVisible)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                  projectLeaderboardVisible ? "bg-[var(--fyxvo-brand)]" : "bg-[var(--fyxvo-border-strong)]"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                    projectLeaderboardVisible ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
              <span className="text-xs text-[var(--fyxvo-text-muted)]">
                {projectLeaderboardVisible ? "Show on public leaderboard" : "Hidden from leaderboard"}
              </span>
            </div>
          </SettingRow>
          <SettingRow
            label="Tags"
            description="Add up to 10 tags (lowercase, letters/numbers/hyphens, max 20 chars each)."
          >
            <div className="space-y-3 w-full">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => { setTagInput(e.target.value); setTagError(null); }}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                  placeholder="e.g. defi, indexing, mainnet"
                  className="flex-1 rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-3 py-1.5 text-sm text-[var(--fyxvo-text)] placeholder:text-[var(--fyxvo-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--fyxvo-accent)]"
                />
                <Button variant="secondary" size="sm" onClick={addTag} disabled={!tagInput.trim()}>
                  Add
                </Button>
              </div>
              {tagError ? (
                <p className="text-xs text-rose-500">{tagError}</p>
              ) : null}
              {projectTags.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {projectTags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1.5 rounded-full border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-2.5 py-0.5 text-xs text-[var(--fyxvo-text-muted)]"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => setProjectTags((prev) => prev.filter((t) => t !== tag))}
                        className="text-[var(--fyxvo-text-muted)] hover:text-rose-500 transition-colors"
                        aria-label={`Remove tag ${tag}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[var(--fyxvo-text-muted)]">No tags yet.</p>
              )}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void saveTags()}
                disabled={tagsSaving || !portal.selectedProject || !portal.token}
              >
                {tagsSaving ? "Saving tags…" : "Save tags"}
              </Button>
            </div>
          </SettingRow>
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
          <SettingRow
            label="Import Configuration"
            description="Paste a Helius, QuickNode, or Alchemy endpoint URL to get the equivalent Fyxvo configuration."
          >
            <div className="w-full space-y-2">
              <Input
                type="url"
                placeholder="https://mainnet.helius-rpc.com/?api-key=..."
                value={importUrl}
                onChange={(e) => {
                  const val = e.target.value;
                  setTimeout(() => {
                    setImportUrl(val);
                    setImportParsed(parseRpcUrl(val));
                  }, 0);
                }}
                className="w-full font-mono text-xs"
              />
              {importParsed ? (
                <div className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-3 space-y-2">
                  <p className="text-xs text-[var(--fyxvo-text-muted)]">
                    Detected: <span className="font-medium text-[var(--fyxvo-text)]">{importParsed.provider}</span> on <span className="font-medium text-[var(--fyxvo-text)]">{importParsed.network}</span>
                  </p>
                  <div>
                    <p className="text-xs text-[var(--fyxvo-text-muted)] mb-1">Fyxvo equivalent:</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 rounded border border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)] px-2 py-1 font-mono text-xs text-[var(--fyxvo-text)] truncate">
                        {importParsed.fyxvoEndpoint}
                      </code>
                      <CopyButton text={importParsed.fyxvoEndpoint} />
                    </div>
                  </div>
                </div>
              ) : importUrl.length > 0 ? (
                <p className="text-xs text-[var(--fyxvo-text-muted)]">Provider not recognized. Supported: Helius, QuickNode, Alchemy.</p>
              ) : null}
            </div>
          </SettingRow>
          {portal.selectedProject && !portal.selectedProject.archivedAt ? (
            <SettingRow label="Archive project" description="Archive this project to hide it from active views. It can be restored later.">
              <Button
                variant="danger"
                size="sm"
                onClick={() => setArchiveModalOpen(true)}
                disabled={!isAuthenticated || !portal.token}
              >
                Archive
              </Button>
            </SettingRow>
          ) : null}
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
                        ? "border-[var(--fyxvo-brand)]/50 bg-[var(--fyxvo-brand-subtle)] text-[var(--fyxvo-text)]"
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

            {/* Webhook Event Log */}
            <div className="border-t border-[var(--fyxvo-border)] pt-4 space-y-3">
              <p className="text-xs font-medium uppercase tracking-wider text-[var(--fyxvo-text-muted)]">Event Log</p>
              {!webhookEventsLoaded ? (
                <p className="text-sm text-[var(--fyxvo-text-muted)]">Loading…</p>
              ) : webhookEvents.length === 0 ? (
                <p className="text-sm text-[var(--fyxvo-text-muted)]">No webhook events recorded yet.</p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-[var(--fyxvo-border)]">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)]">
                        <th className="px-3 py-2 text-left font-medium text-[var(--fyxvo-text-muted)]">Event Type</th>
                        <th className="px-3 py-2 text-left font-medium text-[var(--fyxvo-text-muted)]">Webhook URL</th>
                        <th className="px-3 py-2 text-left font-medium text-[var(--fyxvo-text-muted)]">Status</th>
                        <th className="px-3 py-2 text-left font-medium text-[var(--fyxvo-text-muted)]">Code</th>
                        <th className="px-3 py-2 text-left font-medium text-[var(--fyxvo-text-muted)]">Attempt</th>
                        <th className="px-3 py-2 text-left font-medium text-[var(--fyxvo-text-muted)]">Next retry</th>
                        <th className="px-3 py-2 text-left font-medium text-[var(--fyxvo-text-muted)]">When</th>
                        <th className="px-3 py-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {webhookEvents.map((ev) => (
                        <tr key={ev.id} className="border-b border-[var(--fyxvo-border)] last:border-0">
                          <td className="px-3 py-2 font-mono text-[var(--fyxvo-text)]">{ev.eventType}</td>
                          <td className="px-3 py-2 font-mono text-[var(--fyxvo-text-muted)] max-w-[12rem] truncate">{ev.webhookUrl}</td>
                          <td className="px-3 py-2">
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                ev.status === "delivered"
                                  ? "bg-emerald-500/10 text-[var(--fyxvo-success)]"
                                  : ev.status === "failed"
                                  ? "bg-rose-500/10 text-[var(--fyxvo-danger)]"
                                  : "bg-[var(--fyxvo-panel-soft)] text-[var(--fyxvo-text-muted)]"
                              }`}
                            >
                              {ev.permanentlyFailed ? "permanently failed" : ev.status}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-[var(--fyxvo-text-muted)]">{ev.responseStatus ?? "—"}</td>
                          <td className="px-3 py-2 text-[var(--fyxvo-text-muted)]">#{ev.attemptNumber}</td>
                          <td className="px-3 py-2 text-[var(--fyxvo-text-muted)] whitespace-nowrap">
                            {ev.nextRetryAt ? new Date(ev.nextRetryAt).toLocaleString() : ev.permanentlyFailed ? "No more retries" : "—"}
                          </td>
                          <td className="px-3 py-2 text-[var(--fyxvo-text-muted)] whitespace-nowrap">
                            {new Date(ev.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                className="text-xs text-[var(--fyxvo-brand)] hover:underline"
                                onClick={() => void navigator.clipboard.writeText(JSON.stringify(ev.payload ?? {}, null, 2))}
                              >
                                Copy payload
                              </button>
                              <button
                                type="button"
                                className="text-xs text-[var(--fyxvo-brand)] hover:underline"
                                onClick={() => void navigator.clipboard.writeText(ev.signature)}
                              >
                                Copy signature
                              </button>
                              {ev.status === "failed" ? (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  className="text-xs"
                                  disabled={redelivering === ev.id}
                                  onClick={() => void handleRedeliver(ev.id)}
                                >
                                  {redelivering === ev.id ? "…" : "Retry"}
                                </Button>
                              ) : null}
                            </div>
                            {ev.responseBody ? (
                              <p className="mt-2 max-w-[18rem] truncate text-[10px] text-[var(--fyxvo-text-muted)]">
                                {ev.responseBody}
                              </p>
                            ) : null}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </SectionCard>
        ) : null}

        {isAuthenticated && portal.selectedProject ? (
          <SectionCard title="Webhook signature debugger" description="Validate `x-fyxvo-signature` locally before blaming delivery infrastructure.">
            <div className="space-y-4">
              <Notice tone="neutral" title="Signing format">
                Fyxvo signs the raw JSON payload body with HMAC-SHA256 using your webhook secret. Compare the computed hex digest with the `x-fyxvo-signature` header value.
              </Notice>
              <textarea
                value={signaturePayload}
                onChange={(e) => setSignaturePayload(e.target.value)}
                rows={8}
                className="w-full rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-3 py-2 font-mono text-xs text-[var(--fyxvo-text)]"
                aria-label="Webhook payload"
              />
              <div className="grid gap-3 md:grid-cols-2">
                <Input
                  label="x-fyxvo-signature"
                  value={signatureHeader}
                  onChange={(e) => setSignatureHeader(e.target.value)}
                  placeholder="sha256=..."
                  className="h-9 text-sm font-mono"
                />
                <Input
                  label="Webhook secret"
                  value={signatureSecret}
                  onChange={(e) => setSignatureSecret(e.target.value)}
                  placeholder="whsec_..."
                  className="h-9 text-sm font-mono"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" onClick={() => void verifyWebhookSignature()} disabled={!signatureSecret.trim()}>
                  Verify signature
                </Button>
                <Button asChild variant="secondary" size="sm">
                  <Link href="/docs#webhooks">Open webhook docs</Link>
                </Button>
                <Button asChild variant="secondary" size="sm">
                  <Link href="/playground?method=webhookTest">Open webhook testing</Link>
                </Button>
              </div>
              {signatureResult ? (
                <div className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge tone={signatureResult.valid ? "success" : "warning"}>
                      {signatureResult.valid ? "Signature valid" : "Signature mismatch"}
                    </Badge>
                    <CopyButton text={signatureResult.expected} />
                  </div>
                  <div className="text-xs text-[var(--fyxvo-text-muted)]">
                    Expected signature
                  </div>
                  <code className="block break-all rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)] px-3 py-2 font-mono text-xs text-[var(--fyxvo-text)]">
                    {signatureResult.expected}
                  </code>
                  <div className="grid gap-3 lg:grid-cols-2">
                    <pre className="overflow-x-auto rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)] p-3 text-xs text-[var(--fyxvo-text-soft)]">{`import crypto from "node:crypto";

const expected = crypto
  .createHmac("sha256", process.env.FYXVO_WEBHOOK_SECRET!)
  .update(rawBody)
  .digest("hex");`}</pre>
                    <pre className="overflow-x-auto rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)] p-3 text-xs text-[var(--fyxvo-text-soft)]">{`import hmac, hashlib

expected = hmac.new(
    SECRET.encode(),
    raw_body.encode(),
    hashlib.sha256,
).hexdigest()`}</pre>
                  </div>
                </div>
              ) : null}
            </div>
          </SectionCard>
        ) : null}

        {/* Team members */}
        {isAuthenticated && portal.selectedProject && portal.selectedProject.ownerId === portal.user?.id ? (
          <SectionCard title="Team" description="Invite team members to collaborate on this project.">
            {/* Accepted members */}
            {membersLoaded && members.filter((m) => m.acceptedAt !== null).length > 0 ? (
              <div className="space-y-2">
                {members.filter((m) => m.acceptedAt !== null).map((m) => (
                  <div key={m.id} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[var(--fyxvo-text)]">{m.user.displayName}</p>
                      <p className="font-mono text-xs text-[var(--fyxvo-text-muted)]">{shortenAddress(m.user.walletAddress, 6, 6)}</p>
                      <p className="text-xs text-[var(--fyxvo-text-muted)]">Accepted · {m.role}</p>
                    </div>
                    <Button size="sm" variant="danger" className="shrink-0 text-xs" disabled={removingMemberId === m.id} onClick={() => void handleRemoveMember(m.id)}>
                      {removingMemberId === m.id ? "…" : "Remove"}
                    </Button>
                  </div>
                ))}
              </div>
            ) : membersLoaded ? (
              <p className="text-sm text-[var(--fyxvo-text-muted)]">No accepted team members yet.</p>
            ) : (
              <p className="text-sm text-[var(--fyxvo-text-muted)]">Loading…</p>
            )}

            {/* Pending invitations */}
            {membersLoaded && pendingInvitations.length > 0 ? (
              <div className="border-t border-[var(--fyxvo-border)] pt-4 space-y-2">
                <p className="text-xs font-medium uppercase tracking-wider text-[var(--fyxvo-text-muted)]">Pending Invitations</p>
                {pendingInvitations.map((m) => (
                  <div key={m.id} className="flex items-center justify-between gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-xs text-[var(--fyxvo-text)]">
                        {m.user.walletAddress.slice(0, 8)}…{m.user.walletAddress.slice(-4)}
                      </p>
                      <p className="text-xs text-[var(--fyxvo-text-muted)]">
                        Invited on {new Date(m.invitedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="shrink-0 text-xs text-rose-500 hover:text-rose-400"
                      disabled={cancellingInviteId === m.id}
                      onClick={() => void handleCancelInvite(m.id)}
                    >
                      {cancellingInviteId === m.id ? "…" : "Cancel"}
                    </Button>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="border-t border-[var(--fyxvo-border)] pt-4 space-y-3">
              <p className="text-xs font-medium uppercase tracking-wider text-[var(--fyxvo-text-muted)]">Invite by wallet address</p>
              <div className="flex items-center gap-2">
                <Input value={inviteWallet} onChange={(e) => setInviteWallet(e.target.value)} placeholder="Wallet address (base58)" className="h-9 text-sm font-mono flex-1" />
                <Button variant="secondary" size="sm" onClick={() => void handleInviteMember()} disabled={inviteSaving || !inviteWallet}>
                  {inviteSaving ? "Inviting…" : "Invite"}
                </Button>
              </div>
            </div>

            <div className="border-t border-[var(--fyxvo-border)] pt-4 space-y-3">
              <p className="text-xs font-medium uppercase tracking-wider text-[var(--fyxvo-text-muted)]">Invite link</p>
              <p className="text-xs text-[var(--fyxvo-text-muted)]">Generate a shareable link that anyone can use to request access to this project.</p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void handleGenerateInviteLink()}
                disabled={inviteLinkLoading || !portal.selectedProject || !portal.token}
              >
                {inviteLinkLoading ? "Generating…" : "Generate invite link"}
              </Button>
              {inviteLinkUrl ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      readOnly
                      value={inviteLinkUrl}
                      className="flex-1 rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-3 py-2 font-mono text-xs text-[var(--fyxvo-text)] focus:outline-none"
                    />
                    <button
                      onClick={() => {
                        void navigator.clipboard.writeText(inviteLinkUrl);
                        setInviteLinkCopied(true);
                        setTimeout(() => setInviteLinkCopied(false), 2000);
                      }}
                      className="rounded border border-[var(--fyxvo-border)] px-2 py-1.5 text-xs text-[var(--fyxvo-text-muted)] hover:text-[var(--fyxvo-text)] transition-colors"
                    >
                      {inviteLinkCopied ? "Copied!" : "Copy"}
                    </button>
                  </div>
                  {inviteLinkExpiry ? (
                    <p className="text-xs text-[var(--fyxvo-text-muted)]">
                      Expires: {new Date(inviteLinkExpiry).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>

            {/* Transfer ownership */}
            {portal.user?.id === portal.selectedProject.ownerId ? (
              <div className="border-t border-[var(--fyxvo-border)] pt-4 space-y-3">
                <button
                  type="button"
                  onClick={() => setTransferOpen((prev) => !prev)}
                  className="flex w-full items-center justify-between text-xs font-medium uppercase tracking-wider text-[var(--fyxvo-text-muted)] hover:text-[var(--fyxvo-text)]"
                >
                  Transfer Ownership
                  <span aria-hidden="true">{transferOpen ? "▲" : "▼"}</span>
                </button>
                {transferOpen ? (
                  <div className="space-y-3">
                    {transferSuccess ? (
                      <p className="text-sm text-[var(--fyxvo-success)]">Ownership transferred successfully.</p>
                    ) : acceptedMembers.length === 0 ? (
                      <p className="text-sm text-[var(--fyxvo-text-muted)]">No accepted team members to transfer to.</p>
                    ) : (
                      <>
                        <div className="flex flex-col gap-1">
                          <label htmlFor="transfer-target" className="text-xs text-[var(--fyxvo-text-muted)]">
                            New owner
                          </label>
                          <select
                            id="transfer-target"
                            value={transferTargetId}
                            onChange={(e) => setTransferTargetId(e.target.value)}
                            className="rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-3 py-2 text-sm text-[var(--fyxvo-text)] focus:outline-none focus:ring-1 focus:ring-[var(--fyxvo-accent)]"
                          >
                            <option value="">Select a member…</option>
                            {acceptedMembers.map((m) => (
                              <option key={m.id} value={m.userId}>
                                {m.user.displayName} ({m.user.walletAddress.slice(0, 8)}…{m.user.walletAddress.slice(-4)})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="flex flex-col gap-1">
                          <label htmlFor="transfer-confirm" className="text-xs text-[var(--fyxvo-text-muted)]">
                            Type <span className="font-mono font-semibold text-[var(--fyxvo-text)]">{portal.selectedProject?.name}</span> to confirm
                          </label>
                          <Input
                            id="transfer-confirm"
                            value={transferConfirmText}
                            onChange={(e) => setTransferConfirmText(e.target.value)}
                            placeholder={portal.selectedProject?.name ?? "Project name"}
                            className="h-9 text-sm"
                          />
                        </div>
                        <Button
                          variant="danger"
                          size="sm"
                          disabled={
                            !transferTargetId ||
                            transferConfirmText !== portal.selectedProject?.name ||
                            transferring
                          }
                          onClick={() => void handleTransferOwnership()}
                        >
                          {transferring ? "Transferring…" : "Transfer Ownership"}
                        </Button>
                      </>
                    )}
                  </div>
                ) : null}
              </div>
            ) : null}
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
          <SettingRow label="Daily spending alert (SOL)" description="You will be notified when this project spends more than this amount in a single day.">
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="0"
                step="0.001"
                value={dailyCostAlertSol}
                onChange={(e) => setDailyCostAlertSol(e.target.value)}
                placeholder="0.01"
                className="h-9 w-28 text-sm"
                disabled={!portal.selectedProject || !portal.token}
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void saveDailyCostAlert()}
                disabled={dailyCostAlertSaving || !portal.selectedProject || !portal.token}
              >
                {dailyCostAlertSaving ? "Saving…" : "Save"}
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
                      notifPrefs[key] ? "bg-[var(--fyxvo-brand)]" : "bg-[var(--fyxvo-border-strong)]"
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
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[var(--fyxvo-text)]">Notification sound</p>
              <p className="text-xs text-[var(--fyxvo-text-muted)]">Play a subtle sound when new notifications arrive</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={soundEnabled}
              onClick={() => {
                const next = !soundEnabled;
                setSoundEnabled(next);
                localStorage.setItem("fyxvo_notification_sound", next ? "1" : "0");
              }}
              className={`relative inline-flex h-5 w-9 cursor-pointer rounded-full border-2 border-transparent transition-colors ${soundEnabled ? "bg-[var(--fyxvo-brand,#7c3aed)]" : "bg-[var(--fyxvo-border)]"}`}
            >
              <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition-transform ${soundEnabled ? "translate-x-4" : "translate-x-0"}`} />
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[var(--fyxvo-text)]">Weekly digest</p>
              <p className="text-xs text-[var(--fyxvo-text-muted)]">Receive a weekly summary of your project activity by email</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={digestEnabled}
              disabled={digestSaving || !isAuthenticated}
              onClick={() => void toggleDigest()}
              className={`relative inline-flex h-5 w-9 cursor-pointer rounded-full border-2 border-transparent transition-colors disabled:opacity-50 ${digestEnabled ? "bg-[var(--fyxvo-brand,#7c3aed)]" : "bg-[var(--fyxvo-border)]"}`}
            >
              <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition-transform ${digestEnabled ? "translate-x-4" : "translate-x-0"}`} />
            </button>
          </div>
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
                      ? "border-[var(--fyxvo-brand)]/50 bg-[var(--fyxvo-brand-subtle)] text-[var(--fyxvo-text)]"
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
