"use client";

import { useState } from "react";
import { Modal, Notice, Badge } from "@fyxvo/ui";
import { usePortal } from "../../components/portal-provider";
import { AuthGate } from "../../components/state-panels";
import { CopyButton } from "../../components/copy-button";
import { PageHeader } from "../../components/page-header";
import { formatRelativeDate } from "../../lib/format";
import type { PortalApiKey } from "../../lib/types";

const SCOPE_OPTIONS = [
  { value: "project:read", label: "project:read" },
  { value: "rpc:request", label: "rpc:request" },
  { value: "priority:relay", label: "priority:relay" },
  { value: "analytics:read", label: "analytics:read" },
  { value: "webhooks:write", label: "webhooks:write" },
] as const;

function exportApiKeyMetadata(keys: readonly PortalApiKey[]) {
  const data = keys.map((k) => ({
    label: k.label,
    prefix: k.prefix,
    scopes: k.scopes,
    createdAt: k.createdAt,
    lastUsedAt: k.lastUsedAt,
    status: k.status,
  }));
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "api-keys.json";
  a.click();
  URL.revokeObjectURL(url);
}

function GenerateKeyModal({
  open,
  onClose,
  onSubmit,
  submitting,
  lastGeneratedKey,
}: {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onSubmit: (label: string, colorTag: string, scopes: string[]) => Promise<void>;
  readonly submitting: boolean;
  readonly lastGeneratedKey: string | null;
}) {
  const [label, setLabel] = useState("Priority relay");
  const [colorTag] = useState("violet");
  const [scopes, setScopes] = useState<string[]>(["project:read", "rpc:request", "priority:relay"]);
  const [submitted, setSubmitted] = useState(false);

  function toggleScope(scope: string) {
    setScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  }

  async function handleSubmit() {
    if (!label.trim() || scopes.length === 0) return;
    await onSubmit(label.trim(), colorTag, scopes);
    setSubmitted(true);
  }

  function handleClose() {
    setLabel("Priority relay");
    setScopes(["project:read", "rpc:request", "priority:relay"]);
    setSubmitted(false);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Generate an API key"
      description="A new key will be generated for the selected project. The full key value is only shown once."
    >
      {submitted && lastGeneratedKey ? (
        <div className="space-y-4">
          <Notice tone="success" title="New API key generated">
            Copy this key now. It will not be shown again after you close this dialog.
          </Notice>
          <div className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3">
            <code className="flex-1 break-all font-mono text-xs text-[#f1f5f9]">
              {lastGeneratedKey}
            </code>
            <CopyButton value={lastGeneratedKey} />
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-sm text-[#64748b] hover:text-[#f1f5f9] transition-colors"
          >
            Done
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          <div>
            <label
              htmlFor="key-label"
              className="mb-1.5 block text-sm font-medium text-[#f1f5f9]"
            >
              Label
            </label>
            <input
              id="key-label"
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Priority relay"
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-sm text-[#f1f5f9] placeholder:text-[#64748b] focus:outline-none focus:border-[#f97316]/50"
            />
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-[#f1f5f9]">Scopes</p>
            <div className="space-y-2">
              {SCOPE_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 hover:border-white/20 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={scopes.includes(opt.value)}
                    onChange={() => toggleScope(opt.value)}
                    className="h-4 w-4 shrink-0 accent-[#f97316]"
                  />
                  <span className="font-mono text-sm text-[#64748b]">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={submitting || !label.trim() || scopes.length === 0}
            className="w-full rounded-xl bg-[#f97316] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#ea6c0a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? "Generating…" : "Generate"}
          </button>
        </div>
      )}
    </Modal>
  );
}

function KeyRow({
  apiKey,
  onRevoke,
  revoking,
}: {
  readonly apiKey: PortalApiKey;
  readonly onRevoke: (id: string) => Promise<void>;
  readonly revoking: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const active = apiKey.status !== "revoked" && apiKey.status !== "REVOKED";

  return (
    <div className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-[#f1f5f9]">{apiKey.label}</span>
          {active ? (
            <Badge tone="success">Active</Badge>
          ) : (
            <Badge tone="danger">Revoked</Badge>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <code className="rounded bg-white/[0.04] px-2 py-0.5 font-mono text-xs text-[#64748b]">
            {apiKey.prefix}...
          </code>
          <CopyButton value={apiKey.prefix} />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {apiKey.scopes.map((scope) => (
            <span
              key={scope}
              className="inline-block rounded px-2 py-0.5 text-xs font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20"
            >
              {scope}
            </span>
          ))}
        </div>
        <p className="text-xs text-[#64748b]">
          Created {new Date(apiKey.createdAt).toLocaleDateString()} ·{" "}
          {apiKey.lastUsedAt ? `Last used ${formatRelativeDate(apiKey.lastUsedAt)}` : "Never used"}
        </p>
      </div>
      {active ? (
        <div className="flex items-center gap-2">
          {confirming ? (
            <>
              <span className="text-xs text-[#64748b]">Revoke this key?</span>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="rounded-lg border border-white/[0.08] px-3 py-1.5 text-xs text-[#64748b] hover:text-[#f1f5f9] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={revoking}
                onClick={async () => {
                  await onRevoke(apiKey.id);
                  setConfirming(false);
                }}
                className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs text-rose-400 hover:bg-rose-500/20 transition-colors disabled:opacity-50"
              >
                {revoking ? "Revoking…" : "Confirm revoke"}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="rounded-lg border border-white/[0.08] px-3 py-1.5 text-xs text-[#64748b] hover:text-[#f1f5f9] transition-colors"
            >
              Revoke
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}

export default function ApiKeysPage() {
  const portal = usePortal();
  const [createOpen, setCreateOpen] = useState(false);
  const [keyCreating, setKeyCreating] = useState(false);
  const [keyRevoking, setKeyRevoking] = useState<string | null>(null);

  if (portal.walletPhase !== "authenticated") {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
        <AuthGate body="API key management is tied to your wallet session." />
      </div>
    );
  }

  async function handleCreateKey(label: string, colorTag: string, scopes: string[]) {
    setKeyCreating(true);
    try {
      await portal.createApiKey({ label, colorTag, scopes });
    } finally {
      setKeyCreating(false);
    }
  }

  async function handleRevokeKey(id: string) {
    setKeyRevoking(id);
    try {
      await portal.revokeApiKey(id);
    } finally {
      setKeyRevoking(null);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Keys"
        title="Create project keys with clear scope and predictable usage."
        description="API keys grant scoped access to the relay gateway. Each key is tied to a project and can be revoked at any time."
        actions={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => exportApiKeyMetadata(portal.apiKeys)}
              disabled={portal.walletPhase !== "authenticated" || portal.apiKeys.length === 0}
              className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-[#64748b] hover:text-[#f1f5f9] transition-colors disabled:opacity-40"
            >
              Export
            </button>
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              disabled={portal.walletPhase !== "authenticated"}
              className="rounded-xl bg-[#f97316] px-4 py-2 text-sm font-semibold text-white hover:bg-[#ea6c0a] disabled:opacity-50 transition-colors"
            >
              Generate key
            </button>
          </div>
        }
      />

      {portal.lastGeneratedApiKey && !createOpen ? (
        <Notice tone="success" title="New API key generated">
          <div className="mt-2 flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-black/20 px-3 py-2">
            <code className="flex-1 break-all font-mono text-xs text-emerald-200">
              {portal.lastGeneratedApiKey}
            </code>
            <CopyButton value={portal.lastGeneratedApiKey} />
          </div>
          <p className="mt-2 text-xs text-emerald-300/70">
            This key will not be shown again. Copy and store it securely now.
          </p>
        </Notice>
      ) : null}

      {portal.apiKeys.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-6 py-12 text-center text-sm text-[#64748b]">
          No API keys yet. Click &quot;Generate key&quot; to create your first key.
        </div>
      ) : (
        <div className="space-y-3">
          {portal.apiKeys.map((key) => (
            <KeyRow
              key={key.id}
              apiKey={key}
              onRevoke={handleRevokeKey}
              revoking={keyRevoking === key.id}
            />
          ))}
        </div>
      )}

      <GenerateKeyModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreateKey}
        submitting={keyCreating}
        lastGeneratedKey={portal.lastGeneratedApiKey}
      />
    </div>
  );
}
