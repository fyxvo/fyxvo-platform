"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@fyxvo/ui";
import { createSavedView, deleteSavedView, listSavedViews, updateSavedView } from "../lib/api";
import type { SavedViewRecord } from "../lib/types";

export function SavedViewBar({
  kind,
  token,
  projectId,
  filters,
  hasActiveQuery,
  onApply,
}: {
  readonly kind: SavedViewRecord["kind"];
  readonly token: string;
  readonly projectId?: string;
  readonly filters: Record<string, unknown>;
  readonly hasActiveQuery: boolean;
  readonly onApply: (filters: Record<string, unknown>) => void;
}) {
  const [views, setViews] = useState<SavedViewRecord[]>([]);
  const [name, setName] = useState("");
  const [selectedId, setSelectedId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const appliedDefaultRef = useRef(false);
  const onApplyRef = useRef(onApply);

  useEffect(() => {
    onApplyRef.current = onApply;
  }, [onApply]);

  useEffect(() => {
    let cancelled = false;
    listSavedViews(token, { kind, ...(projectId ? { projectId } : {}) })
      .then((response) => {
        if (cancelled) return;
        setViews(response.items);
        if (!selectedId && response.items[0]) {
          setSelectedId(response.items[0].id);
        }
        const defaultView = response.items.find((item) => item.isDefault);
        if (defaultView && !hasActiveQuery && !appliedDefaultRef.current) {
          appliedDefaultRef.current = true;
          onApplyRef.current(defaultView.filters);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [hasActiveQuery, kind, projectId, selectedId, token]);

  const selectedView = useMemo(
    () => views.find((item) => item.id === selectedId) ?? null,
    [selectedId, views]
  );

  async function refreshViews() {
    const response = await listSavedViews(token, { kind, ...(projectId ? { projectId } : {}) });
    setViews(response.items);
    if (!selectedId && response.items[0]) {
      setSelectedId(response.items[0].id);
    }
  }

  async function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) return;
    const response = await createSavedView(
      {
        kind,
        name: trimmed,
        filters,
        ...(projectId ? { projectId } : {}),
      },
      token
    );
    setName("");
    setSelectedId(response.item.id);
    await refreshViews();
  }

  async function handleSetDefault() {
    if (!selectedView) return;
    await updateSavedView(selectedView.id, { isDefault: true }, token);
    await refreshViews();
  }

  async function handleDelete() {
    if (!selectedView) return;
    await deleteSavedView(selectedView.id, token);
    setSelectedId("");
    await refreshViews();
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
        <label className="space-y-1 text-xs text-[var(--fyxvo-text-muted)]">
          <span>Saved views</span>
          <select
            value={selectedId}
            onChange={(event) => setSelectedId(event.target.value)}
            className="h-10 w-full rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)] px-3 text-sm text-[var(--fyxvo-text)]"
          >
            <option value="">{loading ? "Loading views…" : "Select a saved view"}</option>
            {views.map((view) => (
              <option key={view.id} value={view.id}>
                {view.name}{view.isDefault ? " · default" : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-xs text-[var(--fyxvo-text-muted)]">
          <span>Save current filters</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={kind === "alerts" ? "High error rate alerts" : "Priority relay failures"}
            className="h-10 w-full rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)] px-3 text-sm text-[var(--fyxvo-text)]"
          />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="secondary" onClick={() => selectedView ? onApply(selectedView.filters) : undefined} disabled={!selectedView}>
          Load view
        </Button>
        <Button size="sm" variant="secondary" onClick={() => void handleSetDefault()} disabled={!selectedView}>
          Set default
        </Button>
        <Button size="sm" variant="ghost" onClick={() => void handleDelete()} disabled={!selectedView}>
          Delete
        </Button>
        <Button size="sm" onClick={() => void handleSave()} disabled={!name.trim()}>
          Save view
        </Button>
      </div>
    </div>
  );
}
