"use client";

import { Badge, Button, Modal, Notice } from "@fyxvo/ui";
import { useEffect, useState } from "react";
import { AuthGate } from "../../components/state-panels";
import { listApiKeys } from "../../lib/api";
import { usePortal } from "../../lib/portal-context";
import type { PortalApiKey } from "../../lib/types";

const DEFAULT_LABEL = "Priority relay";
const DEFAULT_COLOR = "violet";
const DEFAULT_SCOPES = ["project:read", "rpc:request", "priority:relay"];

function ApiKeyRow({
  apiKey,
  onRevoke,
}: {
  apiKey: PortalApiKey;
  onRevoke: (id: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-[var(--fyxvo-text)]">{apiKey.label}</span>
          <Badge tone={apiKey.status === "ACTIVE" ? "success" : "neutral"}>
            {apiKey.status}
          </Badge>
        </div>
        <p className="mt-1 font-mono text-xs text-[var(--fyxvo-text-muted)]">{apiKey.prefix}…</p>
        <div className="mt-1 flex flex-wrap gap-1">
          {apiKey.scopes.map((scope) => (
            <span
              key={scope}
              className="inline-flex items-center rounded-full border border-[var(--fyxvo-border)] px-2 py-0.5 text-xs text-[var(--fyxvo-text-muted)]"
            >
              {scope}
            </span>
          ))}
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onRevoke(apiKey.id)}
        className="text-rose-400 hover:text-rose-300"
      >
        Revoke
      </Button>
    </div>
  );
}

export default function ApiKeysPage() {
  const { selectedProject, token, createApiKey } = usePortal();

  const [keys, setKeys] = useState<PortalApiKey[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [label, setLabel] = useState(DEFAULT_LABEL);
  const [colorTag] = useState(DEFAULT_COLOR);
  const [scopes] = useState<string[]>(DEFAULT_SCOPES);
  const [generating, setGenerating] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedProject || !token) return;
    setLoading(true);
    listApiKeys({ projectId: selectedProject.id, token })
      .then((k) => setKeys(k))
      .catch(() => setKeys([]))
      .finally(() => setLoading(false));
  }, [selectedProject, token]);

  const handleOpenModal = () => {
    setLabel(DEFAULT_LABEL);
    setGeneratedKey(null);
    setModalError(null);
    setShowModal(true);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setModalError(null);
    try {
      const result = await createApiKey({ label, colorTag, scopes });
      setGeneratedKey(result.plainTextKey);
      setKeys((prev) => [...prev, result.item]);
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "Failed to generate key");
    } finally {
      setGenerating(false);
    }
  };

  const handleRevoke = async (keyId: string) => {
    if (!selectedProject || !token) return;
    const { revokeApiKey } = await import("../../lib/api");
    await revokeApiKey({ projectId: selectedProject.id, keyId, token });
    setKeys((prev) => prev.filter((k) => k.id !== keyId));
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <AuthGate>
        <div className="space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-[var(--fyxvo-text)]">
                API Keys
              </h1>
              <p className="mt-1 text-sm text-[var(--fyxvo-text-muted)]">
                Manage authentication keys for your project.
              </p>
            </div>
            <Button variant="primary" onClick={handleOpenModal}>
              Generate key
            </Button>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="h-20 animate-pulse rounded-xl bg-[var(--fyxvo-panel-soft)]"
                />
              ))}
            </div>
          ) : keys.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-[var(--fyxvo-text-muted)]">No API keys yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {keys.map((k) => (
                <ApiKeyRow key={k.id} apiKey={k} onRevoke={(id) => void handleRevoke(id)} />
              ))}
            </div>
          )}
        </div>

        <Modal
          open={showModal}
          onClose={() => {
            setShowModal(false);
            setGeneratedKey(null);
          }}
          title="Generate an API key"
          description="Create a new key to authenticate requests to Fyxvo."
          footer={
            generatedKey ? (
              <Button variant="secondary" onClick={() => setShowModal(false)}>
                Done
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={() => void handleGenerate()}
                  loading={generating}
                  disabled={generating || !label.trim()}
                >
                  Generate
                </Button>
              </div>
            )
          }
        >
          {generatedKey ? (
            <div className="space-y-4">
              <Notice tone="success">New API key generated</Notice>
              <div className="space-y-1">
                <p className="text-xs text-[var(--fyxvo-text-muted)]">
                  Copy this key — it will not be shown again.
                </p>
                <div className="flex items-center gap-2 rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 py-3">
                  <code className="flex-1 font-mono text-sm text-[var(--fyxvo-text)] break-all">
                    {generatedKey}
                  </code>
                  <button
                    type="button"
                    onClick={() => void navigator.clipboard.writeText(generatedKey)}
                    className="text-xs text-[var(--fyxvo-text-muted)] hover:text-[var(--fyxvo-text)] transition-colors"
                    aria-label="Copy key"
                  >
                    Copy
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {modalError ? <Notice tone="danger">{modalError}</Notice> : null}
              <div className="space-y-1.5">
                <label
                  htmlFor="key-label"
                  className="text-sm font-medium text-[var(--fyxvo-text)]"
                >
                  Label
                </label>
                <input
                  id="key-label"
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  className="h-11 w-full rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 text-sm text-[var(--fyxvo-text)] outline-none focus:border-[var(--fyxvo-brand)] focus:ring-2 focus:ring-[var(--fyxvo-brand)]/30"
                />
              </div>
              <div className="space-y-1.5">
                <p className="text-sm font-medium text-[var(--fyxvo-text)]">Scopes</p>
                <div className="flex flex-wrap gap-2">
                  {scopes.map((scope) => (
                    <span
                      key={scope}
                      className="inline-flex items-center rounded-full border border-[var(--fyxvo-brand)]/30 bg-[var(--fyxvo-brand)]/10 px-3 py-1 text-xs text-[var(--fyxvo-brand)]"
                    >
                      {scope}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </Modal>
      </AuthGate>
    </div>
  );
}
