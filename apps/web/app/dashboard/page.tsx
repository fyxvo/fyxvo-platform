"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Button, Notice } from "@fyxvo/ui";
import { verifyProjectActivation } from "../../lib/api";
import { usePortal } from "../../lib/portal-context";
import { signAndSubmitVersionedTransaction } from "../../lib/solana-transactions";
import type { PortalProject, ProjectActivationVerification } from "../../lib/types";
import { AddressLink } from "../../components/address-link";
import { AuthGate } from "../../components/state-panels";

const TEMPLATE_OPTIONS = [
  {
    value: "blank",
    label: "Blank workspace",
    description: "Start with the raw control-plane surfaces and define the project shape yourself.",
  },
  {
    value: "defi",
    label: "DeFi workload",
    description: "Use a template that assumes transaction-heavy relay traffic and more frequent funding checks.",
  },
  {
    value: "indexing",
    label: "Indexing workload",
    description: "Use a template aimed at read-heavy request patterns and higher analytics visibility.",
  },
] as const;

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function ProjectSummary({ project }: { project: PortalProject }) {
  return (
    <div className="rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-4">
      <p className="text-xs uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">
        {project.status}
      </p>
      <h2 className="mt-2 text-lg font-semibold text-[var(--fyxvo-text)]">{project.name}</h2>
      <p className="mt-2 text-sm leading-6 text-[var(--fyxvo-text-soft)]">
        {project.description?.trim() || "No description has been recorded for this project yet."}
      </p>
      <div className="mt-4 flex flex-wrap gap-3 text-xs text-[var(--fyxvo-text-muted)]">
        <span>Slug: {project.slug}</span>
        <span>Network: {project.network}</span>
        {project.templateType ? <span>Template: {project.templateType}</span> : null}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const {
    token,
    projects,
    selectedProject,
    setSelectedProject,
    createProject,
    refreshProjects,
  } = usePortal();

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [templateType, setTemplateType] = useState<(typeof TEMPLATE_OPTIONS)[number]["value"]>(
    "blank"
  );
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<ProjectActivationVerification | null>(null);

  const activeTemplate = useMemo(
    () => TEMPLATE_OPTIONS.find((option) => option.value === templateType) ?? TEMPLATE_OPTIONS[0],
    [templateType]
  );

  async function handleCreateProject(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token) {
      setError("Reconnect your wallet before creating a project.");
      return;
    }

    if (!wallet.signTransaction) {
      setError("This wallet does not support transaction signing.");
      return;
    }

    setCreating(true);
    setError(null);
    setSuccess(null);

    try {
      const created = await createProject({
        name: name.trim(),
        slug: slug.trim(),
        templateType,
        ...(description.trim() ? { description: description.trim() } : {}),
      });

      const signature = await signAndSubmitVersionedTransaction({
        connection,
        signTransaction: wallet.signTransaction,
        transactionBase64: created.activation.transactionBase64,
        recentBlockhash: created.activation.recentBlockhash,
        lastValidBlockHeight: created.activation.lastValidBlockHeight,
      });

      const verification = await verifyProjectActivation({
        projectId: created.item.id,
        token,
        signature,
      });

      const updatedProjects = await refreshProjects();
      const freshProject =
        updatedProjects.find((project) => project.id === created.item.id) ?? created.item;
      setSelectedProject(freshProject);
      setSuccess(verification);
      setCreateModalOpen(false);
      setName("");
      setSlug("");
      setDescription("");
      setTemplateType("blank");
    } catch (creationError) {
      setError(
        creationError instanceof Error
          ? creationError.message
          : "Unable to create and activate this project."
      );
    } finally {
      setCreating(false);
    }
  }

  return (
    <AuthGate>
      <div className="space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--fyxvo-text)]">
              Dashboard
            </h1>
            <p className="mt-1 text-sm text-[var(--fyxvo-text-muted)]">
              Create projects, activate them on Solana devnet, and keep the selected workspace in
              sync with the control plane.
            </p>
          </div>
          <Button type="button" onClick={() => setCreateModalOpen(true)}>
            Create project
          </Button>
        </div>

        {error ? <Notice tone="danger">{error}</Notice> : null}
        {success ? (
          <Notice tone="success">
            Project activation verified. The project PDA is{" "}
            <AddressLink address={success.onchain.projectPda} className="font-mono text-sm text-[var(--fyxvo-brand)]" />
            .
          </Notice>
        ) : null}

        {projects.length > 0 ? (
          <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
            <div className="space-y-3">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className={`rounded-2xl border px-4 py-4 transition-colors ${
                    selectedProject?.id === project.id
                      ? "border-[var(--fyxvo-brand)] bg-[var(--fyxvo-panel)]"
                      : "border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] hover:border-[var(--fyxvo-border-strong)]"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedProject(project)}
                    className="w-full text-left"
                  >
                    <p className="text-sm font-medium text-[var(--fyxvo-text)]">{project.name}</p>
                    <p className="mt-1 text-sm text-[var(--fyxvo-text-muted)]">{project.slug}</p>
                  </button>
                  <div className="mt-3">
                    <Link
                      href={`/projects/${project.slug}`}
                      className="text-sm font-medium text-[var(--fyxvo-brand)] transition-colors hover:text-[var(--fyxvo-text)]"
                    >
                      Open project workspace
                    </Link>
                  </div>
                </div>
              ))}
            </div>
            {selectedProject ? <ProjectSummary project={selectedProject} /> : null}
          </div>
        ) : (
          <div className="rounded-[2rem] border border-dashed border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-8">
            <h2 className="text-xl font-semibold text-[var(--fyxvo-text)]">No projects yet</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--fyxvo-text-soft)]">
              Create a project here to generate the activation transaction, sign it in your wallet,
              and verify it so the workspace and on-chain protocol are aligned from the first step.
            </p>
          </div>
        )}

        {createModalOpen ? (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 px-4">
            <div className="w-full max-w-2xl rounded-[2rem] border border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-brand)]">
                    Create project
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-[var(--fyxvo-text)]">
                    Create and activate a new workspace
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="rounded-full border border-[var(--fyxvo-border)] px-3 py-1 text-sm text-[var(--fyxvo-text-muted)]"
                >
                  Close
                </button>
              </div>

              <form className="mt-8 space-y-5" onSubmit={(event) => void handleCreateProject(event)}>
                <label className="block">
                  <span className="text-sm font-medium text-[var(--fyxvo-text)]">Project name</span>
                  <input
                    value={name}
                    onChange={(event) => {
                      const nextName = event.target.value;
                      setName(nextName);
                      setSlug((current) => (current ? current : slugify(nextName)));
                    }}
                    required
                    className="mt-2 h-11 w-full rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 text-sm text-[var(--fyxvo-text)] outline-none focus:border-[var(--fyxvo-brand)]"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-[var(--fyxvo-text)]">Slug</span>
                  <input
                    value={slug}
                    onChange={(event) => setSlug(slugify(event.target.value))}
                    required
                    pattern="[a-z0-9-]+"
                    className="mt-2 h-11 w-full rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 text-sm text-[var(--fyxvo-text)] outline-none focus:border-[var(--fyxvo-brand)]"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-[var(--fyxvo-text)]">Description</span>
                  <textarea
                    rows={4}
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 py-3 text-sm text-[var(--fyxvo-text)] outline-none focus:border-[var(--fyxvo-brand)]"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-[var(--fyxvo-text)]">Template</span>
                  <select
                    value={templateType}
                    onChange={(event) =>
                      setTemplateType(
                        event.target.value as (typeof TEMPLATE_OPTIONS)[number]["value"]
                      )
                    }
                    className="mt-2 h-11 w-full rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 text-sm text-[var(--fyxvo-text)] outline-none focus:border-[var(--fyxvo-brand)]"
                  >
                    {TEMPLATE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 text-sm leading-6 text-[var(--fyxvo-text-muted)]">
                    {activeTemplate.description}
                  </p>
                </label>

                <div className="flex gap-3">
                  <Button type="submit" loading={creating} disabled={creating}>
                    Create and activate
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setCreateModalOpen(false)}
                    disabled={creating}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          </div>
        ) : null}
      </div>
    </AuthGate>
  );
}
