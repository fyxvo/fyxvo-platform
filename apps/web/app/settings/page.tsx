"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Notice } from "@fyxvo/ui";
import { LoadingSkeleton } from "../../components/loading-skeleton";
import { RetryBanner } from "../../components/retry-banner";
import { AuthGate } from "../../components/state-panels";
import {
  enrollDigest,
  getEmailDeliveryStatus,
  getNotificationPreferences,
  requestEmailVerification,
  sendEmailDeliveryTest,
  unenrollDigest,
  updateNotificationPreferences,
} from "../../lib/api";
import { usePortal } from "../../lib/portal-context";
import type { EmailDeliveryStatus, NotificationPreferences } from "../../lib/types";

const TABS = ["notifications", "email", "digest"] as const;
const NOTIFICATION_FIELDS = [
  ["notifyProjectActivation", "Project activation"],
  ["notifyApiKeyEvents", "API key events"],
  ["notifyFundingConfirmed", "Funding confirmed"],
  ["notifyLowBalance", "Low balance"],
  ["notifyDailyAlert", "Daily alerts"],
  ["notifyWeeklySummary", "Weekly summary"],
  ["notifyReferralConversion", "Referral conversion"],
] as const;

export default function SettingsPage() {
  const { token } = usePortal();
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>("notifications");
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [emailStatus, setEmailStatus] = useState<EmailDeliveryStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);

    try {
      const [prefs, delivery] = await Promise.all([
        getNotificationPreferences(token),
        getEmailDeliveryStatus(token),
      ]);
      setPreferences(prefs);
      setEmailStatus(delivery);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load settings.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const canTestDelivery = useMemo(
    () => Boolean(emailStatus?.configured && emailStatus.emailVerified),
    [emailStatus]
  );

  async function saveNotifications() {
    if (!token || !preferences) return;
    setSaving(true);
    setNotice(null);
    setError(null);

    try {
      await updateNotificationPreferences({ token, ...preferences });
      setNotice("Notification preferences saved.");
      const delivery = await getEmailDeliveryStatus(token);
      setEmailStatus(delivery);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save preferences.");
    } finally {
      setSaving(false);
    }
  }

  async function handleVerifyEmail() {
    if (!token) return;
    setSaving(true);
    setNotice(null);
    setError(null);

    try {
      const response = await requestEmailVerification(token);
      setNotice(response.message ?? "Verification email requested.");
      const delivery = await getEmailDeliveryStatus(token);
      setEmailStatus(delivery);
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "Unable to request verification."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleTestDelivery() {
    if (!token) return;
    setSaving(true);
    setNotice(null);
    setError(null);

    try {
      const response = await sendEmailDeliveryTest(token);
      setNotice(response.message ?? "Test email sent.");
      const delivery = await getEmailDeliveryStatus(token);
      setEmailStatus(delivery);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to send test email.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDigest(enabled: boolean) {
    if (!token) return;
    setSaving(true);
    setNotice(null);
    setError(null);

    try {
      if (enabled) {
        await enrollDigest(token);
        setNotice("Digest enrollment enabled.");
      } else {
        await unenrollDigest(token);
        setNotice("Digest enrollment removed.");
      }

      const delivery = await getEmailDeliveryStatus(token);
      setEmailStatus(delivery);
    } catch (digestError) {
      setError(digestError instanceof Error ? digestError.message : "Unable to update digest.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <AuthGate>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--fyxvo-text)]">
              Settings
            </h1>
            <p className="mt-1 text-sm text-[var(--fyxvo-text-muted)]">
              Manage notification preferences, email verification, and weekly digest delivery.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? "bg-[var(--fyxvo-brand)] text-black"
                    : "border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] text-[var(--fyxvo-text-muted)] hover:text-[var(--fyxvo-text)]"
                }`}
              >
                {tab[0]!.toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {error ? <RetryBanner message={error} onRetry={() => void loadSettings()} /> : null}
          {notice ? <Notice tone="success">{notice}</Notice> : null}

          {loading || !preferences || !emailStatus ? (
            <div className="space-y-4">
              <LoadingSkeleton className="h-24 rounded-2xl" />
              <LoadingSkeleton className="h-72 rounded-2xl" />
            </div>
          ) : (
            <div className="rounded-[2rem] border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-6">
              {activeTab === "notifications" ? (
                <div className="space-y-5">
                  <h2 className="text-xl font-semibold text-[var(--fyxvo-text)]">Notifications</h2>
                  <label className="block">
                    <span className="text-sm font-medium text-[var(--fyxvo-text)]">Email</span>
                    <input
                      type="email"
                      value={preferences.email ?? ""}
                      onChange={(event) =>
                        setPreferences((current) =>
                          current ? { ...current, email: event.target.value || null } : current
                        )
                      }
                      className="mt-2 h-11 w-full rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 text-sm text-[var(--fyxvo-text)] outline-none focus:border-[var(--fyxvo-brand)]"
                    />
                  </label>

                  <div className="grid gap-3 md:grid-cols-2">
                    {NOTIFICATION_FIELDS.map(([key, label]) => (
                      <label
                        key={key}
                        className="flex items-center gap-3 rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 py-3 text-sm text-[var(--fyxvo-text)]"
                      >
                        <input
                          type="checkbox"
                          checked={preferences[key as keyof NotificationPreferences] as boolean}
                          onChange={(event) =>
                            setPreferences((current) =>
                              current
                                ? {
                                    ...current,
                                    [key]: event.target.checked,
                                  }
                                : current
                            )
                          }
                        />
                        {label}
                      </label>
                    ))}
                  </div>

                  <Button type="button" onClick={() => void saveNotifications()} loading={saving}>
                    Save notifications
                  </Button>
                </div>
              ) : null}

              {activeTab === "email" ? (
                <div className="space-y-5">
                  <h2 className="text-xl font-semibold text-[var(--fyxvo-text)]">Email</h2>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4">
                      <p className="text-xs uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">
                        Delivery provider
                      </p>
                      <p className="mt-2 text-lg font-semibold text-[var(--fyxvo-text)]">
                        {emailStatus.provider}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4">
                      <p className="text-xs uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">
                        Email status
                      </p>
                      <p className="mt-2 text-lg font-semibold text-[var(--fyxvo-text)]">
                        {emailStatus.emailVerified ? "Verified" : "Unverified"}
                      </p>
                    </div>
                  </div>

                  <p className="text-sm leading-6 text-[var(--fyxvo-text-soft)]">
                    Verification emails are sent to the address stored in notification preferences.
                    Test delivery is only enabled after the address is verified.
                  </p>

                  <div className="flex flex-wrap gap-3">
                    <Button
                      type="button"
                      onClick={() => void handleVerifyEmail()}
                      loading={saving}
                    >
                      Verify email
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => void handleTestDelivery()}
                      disabled={!canTestDelivery || saving}
                    >
                      Test delivery
                    </Button>
                  </div>
                </div>
              ) : null}

              {activeTab === "digest" ? (
                <div className="space-y-5">
                  <h2 className="text-xl font-semibold text-[var(--fyxvo-text)]">Digest</h2>
                  <p className="text-sm leading-6 text-[var(--fyxvo-text-soft)]">
                    Weekly digests summarize request activity, alerts, and the current state of
                    your workspace email delivery.
                  </p>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4">
                      <p className="text-xs uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">
                        Digest enrollment
                      </p>
                      <p className="mt-2 text-lg font-semibold text-[var(--fyxvo-text)]">
                        {emailStatus.digestEnabled ? "Enabled" : "Disabled"}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4">
                      <p className="text-xs uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">
                        Next send
                      </p>
                      <p className="mt-2 text-sm font-medium text-[var(--fyxvo-text)]">
                        {emailStatus.digestNextSendAt
                          ? new Date(emailStatus.digestNextSendAt).toLocaleString()
                          : "Not scheduled"}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Button
                      type="button"
                      onClick={() => void handleDigest(true)}
                      disabled={emailStatus.digestEnabled || saving}
                    >
                      Enroll
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => void handleDigest(false)}
                      disabled={!emailStatus.digestEnabled || saving}
                    >
                      Unenroll
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </AuthGate>
    </div>
  );
}
