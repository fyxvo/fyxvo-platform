"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Modal,
  Notice,
} from "@fyxvo/ui";
import { CopyButton } from "../../components/copy-button";
import { ApiKeyDetail } from "../../components/api-key-detail";
import { PageHeader } from "../../components/page-header";
import { AuthGate } from "../../components/state-panels";
import { usePortal } from "../../components/portal-provider";
import { webEnv } from "../../lib/env";
import { formatRelativeDate } from "../../lib/format";
import { rotateApiKey } from "../../lib/api";
import type { PortalApiKey } from "../../lib/types";

export default function ApiKeysPage() {
  const portal = usePortal();
  const router = useRouter();
  const [label, setLabel] = useState("Priority relay");
  const [scopes, setScopes] = useState("project:read, rpc:request, priority:relay");
  const [expiresAt, setExpiresAt] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [revokeKey, setRevokeKey] = useState<PortalApiKey | null>(null);
  const [expandedKeyId, setExpandedKeyId] = useState<string | null>(null);
  const [selectedKeyIds, setSelectedKeyIds] = useState<Set<string>>(new Set());
  const [rotatingKeyId, setRotatingKeyId] = useState<string | null>(null);
  const [bulkRevokeOpen, setBulkRevokeOpen] = useState(false);

  const expandedKey = portal.apiKeys.find((k) => k.id === expandedKeyId) ?? null;

  // Countdown for newly generated key (60 seconds)
  const [countdown, setCountdown] = useState(0);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (portal.lastGeneratedApiKey && portal.lastGeneratedApiKey !== prevKeyRef.current) {
      prevKeyRef.current = portal.lastGeneratedApiKey;
      setCountdown(60);
      if (countdownRef.current) clearInterval(countdownRef.current);
      countdownRef.current = setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) {
            if (countdownRef.current) clearInterval(countdownRef.current);
            return 0;
          }
          return c - 1;
        });
      }, 1000);
    }
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [portal.lastGeneratedApiKey]);

  const handleRotateKey = async (key: PortalApiKey) => {
    if (!portal.token) return;
    if (!portal.selectedProject) return;
    setRotatingKeyId(key.id);
    try {
      await rotateApiKey({
        projectId: portal.selectedProject.id,
        apiKeyId: key.id,
        token: portal.token,
      });
      await portal.refresh();
    } catch (err) {
      console.error("Rotate failed", err);
    } finally {
      setRotatingKeyId(null);
    }
  };

  const handleBulkRevoke = async () => {
    if (!portal.token || !portal.selectedProject) return;
    const keyIds = Array.from(selectedKeyIds);
    for (const keyId of keyIds) {
      await portal.revokeApiKey(keyId).catch(() => {});
    }
    setSelectedKeyIds(new Set());
    setBulkRevokeOpen(false);
  };

  const exampleApiKey = portal.lastGeneratedApiKey ?? "YOUR_API_KEY";
  const standardRequest = `curl -X POST ${webEnv.gatewayBaseUrl}/rpc \\
  -H "content-type: application/json" \\
  -H "x-api-key: ${exampleApiKey}" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}'`;
  const priorityRequest = `curl -X POST ${webEnv.gatewayBaseUrl}/priority \\
  -H "content-type: application/json" \\
  -H "x-api-key: ${exampleApiKey}" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"getSlot"}'`;

  const rateLimitedCount =
    portal.projectAnalytics.statusCodes.find((entry) => entry.statusCode === 429)?.count ?? 0;
  const availableSolCredits = (() => {
    try {
      return BigInt(portal.onchainSnapshot.balances?.availableSolCredits ?? "0");
    } catch {
      return 0n;
    }
  })();

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="API Keys"
        title="Create project keys with clear scope and predictable usage."
        description="Separate credentials for relay traffic, analytics, and internal tools. Each key carries explicit scopes so access never relies on guesswork."
        actions={
          <Button onClick={() => setCreateOpen(true)} disabled={portal.walletPhase !== "authenticated"}>
            Generate key
          </Button>
        }
      />

      {portal.walletPhase !== "authenticated" ? (
        <AuthGate body="Connect a wallet to list live keys, generate new credentials, and revoke compromised ones." />
      ) : null}

      {portal.lastGeneratedApiKey ? (
        <Notice tone="success" title="New API key generated">
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className="break-all font-mono text-sm text-[var(--fyxvo-text)]">
              {portal.lastGeneratedApiKey}
            </span>
            <CopyButton value={portal.lastGeneratedApiKey} />
          </div>
          <p className="mt-4 text-sm leading-6 text-[var(--fyxvo-text-soft)]">
            Copy it now. This is the only time the full key is shown.
            {countdown > 0 ? (
              <span className="ml-2 font-mono text-xs text-[var(--fyxvo-text-muted)]">
                ({countdown}s)
              </span>
            ) : null}
          </p>
          {portal.selectedProject ? (
            <div className="mt-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => router.push(`/projects/${portal.selectedProject!.slug}?tab=endpoints`)}
              >
                Done — set up your endpoint
              </Button>
            </div>
          ) : null}
        </Notice>
      ) : null}

      {portal.selectedProject && !portal.onchainSnapshot.projectAccountExists ? (
        <Notice tone="warning" title="Project activation still required">
          Keys can be created now, but the gateway will only honor them once the selected project
          has confirmed activation on chain.
        </Notice>
      ) : null}

      {portal.selectedProject && availableSolCredits === 0n ? (
        <Notice tone="warning" title="Funding still required">
          The key path is ready, but funded relay usage still depends on project balance. Open
          funding before using this endpoint in production.
        </Notice>
      ) : null}

      <Notice tone="neutral" title="Scope enforcement is live">
        Standard relay requires <code>rpc:request</code>. Priority relay requires both{" "}
        <code>rpc:request</code> and <code>priority:relay</code>. Under-scoped keys are rejected
        with a clear error.
      </Notice>

      {rateLimitedCount > 0 ? (
        <Notice tone="neutral" title="Rate-limit pressure observed">
          This project has seen {rateLimitedCount} rate-limited responses. Keep standard and
          priority traffic separated so usage is easier to reason about.
        </Notice>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="overflow-hidden rounded-3xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)]">
          {selectedKeyIds.size > 0 && (
            <div className="flex items-center gap-3 border-b border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 py-2">
              <span className="text-sm text-[var(--fyxvo-text-soft)]">{selectedKeyIds.size} key{selectedKeyIds.size !== 1 ? "s" : ""} selected</span>
              <button
                type="button"
                className="rounded px-2 py-1 text-xs text-rose-700 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30 transition-colors"
                onClick={() => setBulkRevokeOpen(true)}
              >
                Bulk revoke ({selectedKeyIds.size})
              </button>
              <button
                type="button"
                className="rounded px-2 py-1 text-xs text-[var(--fyxvo-text-muted)] hover:text-[var(--fyxvo-text)] transition-colors"
                onClick={() => setSelectedKeyIds(new Set())}
              >
                Clear
              </button>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[var(--fyxvo-border)] text-left text-sm">
              <thead className="bg-[var(--fyxvo-panel-soft)]">
                <tr>
                  <th className="px-4 py-3" scope="col">
                    <span className="sr-only">Select</span>
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--fyxvo-text-muted)]" scope="col">Key</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--fyxvo-text-muted)]" scope="col">Scopes</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--fyxvo-text-muted)]" scope="col">Last used</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--fyxvo-text-muted)]" scope="col">Created</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--fyxvo-text-muted)]" scope="col">Status</th>
                  <th className="px-4 py-3" scope="col"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--fyxvo-border)] text-[var(--fyxvo-text-soft)]">
                {portal.apiKeys.length === 0 ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-[var(--fyxvo-text-muted)]" colSpan={7}>
                      No API keys yet.
                    </td>
                  </tr>
                ) : (
                  portal.apiKeys.map((apiKey) => {
                    const isExpanded = expandedKeyId === apiKey.id;
                    const isSelected = selectedKeyIds.has(apiKey.id);
                    const isRotating = rotatingKeyId === apiKey.id;
                    return (
                      <tr
                        key={apiKey.id}
                        className={`cursor-pointer transition-colors hover:bg-[var(--fyxvo-panel-soft)] ${isExpanded ? "bg-[var(--fyxvo-panel-soft)]" : ""}`}
                        onClick={() => setExpandedKeyId(isExpanded ? null : apiKey.id)}
                      >
                        <td className="px-4 py-4 align-middle" onClick={(e) => e.stopPropagation()}>
                          {apiKey.status === "ACTIVE" && (
                            <input
                              type="checkbox"
                              aria-label={`Select ${apiKey.label}`}
                              checked={isSelected}
                              onChange={(e) => {
                                const next = new Set(selectedKeyIds);
                                if (e.target.checked) {
                                  next.add(apiKey.id);
                                } else {
                                  next.delete(apiKey.id);
                                }
                                setSelectedKeyIds(next);
                              }}
                              className="h-4 w-4 rounded border-[var(--fyxvo-border)] accent-[var(--fyxvo-accent)]"
                            />
                          )}
                        </td>
                        <td className="px-4 py-4 align-middle">
                          <div className="font-medium text-[var(--fyxvo-text)]">{apiKey.label}</div>
                          <div className="font-mono text-xs text-[var(--fyxvo-text-muted)]">
                            {apiKey.prefix}••••••••••••
                          </div>
                        </td>
                        <td className="px-4 py-4 align-middle">
                          <div className="flex flex-wrap gap-1.5">
                            {apiKey.scopes.map((scope) => (
                              <Badge key={scope} tone="neutral">{scope}</Badge>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-4 align-middle">
                          <span className="text-[var(--fyxvo-text-muted)]">
                            {apiKey.lastUsedAt ? formatRelativeDate(apiKey.lastUsedAt) : "Never"}
                          </span>
                        </td>
                        <td className="px-4 py-4 align-middle">
                          <span className="text-[var(--fyxvo-text-muted)]">{formatRelativeDate(apiKey.createdAt)}</span>
                        </td>
                        <td className="px-4 py-4 align-middle">
                          <Badge tone={apiKey.status === "ACTIVE" ? "success" : "danger"}>{apiKey.status}</Badge>
                        </td>
                        <td className="px-4 py-4 align-middle text-right">
                          <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                            {apiKey.status === "ACTIVE" && (
                              <>
                                <button
                                  type="button"
                                  disabled={isRotating}
                                  className="rounded px-2 py-1 text-xs text-[var(--fyxvo-accent)] hover:bg-[var(--fyxvo-panel-soft)] transition-colors disabled:opacity-50"
                                  onClick={() => { void handleRotateKey(apiKey); }}
                                >
                                  {isRotating ? "Rotating…" : "Rotate"}
                                </button>
                                <button
                                  type="button"
                                  className="rounded px-2 py-1 text-xs text-rose-700 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30 transition-colors"
                                  onClick={() => {
                                    setRevokeKey(apiKey);
                                  }}
                                >
                                  Revoke
                                </button>
                              </>
                            )}
                            <svg
                              viewBox="0 0 12 12"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              className={`h-3 w-3 text-[var(--fyxvo-text-muted)] transition-transform ${isExpanded ? "rotate-180" : ""}`}
                              aria-hidden="true"
                            >
                              <path d="M2 4l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
          <CardHeader>
            <CardTitle>Endpoint defaults</CardTitle>
            <CardDescription>
              Each route requires a minimum scope. Under-scoped keys are rejected immediately.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              {
                label: "Standard relay",
                route: "POST /rpc",
                scope: "rpc:request",
              },
              {
                label: "Priority relay",
                route: "POST /priority",
                scope: "rpc:request, priority:relay",
              },
              {
                label: "Analytics",
                route: "GET /v1/analytics/overview",
                scope: "project:read",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4"
              >
                <div className="text-xs uppercase tracking-wider text-[var(--fyxvo-text-muted)]">
                  {item.label}
                </div>
                <div className="mt-1 font-mono text-sm font-medium text-[var(--fyxvo-text)]">
                  {item.route}
                </div>
                <div className="mt-1 text-xs text-[var(--fyxvo-text-muted)]">
                  Required: {item.scope}
                </div>
              </div>
            ))}
            {!portal.selectedProject ? (
              <Notice tone="neutral" title="Create a project first">
                API keys belong to a specific project. Activate one project then return here.
              </Notice>
            ) : null}
          </CardContent>
        </Card>
      </section>

      {expandedKey && portal.token && portal.selectedProject ? (
        <section>
          <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle>{expandedKey.label}</CardTitle>
                  <CardDescription className="mt-1 font-mono">{expandedKey.prefix}…</CardDescription>
                </div>
                <button
                  type="button"
                  onClick={() => setExpandedKeyId(null)}
                  className="rounded-md p-1 text-[var(--fyxvo-text-muted)] hover:text-[var(--fyxvo-text)] transition-colors"
                  aria-label="Close detail"
                >
                  <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4" aria-hidden="true">
                    <path d="M2 2l8 8M10 2l-8 8" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <ApiKeyDetail
                apiKey={expandedKey}
                projectId={portal.selectedProject.id}
                token={portal.token}
                onRevoke={(id) => {
                  void portal.revokeApiKey(id);
                  setExpandedKeyId(null);
                }}
              />
            </CardContent>
          </Card>
        </section>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-2">
        <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
          <CardHeader>
            <CardTitle>Standard relay request</CardTitle>
            <CardDescription>
              Confirm the project, funding, gateway, and logging path are all connected.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="overflow-hidden rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)]">
              <div className="flex items-center justify-between border-b border-[var(--fyxvo-border)] px-4 py-2">
                <span className="text-xs text-[var(--fyxvo-text-muted)]">curl</span>
                <CopyButton value={standardRequest} label="Copy" />
              </div>
              <pre className="overflow-x-auto p-4 text-xs leading-6 text-[var(--fyxvo-text-soft)]">
                <code>{standardRequest}</code>
              </pre>
            </div>
          </CardContent>
        </Card>

        <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
          <CardHeader>
            <CardTitle>Priority relay request</CardTitle>
            <CardDescription>
              Priority mode carries different routing and pricing. Opt in deliberately.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="overflow-hidden rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)]">
              <div className="flex items-center justify-between border-b border-[var(--fyxvo-border)] px-4 py-2">
                <span className="text-xs text-[var(--fyxvo-text-muted)]">curl</span>
                <CopyButton value={priorityRequest} label="Copy" />
              </div>
              <pre className="overflow-x-auto p-4 text-xs leading-6 text-[var(--fyxvo-text-soft)]">
                <code>{priorityRequest}</code>
              </pre>
            </div>
            <Notice tone="warning" title="Priority scope is intentionally explicit">
              A priority key should still include <code>rpc:request</code>. That keeps the key
              capable of normal relay traffic while making the priority permission visible during
              audits.
            </Notice>
          </CardContent>
        </Card>
      </section>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Generate an API key"
        description="Pick a clear label and only the scopes this client truly needs."
        footer={
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                await portal.createApiKey({
                  label,
                  scopes: scopes
                    .split(",")
                    .map((scope) => scope.trim())
                    .filter(Boolean),
                  ...(expiresAt ? { expiresAt } : {}),
                });
                setCreateOpen(false);
              }}
            >
              Generate
            </Button>
          </div>
        }
      >
        <div className="grid gap-4">
          <Input label="Label" value={label} onChange={(event) => setLabel(event.target.value)} />
          <Input
            label="Scopes"
            hint="Comma-separated: project:read, rpc:request, priority:relay. Priority keys must include rpc:request."
            value={scopes}
            onChange={(event) => setScopes(event.target.value)}
          />
          <Input
            label="Expires at"
            type="datetime-local"
            value={expiresAt}
            onChange={(event) => setExpiresAt(event.target.value)}
          />
        </div>
      </Modal>

      <Modal
        open={Boolean(revokeKey)}
        onClose={() => setRevokeKey(null)}
        title="Revoke API key"
        description="This action cannot be undone. Any requests using this key will fail immediately."
        footer={
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" onClick={() => setRevokeKey(null)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (revokeKey) {
                  await portal.revokeApiKey(revokeKey.id);
                  setRevokeKey(null);
                }
              }}
            >
              Revoke key
            </Button>
          </div>
        }
      >
        {revokeKey ? (
          <div className="rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4">
            <p className="font-medium text-[var(--fyxvo-text)]">{revokeKey.label}</p>
            <p className="mt-1 font-mono text-xs text-[var(--fyxvo-text-muted)]">
              {revokeKey.prefix}
            </p>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={bulkRevokeOpen}
        onClose={() => setBulkRevokeOpen(false)}
        title={`Revoke ${selectedKeyIds.size} API key${selectedKeyIds.size !== 1 ? "s" : ""}`}
        description="This action cannot be undone. All selected keys will stop working immediately."
        footer={
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" onClick={() => setBulkRevokeOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => { void handleBulkRevoke(); }}
            >
              Revoke {selectedKeyIds.size} key{selectedKeyIds.size !== 1 ? "s" : ""}
            </Button>
          </div>
        }
      >
        <div className="rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4">
          <p className="text-sm text-[var(--fyxvo-text-soft)]">
            {selectedKeyIds.size} key{selectedKeyIds.size !== 1 ? "s" : ""} will be permanently revoked. Any requests using these keys will fail immediately.
          </p>
        </div>
      </Modal>
    </div>
  );
}
