"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@fyxvo/ui";
import { LoadingSkeleton } from "../../../components/loading-skeleton";
import { RetryBanner } from "../../../components/retry-banner";
import { AuthGate, EmptyState } from "../../../components/state-panels";
import { getMyOperatorRegistrations } from "../../../lib/api";
import { usePortal } from "../../../lib/portal-context";
import type { OperatorRegistration } from "../../../lib/types";

function statusCopy(registration: OperatorRegistration) {
  switch (registration.status) {
    case "approved":
      return "This operator registration has been approved and the node is eligible for active routing in the network.";
    case "rejected":
      return registration.rejectionReason?.trim()
        ? `This registration was rejected. Reason: ${registration.rejectionReason}`
        : "This registration was rejected during review.";
    default:
      return "This registration is waiting for review. The team will verify endpoint quality, region coverage, and operational readiness before approval.";
  }
}

function statusTone(status: string) {
  if (status === "approved") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  if (status === "rejected") return "border-rose-500/30 bg-rose-500/10 text-rose-300";
  return "border-amber-500/30 bg-amber-500/10 text-amber-300";
}

export default function OperatorDashboardPage() {
  const { token, user } = usePortal();
  const [items, setItems] = useState<OperatorRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRegistrations = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);

    try {
      setItems(await getMyOperatorRegistrations(token));
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load operator registrations for this wallet."
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadRegistrations();
  }, [loadRegistrations]);

  const latest = useMemo(() => items[0] ?? null, [items]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <AuthGate message="Connect the wallet you used for operator onboarding to view your registration status.">
        <div className="space-y-6">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-brand)]">
              Node operator
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--fyxvo-text)]">
              Operator dashboard
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--fyxvo-text-soft)]">
              This page shows the operator registrations associated with wallet{" "}
              <span className="font-medium text-[var(--fyxvo-text)]">{user?.walletAddress}</span>.
            </p>
          </div>

          {error ? <RetryBanner message={error} onRetry={() => void loadRegistrations()} /> : null}

          {loading && !latest ? (
            <div className="space-y-4">
              <LoadingSkeleton className="h-28 rounded-3xl" />
              <LoadingSkeleton className="h-64 rounded-3xl" />
            </div>
          ) : null}

          {!loading && !latest ? (
            <EmptyState
              title="No operator registration found"
              description="This wallet does not have an operator registration yet. Complete the public registration form first, then come back here to track approval."
              action={
                <Button asChild>
                  <Link href="/operators">Complete operator registration</Link>
                </Button>
              }
            />
          ) : null}

          {latest ? (
            <>
              <div className="rounded-3xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">
                      Latest registration
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold text-[var(--fyxvo-text)]">
                      {latest.name}
                    </h2>
                  </div>
                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${statusTone(latest.status)}`}
                  >
                    {latest.status}
                  </span>
                </div>
                <p className="mt-4 text-sm leading-6 text-[var(--fyxvo-text-soft)]">
                  {statusCopy(latest)}
                </p>
              </div>

              <div className="grid gap-5 lg:grid-cols-2">
                <div className="rounded-3xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-6">
                  <p className="text-xs uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">
                    Registration details
                  </p>
                  <dl className="mt-4 space-y-4 text-sm">
                    <div>
                      <dt className="text-[var(--fyxvo-text-muted)]">Registration ID</dt>
                      <dd className="mt-1 break-all text-[var(--fyxvo-text)]">{latest.id}</dd>
                    </div>
                    <div>
                      <dt className="text-[var(--fyxvo-text-muted)]">Endpoint</dt>
                      <dd className="mt-1 break-all text-[var(--fyxvo-text)]">{latest.endpoint}</dd>
                    </div>
                    <div>
                      <dt className="text-[var(--fyxvo-text-muted)]">Region</dt>
                      <dd className="mt-1 text-[var(--fyxvo-text)]">{latest.region}</dd>
                    </div>
                    <div>
                      <dt className="text-[var(--fyxvo-text-muted)]">Contact</dt>
                      <dd className="mt-1 text-[var(--fyxvo-text)]">{latest.contact}</dd>
                    </div>
                    <div>
                      <dt className="text-[var(--fyxvo-text-muted)]">Submitted</dt>
                      <dd className="mt-1 text-[var(--fyxvo-text)]">
                        {new Date(latest.createdAt).toLocaleString()}
                      </dd>
                    </div>
                    {latest.approvedAt ? (
                      <div>
                        <dt className="text-[var(--fyxvo-text-muted)]">Approved</dt>
                        <dd className="mt-1 text-[var(--fyxvo-text)]">
                          {new Date(latest.approvedAt).toLocaleString()}
                        </dd>
                      </div>
                    ) : null}
                  </dl>
                </div>

                <div className="rounded-3xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-6">
                  <p className="text-xs uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">
                    What happens next
                  </p>
                  <p className="mt-4 text-sm leading-7 text-[var(--fyxvo-text-soft)]">
                    Pending registrations stay in review until the team validates endpoint
                    reliability and confirms how the node fits into current devnet coverage. Once
                    approved, the endpoint is activated in the upstream pool and begins serving
                    relay traffic through the gateway routing layer.
                  </p>
                  <p className="mt-4 text-sm leading-7 text-[var(--fyxvo-text-soft)]">
                    If you need to update your endpoint or contact details, submit a fresh
                    registration from the public operators page so the latest node metadata is
                    available during review.
                  </p>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <Button asChild>
                      <Link href="/operators">Open registration form</Link>
                    </Button>
                    <Button asChild variant="secondary">
                      <Link href="/docs">Read operator documentation</Link>
                    </Button>
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </AuthGate>
    </div>
  );
}
