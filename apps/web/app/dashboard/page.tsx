"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge, Button, Modal, Notice } from "@fyxvo/ui";
import { usePortal } from "../../components/portal-provider";
import { WalletConnectButton } from "../../components/wallet-connect-button";
import type { PortalProject } from "../../lib/types";

// ─── helpers ─────────────────────────────────────────────────────────────────

function deriveSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-");
}

function isProjectActive(project: PortalProject): boolean {
  return (
    !!project.onChainProjectPda &&
    project.onChainProjectPda.length > 10 &&
    !project.archivedAt
  );
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function SkeletonCards() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="h-36 rounded-2xl bg-white/[0.04] animate-pulse border border-white/[0.06]"
        />
      ))}
    </div>
  );
}

// ─── Create project modal ─────────────────────────────────────────────────────

const TEMPLATES = [
  { value: "blank", label: "Blank", description: "Empty project, no preconfigured scopes." },
  { value: "defi", label: "DeFi", description: "Optimised for swap, lending, and DEX traffic." },
  { value: "indexing", label: "Indexing", description: "Heavy read traffic and program account scans." },
] as const;

function CreateProjectModal({
  open,
  onClose,
  onSubmit,
  creationState,
}: {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onSubmit: (slug: string, name: string, description: string) => Promise<void>;
  readonly creationState: { phase: string; message: string; explorerUrl?: string };
}) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [description, setDescription] = useState("");
  const [template, setTemplate] = useState<"blank" | "defi" | "indexing">("blank");

  function handleNameChange(value: string) {
    setName(value);
    if (!slugEdited) setSlug(deriveSlug(value));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) return;
    await onSubmit(slug.trim(), name.trim(), description.trim());
  }

  const busy =
    creationState.phase === "preparing" ||
    creationState.phase === "awaiting_signature" ||
    creationState.phase === "submitting";

  const phaseMap: Record<string, string> = {
    preparing: "Preparing on-chain transaction…",
    awaiting_signature: "Waiting for wallet signature…",
    submitting: "Submitting to Solana devnet…",
    confirmed: "Project created successfully.",
    error: "Project creation failed.",
  };

  function handleClose() {
    if (busy) return;
    setName("");
    setSlug("");
    setSlugEdited(false);
    setDescription("");
    setTemplate("blank");
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Create a project"
      description="Each project maps to an on-chain account on Solana devnet. Creating one requires a wallet signature to register it with the Fyxvo protocol."
    >
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
        {/* Name */}
        <div>
          <label className="block mb-1.5 text-sm font-medium text-[#f1f5f9]">
            Project name
          </label>
          <input
            type="text"
            required
            placeholder="My devnet project"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            disabled={busy}
            className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-[#f1f5f9] placeholder:text-[#64748b] focus:outline-none focus:ring-2 focus:ring-[#f97316]/40 disabled:opacity-60"
          />
        </div>

        {/* Slug */}
        <div>
          <label className="block mb-1.5 text-sm font-medium text-[#f1f5f9]">Slug</label>
          <input
            type="text"
            required
            placeholder="my-devnet-project"
            value={slug}
            onChange={(e) => {
              setSlugEdited(true);
              setSlug(deriveSlug(e.target.value));
            }}
            disabled={busy}
            className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm font-mono text-[#f1f5f9] placeholder:text-[#64748b] focus:outline-none focus:ring-2 focus:ring-[#f97316]/40 disabled:opacity-60"
          />
          <p className="mt-1.5 text-xs text-[#64748b]">
            Used in API endpoints and on-chain identifiers. Lowercase letters, numbers, and hyphens only.
          </p>
        </div>

        {/* Template */}
        <div>
          <p className="mb-2 text-sm font-medium text-[#f1f5f9]">Template</p>
          <div className="grid grid-cols-3 gap-2">
            {TEMPLATES.map((t) => (
              <button
                key={t.value}
                type="button"
                disabled={busy}
                onClick={() => setTemplate(t.value)}
                className={`rounded-xl border p-3 text-left text-xs transition-colors disabled:opacity-60 ${
                  template === t.value
                    ? "border-[#f97316]/40 bg-[#f97316]/10 text-[#f97316]"
                    : "border-white/[0.08] bg-white/[0.03] text-[#64748b] hover:border-white/[0.14]"
                }`}
              >
                <p className="font-semibold">{t.label}</p>
                <p className="mt-1 opacity-80">{t.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block mb-1.5 text-sm font-medium text-[#f1f5f9]">
            Description <span className="text-[#64748b] font-normal">(optional)</span>
          </label>
          <textarea
            rows={3}
            placeholder="Describe how this project uses the devnet gateway."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={busy}
            className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-[#f1f5f9] placeholder:text-[#64748b] focus:outline-none focus:ring-2 focus:ring-[#f97316]/40 disabled:opacity-60 resize-none"
          />
        </div>

        {/* Status notice */}
        {creationState.phase !== "idle" ? (
          <Notice
            tone={
              creationState.phase === "confirmed"
                ? "success"
                : creationState.phase === "error"
                  ? "danger"
                  : "brand"
            }
            title={phaseMap[creationState.phase] ?? creationState.phase}
          >
            {creationState.message}
            {creationState.explorerUrl ? (
              <span>
                {" "}
                <a
                  href={creationState.explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  View on Explorer
                </a>
              </span>
            ) : null}
          </Notice>
        ) : null}

        <div className="flex gap-3">
          <Button
            type="submit"
            loading={busy}
            disabled={!name.trim() || !slug.trim() || busy}
          >
            {busy ? "Creating…" : "Create project"}
          </Button>
          <Button type="button" variant="secondary" onClick={handleClose} disabled={busy}>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Project card ─────────────────────────────────────────────────────────────

function ProjectCard({
  project,
  selected,
  onSelect,
}: {
  readonly project: PortalProject;
  readonly selected: boolean;
  readonly onSelect: () => void;
}) {
  const active = isProjectActive(project);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-2xl border p-5 text-left transition-all hover:-translate-y-0.5 ${
        selected
          ? "border-[#f97316]/50 bg-[#f97316]/8 shadow-md shadow-[#f97316]/10"
          : "border-white/[0.08] bg-white/[0.03] hover:border-white/[0.14] hover:bg-white/[0.05]"
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <p className="font-display text-base font-semibold text-[#f1f5f9] truncate">
          {project.name}
        </p>
        <div className="flex items-center gap-1.5 shrink-0">
          {active ? (
            <Badge tone="success">Active</Badge>
          ) : (
            <Badge tone="warning">Inactive</Badge>
          )}
        </div>
      </div>
      <p className="text-xs font-mono text-[#64748b] mb-3 truncate">/{project.slug}</p>
      {project._count ? (
        <div className="flex gap-4 text-xs text-[#64748b]">
          <span>{project._count.apiKeys} keys</span>
          <span>{project._count.requestLogs.toLocaleString()} reqs</span>
        </div>
      ) : null}
      {selected ? (
        <div className="mt-3 pt-3 border-t border-[#f97316]/20">
          <Link
            href={`/projects/${project.slug}`}
            onClick={(e) => e.stopPropagation()}
            className="text-xs text-[#f97316] hover:underline font-medium"
          >
            View project details →
          </Link>
        </div>
      ) : null}
    </button>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const portal = usePortal();
  const [createModalOpen, setCreateModalOpen] = useState(false);

  async function handleCreateProject(slug: string, name: string, description: string) {
    await portal.createProject({ slug, name, ...(description ? { description } : {}) });
  }

  // ── Not authenticated ──
  if (portal.walletPhase !== "authenticated") {
    return (
      <div className="flex items-center justify-center py-20 px-5">
        <div className="text-center max-w-lg">
          <div className="w-20 h-20 rounded-3xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto mb-8">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-10 h-10 text-[#64748b]">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 12v.75m15.75-3a2.25 2.25 0 00-2.25-2.25H7.5A2.25 2.25 0 005.25 9.75m13.5 0V6.75A2.25 2.25 0 0016.5 4.5h-9A2.25 2.25 0 005.25 6.75v3M3 12v6.75A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V12" />
            </svg>
          </div>
          <h1 className="font-display text-3xl font-semibold text-[#f1f5f9] mb-4 tracking-tight">
            Connect your Solana wallet
          </h1>
          <p className="text-base leading-7 text-[#64748b] mb-8">
            Fyxvo uses your Solana wallet as your identity. Connecting signs a short authentication
            challenge that proves ownership without exposing your private key. Once authenticated,
            your projects, API keys, funding history, and analytics all load from the same session.
          </p>
          <WalletConnectButton />
        </div>
      </div>
    );
  }

  // ── Loading ──
  if (portal.loading) {
    return (
      <div className="py-12 px-5">
        <div className="mx-auto max-w-6xl">
          <div className="h-24 rounded-2xl bg-white/[0.04] animate-pulse mb-8" />
          <SkeletonCards />
        </div>
      </div>
    );
  }

  const selectedProject = portal.selectedProject;
  const snapshot = portal.onchainSnapshot;
  const analytics = portal.projectAnalytics;

  return (
    <div className="py-12">
      <div className="mx-auto max-w-6xl px-5 sm:px-8 space-y-10">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#f97316] mb-1">
              Workspace
            </p>
            <h1 className="font-display text-3xl font-semibold text-[#f1f5f9] tracking-tight">
              Dashboard
            </h1>
            {portal.walletAddress ? (
              <p className="mt-1 text-sm font-mono text-[#64748b]">
                {portal.walletAddress.slice(0, 8)}…{portal.walletAddress.slice(-6)}
              </p>
            ) : null}
          </div>
          <Button onClick={() => setCreateModalOpen(true)}>
            + New project
          </Button>
        </div>

        {/* Empty state */}
        {portal.projects.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#f97316]/10 border border-[#f97316]/20 flex items-center justify-center mx-auto mb-6">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-7 h-7 text-[#f97316]">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </div>
            <h2 className="font-display text-xl font-semibold text-[#f1f5f9] mb-3">
              Create your first project
            </h2>
            <p className="text-sm text-[#64748b] max-w-sm mx-auto mb-8">
              Projects are on-chain Solana accounts. Creating one requires a wallet signature to
              register it with the Fyxvo protocol.
            </p>
            <Button onClick={() => setCreateModalOpen(true)}>Create a project</Button>
          </div>
        ) : null}

        {/* Project grid */}
        {portal.projects.length > 0 ? (
          <section className="space-y-4">
            <h2 className="font-display text-lg font-semibold text-[#f1f5f9]">Your projects</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {portal.projects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  selected={portal.selectedProject?.id === project.id}
                  onSelect={() => portal.selectProject(project.id)}
                />
              ))}
            </div>
          </section>
        ) : null}

        {/* Selected project metrics */}
        {selectedProject ? (
          <section className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h2 className="font-display text-lg font-semibold text-[#f1f5f9]">
                {selectedProject.name}
              </h2>
              <div className="flex items-center gap-2">
                {isProjectActive(selectedProject) ? (
                  <Badge tone="success">Active on devnet</Badge>
                ) : (
                  <Badge tone="warning">Awaiting activation</Badge>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
                <p className="text-xs uppercase tracking-[0.14em] text-[#64748b] mb-2">
                  On-chain balance
                </p>
                <p className="font-display text-2xl font-semibold text-[#f1f5f9]">
                  {snapshot ? `${snapshot.treasurySolBalance.toFixed(4)}` : "—"}
                  {snapshot ? (
                    <span className="text-sm font-normal text-[#64748b] ml-1">SOL</span>
                  ) : null}
                </p>
              </div>

              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
                <p className="text-xs uppercase tracking-[0.14em] text-[#64748b] mb-2">
                  API keys
                </p>
                <p className="font-display text-2xl font-semibold text-[#f1f5f9]">
                  {portal.apiKeys.length}
                </p>
              </div>

              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
                <p className="text-xs uppercase tracking-[0.14em] text-[#64748b] mb-2">
                  Total requests
                </p>
                <p className="font-display text-2xl font-semibold text-[#f1f5f9]">
                  {analytics ? analytics.totals.requestLogs.toLocaleString() : "—"}
                </p>
              </div>

              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
                <p className="text-xs uppercase tracking-[0.14em] text-[#64748b] mb-2">
                  Avg latency
                </p>
                <p className="font-display text-2xl font-semibold text-[#f1f5f9]">
                  {analytics?.latency.averageMs ? `${analytics.latency.averageMs.toFixed(0)}ms` : "—"}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button asChild variant="secondary" size="sm">
                <Link href="/analytics">View analytics</Link>
              </Button>
              <Button asChild variant="secondary" size="sm">
                <Link href={`/projects/${selectedProject.slug}`}>Manage project</Link>
              </Button>
            </div>
          </section>
        ) : null}

      </div>

      {/* Create project modal */}
      <CreateProjectModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSubmit={handleCreateProject}
        creationState={portal.projectCreationState}
      />
    </div>
  );
}
