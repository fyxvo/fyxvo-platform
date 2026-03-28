"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Notice } from "@fyxvo/ui";
import { LoadingSkeleton } from "../../../components/loading-skeleton";
import { RetryBanner } from "../../../components/retry-banner";
import { getFeedbackInbox, reviewFeedbackInboxItem } from "../../../lib/api";
import { usePortal } from "../../../lib/portal-context";
import type { FeedbackInboxItem } from "../../../lib/types";

export default function AdminFeedbackPage() {
  const { token } = usePortal();
  const [items, setItems] = useState<FeedbackInboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  const loadInbox = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);

    try {
      setItems(await getFeedbackInbox({ token }));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load the feedback inbox.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadInbox();
  }, [loadInbox]);

  async function handleMarkReviewed(item: FeedbackInboxItem) {
    if (!token) return;
    setReviewingId(item.id);
    setError(null);
    setNotice(null);

    try {
      await reviewFeedbackInboxItem({
        token,
        itemType: item.type,
        itemId: item.id,
        status: "reviewed",
      });
      setNotice("Feedback item marked as reviewed.");
      await loadInbox();
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : "Unable to update this feedback item.");
    } finally {
      setReviewingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--fyxvo-text)]">
          Feedback inbox
        </h1>
        <p className="mt-2 text-sm leading-6 text-[var(--fyxvo-text-soft)]">
          The inbox combines direct product feedback, support demand, assistant feedback,
          newsletter signups, and converted referrals so the team can review incoming signals in
          one place.
        </p>
      </div>

      {error ? <RetryBanner message={error} onRetry={loadInbox} /> : null}
      {notice ? <Notice tone="success">{notice}</Notice> : null}

      {loading && items.length === 0 ? (
        <div className="space-y-4">
          <LoadingSkeleton className="h-32 rounded-[2rem]" />
          <LoadingSkeleton className="h-32 rounded-[2rem]" />
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <div
              key={`${item.type}-${item.id}`}
              className="rounded-[2rem] border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-6"
            >
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">
                    {item.type.replace(/_/g, " ")}
                  </p>
                  <h2 className="mt-2 text-xl font-semibold text-[var(--fyxvo-text)]">{item.title}</h2>
                  <p className="mt-3 text-sm leading-6 text-[var(--fyxvo-text-soft)]">{item.summary}</p>
                  <p className="mt-3 text-sm text-[var(--fyxvo-text-muted)]">
                    {item.actor} · {item.source} · {new Date(item.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex flex-col items-start gap-3">
                  <span className="rounded-full border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-3 py-1 text-xs font-medium text-[var(--fyxvo-text)]">
                    {item.status}
                  </span>
                  <Button
                    type="button"
                    variant="secondary"
                    loading={reviewingId === item.id}
                    onClick={() => void handleMarkReviewed(item)}
                  >
                    Mark reviewed
                  </Button>
                </div>
              </div>
            </div>
          ))}

          {!loading && items.length === 0 ? (
            <p className="text-sm text-[var(--fyxvo-text-soft)]">
              No feedback items are currently returned by the backend.
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
