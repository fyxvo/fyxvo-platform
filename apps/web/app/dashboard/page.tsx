"use client";

import { useState } from "react";
import Link from "next/link";
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
import { PageHeader } from "../../components/page-header";
import { AuthGate, EmptyProjectState, LoadingGrid } from "../../components/state-panels";
import { WalletConnectButton } from "../../components/wallet-connect-button";
import { usePortal } from "../../components/portal-provider";
import {
  formatDuration,
  formatInteger,
  formatRelativeDate,
  shortenAddress,
} from "../../lib/format";
import type { PortalApiKey, PortalProject } from "../../lib/types";

const SCOPE_OPTIONS = [
  { value: "standard_rpc", label: "Standard RPC", description: "Access to standard JSON-RPC methods on the Fyxvo devnet gateway." },
  { value: "priority_relay", label: "Priority relay", description: "Submit transactions through the priority relay for faster inclusion." },
  { value: "analytics_read", label: "Analytics read", description: "Read request logs and analytics data for this project." },
] as const;

function computeSuccessRate(statusCodes: Array<{ statusCode: number; count: number }>) {
  const total = statusCodes.reduce((sum, s) => sum + s.count, 0);
  if (total === 0) return null;
  const success = statusCodes
    .filter((s) => s.statusCode >= 200 && s.statusCode < 300)
    .reduce((sum, s) => sum + s.count, 0);
  return (success / total) * 100;
}

function ApiKeyStatusBadge({ status }: { readonly status: string }) {
  const lower = status.toLowerCase();
  if (lower === "active") return <Badge tone="success">Active</Badge>;
  if (lower === "revoked") return <Badge tone="danger">Revoked</Badge>;
  return <Badge tone="neutral">{status}</Badge>;
}

function FundProjectSection({
  project,
  transactionState,
  onPrepare,
}: {
  readonly project: PortalProject;
  readonly transactionState: { phase: string; message: string; explorerUrl?: string };
  readonly onPrepare: (amount: string) => void;
}) {
  const [amount, setAmount] = useState("");

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-[var(--fyxvo-text-muted)]">
          Funding adds SOL credits to your on-chain project account. These credits are consumed as
          your API keys relay transactions through the gateway.
        </p>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[140px]">
          <label
            htmlFor="fund-amount"
            className="mb-1.5 block text-xs font-medium text-[var(--fyxvo-text-muted)]"
          >
            Amount (SOL)
          </label>
          <Input
            id="fund-amount"
            type="number"
            step="0.01"
            min="0.01"
            placeholder="0.25"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <Button
          onClick={() => {
            if (amount) onPrepare(amount);
          }}
          disabled={
            !amount ||
            Number(amount) <= 0 ||
            transactionState.phase === "preparing" ||
            transactionState.phase === "awaiting_signature" ||
            transactionState.phase === "submitting"
          }
          loading={
            transactionState.phase === "preparing" ||
            transactionState.phase === "awaiting_signature" ||
            transactionState.phase === "submitting"
          }
        >
          Prepare funding transaction
        </Button>
      </div>

      {transactionState.phase !== "idle" && transactionState.message ? (
        <Notice
          tone={
            transactionState.phase === "confirmed"
              ? "success"
              : transactionState.phase === "error"
              ? "danger"
              : "brand"
          }
          title={
            transactionState.phase === "confirmed"
              ? "Transaction confirmed"
              : transactionState.phase === "error"
              ? "Transaction failed"
              : "Transaction in progress"
          }
        >
          {transactionState.message}
          {transactionState.explorerUrl ? (
            <span>
              {" "}
              <a
                href={transactionState.explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                View on Solana Explorer
              </a>
            </span>
          ) : null}
        </Notice>
      ) : null}
    </div>
  );
}

function CreateApiKeyModal({
  open,
  onClose,
  onSubmit,
  submitting,
  lastGeneratedKey,
}: {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onSubmit: (label: string, scopes: string[]) => Promise<void>;
  readonly submitting: boolean;
  readonly lastGeneratedKey: string | null;
}) {
  const [label, setLabel] = useState("");
  const [scopes, setScopes] = useState<string[]>(["standard_rpc"]);
  const [submitted, setSubmitted] = useState(false);

  function toggleScope(scope: string) {
    setScopes((current) =>
      current.includes(scope) ? current.filter((s) => s !== scope) : [...current, scope]
    );
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!label.trim() || scopes.length === 0) return;
    await onSubmit(label.trim(), scopes);
    setSubmitted(true);
  }

  function handleClose() {
    setLabel("");
    setScopes(["standard_rpc"]);
    setSubmitted(false);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Create API key"
      description="A new key will be generated for this project. The full key value is only shown once."
    >
      {submitted && lastGeneratedKey ? (
        <div className="space-y-4">
          <Notice tone="success" title="API key created">
            Copy this key now. It will not be shown again after you close this dialog.
          </Notice>
          <div className="flex items-center gap-2 rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 py-3">
            <code className="flex-1 break-all font-mono text-xs text-[var(--fyxvo-text)]">
              {lastGeneratedKey}
            </code>
            <CopyButton value={lastGeneratedKey} />
          </div>
          <Button onClick={handleClose} variant="secondary">
            Done
          </Button>
        </div>
      ) : (
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
          <div>
            <label
              htmlFor="key-label"
              className="mb-1.5 block text-sm font-medium text-[var(--fyxvo-text)]"
            >
              Label
            </label>
            <Input
              id="key-label"
              placeholder="Production backend"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              required
            />
            <p className="mt-1.5 text-xs text-[var(--fyxvo-text-muted)]">
              A descriptive name to identify where this key is used.
            </p>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-[var(--fyxvo-text)]">Scopes</p>
            <div className="space-y-2">
              {SCOPE_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className="flex cursor-pointer items-start gap-3 rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-3 transition hover:border-[var(--fyxvo-border-strong)]"
                >
                  <input
                    type="checkbox"
                    checked={scopes.includes(opt.value)}
                    onChange={() => toggleScope(opt.value)}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--fyxvo-brand)]"
                  />
                  <div>
                    <div className="text-sm font-medium text-[var(--fyxvo-text)]">{opt.label}</div>
                    <div className="text-xs text-[var(--fyxvo-text-muted)]">{opt.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <Button
            type="submit"
            loading={submitting}
            disabled={!label.trim() || scopes.length === 0 || submitting}
          >
            Create key
          </Button>
        </form>
      )}
    </Modal>
  );
}

function ApiKeyRow({
  apiKey,
  onRevoke,
  revoking,
}: {
  readonly apiKey: PortalApiKey;
  readonly onRevoke: (id: string) => Promise<void>;
  readonly revoking: boolean;
}) {
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4">
      <div className="min-w-0 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-[var(--fyxvo-text)]">{apiKey.label}</span>
          <ApiKeyStatusBadge status={apiKey.status} />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <code className="rounded bg-[var(--fyxvo-panel)] px-2 py-0.5 font-mono text-xs text-[var(--fyxvo-text-muted)]">
            {apiKey.prefix}...
          </code>
          <CopyButton value={apiKey.prefix} />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {apiKey.scopes.map((scope) => (
            <Badge key={scope} tone="neutral">
              {scope}
            </Badge>
          ))}
        </div>
        <p className="text-xs text-[var(--fyxvo-text-muted)]">
          {apiKey.lastUsedAt
            ? `Last used ${formatRelativeDate(apiKey.lastUsedAt)}`
            : "Never used"}
        </p>
      </div>
      {apiKey.status !== "revoked" && apiKey.status !== "REVOKED" ? (
        <div className="flex items-center gap-2">
          {confirming ? (
            <>
              <span className="text-xs text-[var(--fyxvo-text-muted)]">Revoke this key?</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setConfirming(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant="secondary"
                loading={revoking}
                onClick={async () => {
                  await onRevoke(apiKey.id);
                  setConfirming(false);
                }}
              >
                Confirm revoke
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setConfirming(true)}
            >
              Revoke
            </Button>
          )}
        </div>
      ) : null}
    </div>
  );
}

function CreateProjectForm({
  onSubmit,
  projectCreationState,
}: {
  readonly onSubmit: (slug: string, name: string, description: string) => Promise<void>;
  readonly projectCreationState: { phase: string; message: string; explorerUrl?: string };
}) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);

  function derivedSlug(value: string) {
    return value
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-");
  }

  function handleNameChange(value: string) {
    setName(value);
    if (!slugEdited) {
      setSlug(derivedSlug(value));
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim() || !slug.trim()) return;
    await onSubmit(slug.trim(), name.trim(), description.trim());
  }

  const busy =
    projectCreationState.phase === "preparing" ||
    projectCreationState.phase === "awaiting_signature" ||
    projectCreationState.phase === "submitting";

  const phaseLabel: Record<string, string> = {
    preparing: "Preparing transaction...",
    awaiting_signature: "Waiting for wallet signature...",
    submitting: "Submitting to chain...",
    confirmed: "Project created.",
    error: "Creation failed.",
  };

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
      <div>
        <label
          htmlFor="project-name"
          className="mb-1.5 block text-sm font-medium text-[var(--fyxvo-text)]"
        >
          Project name
        </label>
        <Input
          id="project-name"
          placeholder="My devnet project"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          required
          disabled={busy}
        />
      </div>
      <div>
        <label
          htmlFor="project-slug"
          className="mb-1.5 block text-sm font-medium text-[var(--fyxvo-text)]"
        >
          Project slug
        </label>
        <Input
          id="project-slug"
          placeholder="my-devnet-project"
          value={slug}
          onChange={(e) => {
            setSlugEdited(true);
            setSlug(derivedSlug(e.target.value));
          }}
          required
          disabled={busy}
        />
        <p className="mt-1.5 text-xs text-[var(--fyxvo-text-muted)]">
          Used in API endpoint URLs and on-chain identifiers. Lowercase letters, numbers, and hyphens only.
        </p>
      </div>
      <div>
        <label
          htmlFor="project-description"
          className="mb-1.5 block text-sm font-medium text-[var(--fyxvo-text)]"
        >
          Description
          <span className="ml-1 font-normal text-[var(--fyxvo-text-muted)]">(optional)</span>
        </label>
        <textarea
          id="project-description"
          placeholder="Describe how this project uses the devnet gateway."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          disabled={busy}
          className="w-full rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-3 py-2.5 text-sm text-[var(--fyxvo-text)] placeholder:text-[var(--fyxvo-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--fyxvo-brand)]/40 disabled:opacity-60"
        />
      </div>

      {projectCreationState.phase !== "idle" ? (
        <Notice
          tone={
            projectCreationState.phase === "confirmed"
              ? "success"
              : projectCreationState.phase === "error"
              ? "danger"
              : "brand"
          }
          title={phaseLabel[projectCreationState.phase] ?? projectCreationState.phase}
        >
          {projectCreationState.message}
          {projectCreationState.explorerUrl ? (
            <span>
              {" "}
              <a
                href={projectCreationState.explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                View transaction
              </a>
            </span>
          ) : null}
        </Notice>
      ) : null}

      <Button
        type="submit"
        loading={busy}
        disabled={!name.trim() || !slug.trim() || busy}
      >
        Create project
      </Button>
    </form>
  );
}

export default function DashboardPage() {
  const portal = usePortal();
  const [createKeyOpen, setCreateKeyOpen] = useState(false);
  const [keyCreating, setKeyCreating] = useState(false);
  const [keyRevoking, setKeyRevoking] = useState<string | null>(null);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [fundOpen, setFundOpen] = useState(false);

  const selectedProject = portal.selectedProject;
  const snapshot = portal.onchainSnapshot;
  const analytics = portal.projectAnalytics;

  const isActivated =
    selectedProject !== null &&
    !!selectedProject.onChainProjectPda &&
    selectedProject.onChainProjectPda.length > 10 &&
    !selectedProject.archivedAt;

  const successRate = analytics
    ? computeSuccessRate(analytics.statusCodes)
    : null;

  async function handleCreateKey(label: string, scopes: string[]) {
    setKeyCreating(true);
    try {
      await portal.createApiKey({ label, scopes });
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

  async function handleCreateProject(slug: string, name: string, description: string) {
    await portal.createProject({ slug, name, ...(description ? { description } : {}) });
  }

  function handlePrepareFunding(amount: string) {
    void portal.prepareFunding({ asset: "SOL", amount, submit: true });
  }

  if (portal.walletPhase !== "authenticated") {
    return (
      <div className="space-y-10">
        <div className="mx-auto max-w-2xl space-y-6 pt-16 text-center">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-[var(--fyxvo-text)]">
            Connect your wallet to access your workspace
          </h1>
          <p className="text-base leading-7 text-[var(--fyxvo-text-muted)]">
            Fyxvo uses your Solana wallet as your identity. Connecting signs a short authentication
            challenge that proves ownership of your address without exposing your private key. Once
            authenticated, your projects, API keys, funding history, and analytics all load from the
            same session.
          </p>
          <p className="text-sm text-[var(--fyxvo-text-muted)]">
            Supported wallets: Phantom, Solflare, Backpack, and any Wallet Standard compatible
            wallet detected in your browser.
          </p>
          <div className="flex justify-center">
            <WalletConnectButton />
          </div>
        </div>
      </div>
    );
  }

  if (portal.loading) {
    return (
      <div className="space-y-8">
        <div className="h-28 animate-pulse rounded-[1.75rem] bg-[var(--fyxvo-panel-soft)]" />
        <LoadingGrid />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Workspace"
        title="Dashboard"
        description="Manage your on-chain projects, API keys, funding, and request analytics from one place."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 py-2 text-sm text-[var(--fyxvo-text)]">
              {portal.user?.displayName ? (
                <span className="font-medium">{portal.user.displayName}</span>
              ) : null}
              {portal.walletAddress ? (
                <>
                  <code className="font-mono text-[var(--fyxvo-text-muted)]">
                    {shortenAddress(portal.walletAddress)}
                  </code>
                  <CopyButton value={portal.walletAddress} />
                </>
              ) : null}
              <Badge tone="success">Connected</Badge>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowCreateProject((v) => !v)}
            >
              New project
            </Button>
          </div>
        }
      />

      {showCreateProject ? (
        <Card className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)]">
          <CardHeader>
            <CardTitle>Create a project</CardTitle>
            <CardDescription>
              Each project maps to an on-chain account on Solana devnet. Creating a project requires
              a wallet signature to register it with the Fyxvo protocol.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CreateProjectForm
              onSubmit={handleCreateProject}
              projectCreationState={portal.projectCreationState}
            />
          </CardContent>
        </Card>
      ) : null}

      {portal.projects.length === 0 && !showCreateProject ? (
        <div className="space-y-4">
          <EmptyProjectState />
          <div className="text-center">
            <Button onClick={() => setShowCreateProject(true)}>Create your first project</Button>
          </div>
        </div>
      ) : null}

      {portal.projects.length > 0 ? (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-xl font-semibold text-[var(--fyxvo-text)]">
              Projects
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {portal.projects.map((project) => {
              const selected = portal.selectedProject?.id === project.id;
              const activated =
                !!project.onChainProjectPda &&
                project.onChainProjectPda.length > 10 &&
                !project.archivedAt;
              return (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => portal.selectProject(project.id)}
                  className={`rounded-xl border p-4 text-left transition ${
                    selected
                      ? "border-[var(--fyxvo-brand)]/40 bg-[var(--fyxvo-brand)]/5"
                      : "border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] hover:border-[var(--fyxvo-border-strong)]"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-[var(--fyxvo-text)]">{project.name}</span>
                    {activated ? (
                      <Badge tone="success">Active</Badge>
                    ) : (
                      <Badge tone="warning">Inactive</Badge>
                    )}
                    <Badge tone="neutral">devnet</Badge>
                  </div>
                  <div className="mt-1 text-xs uppercase tracking-widest text-[var(--fyxvo-text-muted)]">
                    {project.slug}
                  </div>
                  {project._count ? (
                    <div className="mt-3 flex flex-wrap gap-3 text-xs text-[var(--fyxvo-text-muted)]">
                      <span>{formatInteger(project._count.apiKeys)} keys</span>
                      <span>{formatInteger(project._count.requestLogs)} requests</span>
                    </div>
                  ) : null}
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      {selectedProject ? (
        <>
          <section className="space-y-4">
            <h2 className="font-display text-xl font-semibold text-[var(--fyxvo-text)]">
              {selectedProject.name}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Card className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-5">
                <p className="text-xs uppercase tracking-widest text-[var(--fyxvo-text-muted)]">
                  On-chain balance
                </p>
                <p className="mt-2 text-2xl font-semibold text-[var(--fyxvo-text)]">
                  {snapshot
                    ? `${snapshot.treasurySolBalance.toFixed(4)} SOL`
                    : "—"}
                </p>
                {snapshot?.balances ? (
                  <p className="mt-1 text-xs text-[var(--fyxvo-text-muted)]">
                    {snapshot.balances.availableSolCredits} credits available
                  </p>
                ) : null}
              </Card>

              <Card className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-5">
                <p className="text-xs uppercase tracking-widest text-[var(--fyxvo-text-muted)]">
                  Status
                </p>
                <div className="mt-2 flex items-center gap-2">
                  {isActivated ? (
                    <Badge tone="success">Active</Badge>
                  ) : (
                    <Badge tone="warning">Inactive</Badge>
                  )}
                  <Badge tone="neutral">devnet</Badge>
                </div>
                <p className="mt-1 text-xs text-[var(--fyxvo-text-muted)]">
                  {isActivated
                    ? "On-chain account confirmed"
                    : "Awaiting on-chain activation"}
                </p>
              </Card>

              <Card className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-5">
                <p className="text-xs uppercase tracking-widest text-[var(--fyxvo-text-muted)]">
                  Total requests
                </p>
                <p className="mt-2 text-2xl font-semibold text-[var(--fyxvo-text)]">
                  {analytics ? formatInteger(analytics.totals.requestLogs) : "—"}
                </p>
                {successRate !== null ? (
                  <p className="mt-1 text-xs text-[var(--fyxvo-text-muted)]">
                    {successRate.toFixed(1)}% success rate
                  </p>
                ) : null}
              </Card>

              <Card className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-5">
                <p className="text-xs uppercase tracking-widest text-[var(--fyxvo-text-muted)]">
                  Avg latency
                </p>
                <p className="mt-2 text-2xl font-semibold text-[var(--fyxvo-text)]">
                  {analytics ? formatDuration(analytics.latency.averageMs) : "—"}
                </p>
                {analytics?.latency.p95Ms ? (
                  <p className="mt-1 text-xs text-[var(--fyxvo-text-muted)]">
                    p95: {formatDuration(analytics.latency.p95Ms)}
                  </p>
                ) : null}
              </Card>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setFundOpen((v) => !v)}
              >
                Fund project
              </Button>
              <Button asChild variant="secondary" size="sm">
                <Link href="/analytics">View analytics</Link>
              </Button>
            </div>

            {fundOpen ? (
              <Card className="rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-5">
                <h3 className="mb-3 font-semibold text-[var(--fyxvo-text)]">Fund this project</h3>
                <FundProjectSection
                  project={selectedProject}
                  transactionState={portal.transactionState}
                  onPrepare={handlePrepareFunding}
                />
              </Card>
            ) : null}
          </section>

          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-xl font-semibold text-[var(--fyxvo-text)]">
                API keys
              </h2>
              <Button size="sm" onClick={() => setCreateKeyOpen(true)}>
                Create new API key
              </Button>
            </div>

            {portal.apiKeys.length === 0 ? (
              <Notice tone="neutral" title="No API keys yet">
                Create your first API key to start sending requests through the Fyxvo devnet
                gateway. Each key can be scoped to specific capabilities.
              </Notice>
            ) : (
              <div className="space-y-3">
                {portal.apiKeys.map((key) => (
                  <ApiKeyRow
                    key={key.id}
                    apiKey={key}
                    onRevoke={handleRevokeKey}
                    revoking={keyRevoking === key.id}
                  />
                ))}
              </div>
            )}

            <CreateApiKeyModal
              open={createKeyOpen}
              onClose={() => setCreateKeyOpen(false)}
              onSubmit={handleCreateKey}
              submitting={keyCreating}
              lastGeneratedKey={portal.lastGeneratedApiKey}
            />
          </section>
        </>
      ) : null}
    </div>
  );
}
