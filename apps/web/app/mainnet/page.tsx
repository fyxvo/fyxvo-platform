"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@fyxvo/ui";
import { LoadingSkeleton } from "../../components/loading-skeleton";
import { RetryBanner } from "../../components/retry-banner";
import { getMainnetReadinessGate } from "../../lib/api";
import { usePortal } from "../../lib/portal-context";
import type { MainnetReadinessSnapshot } from "../../lib/types";

function toDisplayStatus(status: string) {
  if (status === "healthy") {
    return { label: "Pass", className: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20" };
  }
  if (status === "needs_attention") {
    return { label: "In progress", className: "bg-amber-500/10 text-amber-300 border-amber-500/20" };
  }
  return { label: "Fail", className: "bg-rose-500/10 text-rose-300 border-rose-500/20" };
}

export default function MainnetPage() {
  const { token, user } = usePortal();
  const [snapshot, setSnapshot] = useState<MainnetReadinessSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const adminToken = user?.role === "ADMIN" || user?.role === "OWNER" ? token : null;

  const loadSnapshot = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const item = await getMainnetReadinessGate(adminToken);
      setSnapshot({
        ...item,
        checks: item.checks ?? [],
        paidBetaBlockers: item.paidBetaBlockers ?? [],
        mainnetBetaBlockers: item.mainnetBetaBlockers ?? [],
      });
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load the mainnet readiness gate."
      );
    } finally {
      setLoading(false);
    }
  }, [adminToken]);

  useEffect(() => {
    void loadSnapshot();
    const intervalId = window.setInterval(() => {
      void loadSnapshot();
    }, 60_000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [loadSnapshot]);

  const readinessPercentage = useMemo(() => {
    if (!snapshot || snapshot.checks.length === 0) return 0;
    const passing = snapshot.checks.filter((check) => check.status === "healthy").length;
    return Math.round((passing / snapshot.checks.length) * 100);
  }, [snapshot]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <p className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-brand)]">Mainnet gate</p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight text-[var(--fyxvo-text)]">
        Network readiness toward mainnet
      </h1>
      <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--fyxvo-text-soft)]">
        This page tracks the operational, protocol, treasury, and authority checks that must pass
        before Fyxvo can move beyond devnet private alpha. It is a public progress view first, and
        an admin operations surface second when an owner or admin wallet is connected.
      </p>

      {error ? (
        <div className="mt-8 max-w-3xl">
          <RetryBanner message={error} onRetry={loadSnapshot} />
        </div>
      ) : null}

      {loading && !snapshot ? (
        <div className="mt-10 space-y-4">
          <LoadingSkeleton className="h-32 rounded-[2rem]" />
          <LoadingSkeleton className="h-24 rounded-[2rem]" />
          <LoadingSkeleton className="h-96 rounded-[2rem]" />
        </div>
      ) : snapshot ? (
        <>
          <div className="mt-10 grid gap-4 md:grid-cols-4">
            <div className="rounded-3xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-6 md:col-span-2">
              <p className="text-xs uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">
                Overall readiness
              </p>
              <p className="mt-3 text-5xl font-semibold text-[var(--fyxvo-text)]">
                {readinessPercentage}%
              </p>
              <p className="mt-3 text-sm leading-6 text-[var(--fyxvo-text-soft)]">
                {snapshot.checks.filter((check) => check.status === "healthy").length} of{" "}
                {snapshot.checks.length} tracked checks are currently passing.
              </p>
            </div>
            <div className="rounded-3xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-6">
              <p className="text-xs uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">
                Paid beta gate
              </p>
              <p className="mt-3 text-2xl font-semibold text-[var(--fyxvo-text)]">
                {snapshot.paidBetaEligible ? "Ready" : "Blocked"}
              </p>
            </div>
            <div className="rounded-3xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-6">
              <p className="text-xs uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">
                Mainnet beta gate
              </p>
              <p className="mt-3 text-2xl font-semibold text-[var(--fyxvo-text)]">
                {snapshot.mainnetBetaEligible ? "Ready" : "Blocked"}
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-[2rem] border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-6">
              <h2 className="text-2xl font-semibold text-[var(--fyxvo-text)]">Readiness checklist</h2>
              <div className="mt-6 space-y-4">
                {snapshot.checks.map((check) => {
                  const status = toDisplayStatus(check.status);
                  return (
                    <div
                      key={check.key}
                      className="rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-base font-semibold text-[var(--fyxvo-text)]">
                            {check.label}
                          </p>
                          <p className="mt-2 text-sm leading-6 text-[var(--fyxvo-text-soft)]">
                            {check.detail}
                          </p>
                        </div>
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${status.className}`}
                        >
                          {status.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-[2rem] border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-6">
                <h2 className="text-2xl font-semibold text-[var(--fyxvo-text)]">Current posture</h2>
                <div className="mt-5 space-y-3 text-sm text-[var(--fyxvo-text-soft)]">
                  <p>Environment: {snapshot.environment}</p>
                  <p>Authority mode: {snapshot.authorityMode}</p>
                  <p>Protocol readiness: {snapshot.protocolReady ? "green" : "attention"}</p>
                  <p>Assistant availability: {snapshot.assistantAvailable ? "healthy" : "offline"}</p>
                  <p>Email delivery: {snapshot.emailDeliveryConfigured ? "configured" : "missing"}</p>
                  <p>Active incidents: {snapshot.activeIncidentCount}</p>
                  <p>
                    Confirmed reserve: {snapshot.confirmedFundingLamports} /{" "}
                    {snapshot.targetReserveLamports} lamports
                  </p>
                  <p>Gate armed: {snapshot.gate.armed ? "yes" : "no"}</p>
                </div>
              </div>

              <div className="rounded-[2rem] border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-6">
                <h2 className="text-2xl font-semibold text-[var(--fyxvo-text)]">Blockers</h2>
                <div className="mt-5 space-y-5">
                  <div>
                    <p className="text-sm font-semibold text-[var(--fyxvo-text)]">Paid beta</p>
                    {snapshot.paidBetaBlockers.length > 0 ? (
                      <div className="mt-2 space-y-2">
                        {snapshot.paidBetaBlockers.map((blocker) => (
                          <p key={blocker} className="text-sm leading-6 text-[var(--fyxvo-text-soft)]">
                            {blocker}
                          </p>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-sm leading-6 text-[var(--fyxvo-text-soft)]">
                        No paid beta blockers are currently recorded.
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--fyxvo-text)]">Mainnet beta</p>
                    {snapshot.mainnetBetaBlockers.length > 0 ? (
                      <div className="mt-2 space-y-2">
                        {snapshot.mainnetBetaBlockers.map((blocker) => (
                          <p key={blocker} className="text-sm leading-6 text-[var(--fyxvo-text-soft)]">
                            {blocker}
                          </p>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-sm leading-6 text-[var(--fyxvo-text-soft)]">
                        No mainnet beta blockers are currently recorded.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {snapshot.pendingMigrations ? (
                <div className="rounded-[2rem] border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-6">
                  <h2 className="text-2xl font-semibold text-[var(--fyxvo-text)]">Admin-only detail</h2>
                  <p className="mt-3 text-sm leading-6 text-[var(--fyxvo-text-soft)]">
                    Pending migrations detected: {snapshot.pendingMigrations.detected ? "yes" : "no"}.
                    {snapshot.pendingMigrations.detected
                      ? ` ${snapshot.pendingMigrations.count} migration${snapshot.pendingMigrations.count === 1 ? "" : "s"} still need to be applied.`
                      : " No unapplied migrations are recorded in this environment."}
                  </p>
                </div>
              ) : (
                <div className="rounded-[2rem] border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-6">
                  <p className="text-sm leading-6 text-[var(--fyxvo-text-soft)]">
                    Connect an owner or admin wallet to view internal gate details such as pending
                    migrations and operational notes.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/reliability">Read the reliability posture</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/operators">See the operator network</Link>
            </Button>
          </div>
        </>
      ) : null}
    </div>
  );
}
