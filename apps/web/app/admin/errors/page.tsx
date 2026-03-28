"use client";

import { useCallback, useEffect, useState } from "react";
import { LoadingSkeleton } from "../../../components/loading-skeleton";
import { RetryBanner } from "../../../components/retry-banner";
import { getAdminErrors } from "../../../lib/api";
import { usePortal } from "../../../lib/portal-context";
import type { AdminErrorEntry } from "../../../lib/types";

function statusTone(statusCode: number) {
  if (statusCode >= 500) {
    return "text-rose-300";
  }
  if (statusCode >= 400) {
    return "text-amber-300";
  }
  return "text-emerald-300";
}

export default function AdminErrorsPage() {
  const { token } = usePortal();
  const [items, setItems] = useState<AdminErrorEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadErrors = useCallback(async () => {
    if (!token) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      setItems(await getAdminErrors(token));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load server errors.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadErrors();
  }, [loadErrors]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--fyxvo-text)]">
          Server errors
        </h1>
        <p className="mt-2 text-sm leading-6 text-[var(--fyxvo-text-soft)]">
          This inbox shows the most recent unhandled API failures captured in production so the
          team can triage regressions without a separate hosted monitoring service.
        </p>
      </div>

      {error ? <RetryBanner message={error} onRetry={loadErrors} /> : null}

      {loading && items.length === 0 ? (
        <div className="space-y-4">
          <LoadingSkeleton className="h-32 rounded-[2rem]" />
          <LoadingSkeleton className="h-96 rounded-[2rem]" />
        </div>
      ) : (
        <div className="space-y-4">
          {items.length > 0 ? (
            items.map((item) => (
              <div
                key={item.id}
                className="rounded-[2rem] border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-6"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-[var(--fyxvo-text)]">
                      {item.method} {item.route}
                    </p>
                    <p className={`text-sm font-medium ${statusTone(item.statusCode)}`}>
                      Status {item.statusCode}
                    </p>
                    <p className="text-sm leading-6 text-[var(--fyxvo-text-soft)]">{item.message}</p>
                  </div>
                  <div className="space-y-1 text-xs text-[var(--fyxvo-text-muted)]">
                    <p>{new Date(item.createdAt).toLocaleString()}</p>
                    <p>Request ID: {item.requestId ?? "not recorded"}</p>
                    <p>User agent: {item.userAgent ?? "not recorded"}</p>
                  </div>
                </div>
                {item.stack ? (
                  <pre className="mt-4 overflow-x-auto rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4 text-xs leading-6 text-[var(--fyxvo-text-soft)]">
                    <code>{item.stack}</code>
                  </pre>
                ) : null}
              </div>
            ))
          ) : (
            <div className="rounded-[2rem] border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-6 text-sm leading-6 text-[var(--fyxvo-text-soft)]">
              No server-side error entries are currently stored.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
