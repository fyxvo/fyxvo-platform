"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Notice } from "@fyxvo/ui";
import { LoadingSkeleton } from "../../../components/loading-skeleton";
import { RetryBanner } from "../../../components/retry-banner";
import {
  approveOperatorRegistration,
  getAdminOperators,
  rejectOperatorRegistration,
} from "../../../lib/api";
import { usePortal } from "../../../lib/portal-context";
import type { OperatorRegistration } from "../../../lib/types";

export default function AdminOperatorsPage() {
  const { token } = usePortal();
  const [registrations, setRegistrations] = useState<OperatorRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [rejectReasons, setRejectReasons] = useState<Record<string, string>>({});

  const loadRegistrations = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);

    try {
      const response = await getAdminOperators(token);
      setRegistrations(response.items);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load operator registrations.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadRegistrations();
  }, [loadRegistrations]);

  const grouped = useMemo(() => {
    return {
      pending: registrations.filter((item) => item.status === "pending"),
      approved: registrations.filter((item) => item.status === "approved"),
      rejected: registrations.filter((item) => item.status === "rejected"),
    };
  }, [registrations]);

  async function handleApprove(registrationId: string) {
    if (!token) return;
    setActioningId(registrationId);
    setError(null);
    setNotice(null);

    try {
      const response = await approveOperatorRegistration({ registrationId, token });
      setNotice(
        `Operator registration approved. Node ${response.item.nodeId} is now ${response.item.nodeStatus.toLowerCase()} in the pool.`
      );
      await loadRegistrations();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Unable to approve this operator.");
    } finally {
      setActioningId(null);
    }
  }

  async function handleReject(registrationId: string) {
    if (!token) return;
    setActioningId(registrationId);
    setError(null);
    setNotice(null);

    try {
      const reason = rejectReasons[registrationId]?.trim();
      await rejectOperatorRegistration({
        registrationId,
        token,
        ...(reason ? { reason } : {}),
      });
      setNotice("Operator registration rejected.");
      await loadRegistrations();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Unable to reject this operator.");
    } finally {
      setActioningId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--fyxvo-text)]">
          Operator management
        </h1>
        <p className="mt-2 text-sm leading-6 text-[var(--fyxvo-text-soft)]">
          Review every operator registration, approve qualified endpoints into the upstream node
          pool, and reject registrations that do not meet the current rollout requirements.
        </p>
      </div>

      {error ? <RetryBanner message={error} onRetry={loadRegistrations} /> : null}
      {notice ? <Notice tone="success">{notice}</Notice> : null}

      {loading && registrations.length === 0 ? (
        <div className="space-y-4">
          <LoadingSkeleton className="h-32 rounded-[2rem]" />
          <LoadingSkeleton className="h-40 rounded-[2rem]" />
        </div>
      ) : (
        <div className="space-y-6">
          {(["pending", "approved", "rejected"] as const).map((group) => (
            <section key={group} className="rounded-[2rem] border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-6">
              <h2 className="text-xl font-semibold capitalize text-[var(--fyxvo-text)]">{group}</h2>
              <div className="mt-4 space-y-4">
                {grouped[group].length > 0 ? (
                  grouped[group].map((registration) => {
                    const endpointHost = (() => {
                      try {
                        return new URL(registration.endpoint).hostname;
                      } catch {
                        return registration.endpoint;
                      }
                    })();

                    return (
                      <div
                        key={registration.id}
                        className="rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4"
                      >
                        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                          <div className="space-y-2">
                            <p className="text-base font-semibold text-[var(--fyxvo-text)]">
                              {registration.name}
                            </p>
                            <p className="text-sm text-[var(--fyxvo-text-soft)]">
                              {endpointHost} · {registration.region}
                            </p>
                            <p className="text-sm text-[var(--fyxvo-text-soft)]">
                              Wallet: {registration.operatorWalletAddress}
                            </p>
                            <p className="text-sm text-[var(--fyxvo-text-soft)]">
                              Submitted: {new Date(registration.createdAt).toLocaleString()}
                            </p>
                            {registration.approvedAt ? (
                              <p className="text-sm text-[var(--fyxvo-text-soft)]">
                                Approved: {new Date(registration.approvedAt).toLocaleString()}
                              </p>
                            ) : null}
                            {registration.rejectionReason ? (
                              <p className="text-sm text-rose-300">
                                Reason: {registration.rejectionReason}
                              </p>
                            ) : null}
                          </div>

                          {registration.status === "pending" ? (
                            <div className="w-full max-w-sm space-y-3">
                              <input
                                value={rejectReasons[registration.id] ?? ""}
                                onChange={(event) =>
                                  setRejectReasons((current) => ({
                                    ...current,
                                    [registration.id]: event.target.value,
                                  }))
                                }
                                placeholder="Optional rejection reason"
                                className="h-11 w-full rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)] px-4 text-sm text-[var(--fyxvo-text)] outline-none focus:border-[var(--fyxvo-brand)]"
                              />
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  type="button"
                                  loading={actioningId === registration.id}
                                  onClick={() => void handleApprove(registration.id)}
                                >
                                  Approve
                                </Button>
                                <Button
                                  type="button"
                                  variant="secondary"
                                  disabled={actioningId === registration.id}
                                  onClick={() => void handleReject(registration.id)}
                                >
                                  Reject
                                </Button>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-[var(--fyxvo-text-soft)]">
                    No {group} operator registrations are currently recorded.
                  </p>
                )}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
