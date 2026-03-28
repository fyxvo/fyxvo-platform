"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Notice } from "@fyxvo/ui";
import { LoadingSkeleton } from "../../components/loading-skeleton";
import { RetryBanner } from "../../components/retry-banner";
import { AuthGate } from "../../components/state-panels";
import { createSupportTicket, getSupportTickets } from "../../lib/api";
import { usePortal } from "../../lib/portal-context";
import type { SupportTicket } from "../../lib/types";

export default function SupportPage() {
  const { token, projects, selectedProject } = usePortal();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [category, setCategory] = useState<"general" | "billing" | "technical" | "security">(
    "technical"
  );
  const [priority, setPriority] = useState<"low" | "normal" | "high" | "urgent">("normal");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (selectedProject && !projectId) {
      setProjectId(selectedProject.id);
    }
  }, [selectedProject, projectId]);

  const loadTickets = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);

    try {
      setTickets(await getSupportTickets(token));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load support tickets.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    setSubmitting(true);
    setError(null);
    setNotice(null);

    try {
      const ticket = await createSupportTicket({
        token,
        category,
        priority,
        subject: subject.trim(),
        description: description.trim(),
        ...(projectId ? { projectId } : {}),
      });

      setTickets((current) => [ticket, ...current]);
      setNotice("Support ticket submitted.");
      setSubject("");
      setDescription("");
      setPriority("normal");
      setCategory("technical");
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Unable to submit support ticket."
      );
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    void loadTickets();
  }, [loadTickets]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <AuthGate>
        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[2rem] border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-6">
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--fyxvo-text)]">
              Support
            </h1>
            <p className="mt-2 text-sm leading-6 text-[var(--fyxvo-text-muted)]">
              Open a support ticket for onboarding friction, technical issues, billing questions,
              or security concerns tied to your workspace.
            </p>

            <form className="mt-6 space-y-4" onSubmit={(event) => void handleSubmit(event)}>
              {error ? <RetryBanner message={error} onRetry={() => void loadTickets()} /> : null}
              {notice ? <Notice tone="success">{notice}</Notice> : null}

              <label className="block">
                <span className="text-sm font-medium text-[var(--fyxvo-text)]">Project</span>
                <select
                  value={projectId}
                  onChange={(event) => setProjectId(event.target.value)}
                  className="mt-2 h-11 w-full rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 text-sm text-[var(--fyxvo-text)] outline-none focus:border-[var(--fyxvo-brand)]"
                >
                  <option value="">No specific project</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-medium text-[var(--fyxvo-text)]">Category</span>
                  <select
                    value={category}
                    onChange={(event) =>
                      setCategory(
                        event.target.value as "general" | "billing" | "technical" | "security"
                      )
                    }
                    className="mt-2 h-11 w-full rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 text-sm text-[var(--fyxvo-text)] outline-none focus:border-[var(--fyxvo-brand)]"
                  >
                    <option value="general">General</option>
                    <option value="billing">Billing</option>
                    <option value="technical">Technical</option>
                    <option value="security">Security</option>
                  </select>
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-[var(--fyxvo-text)]">Priority</span>
                  <select
                    value={priority}
                    onChange={(event) =>
                      setPriority(
                        event.target.value as "low" | "normal" | "high" | "urgent"
                      )
                    }
                    className="mt-2 h-11 w-full rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 text-sm text-[var(--fyxvo-text)] outline-none focus:border-[var(--fyxvo-brand)]"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </label>
              </div>

              <label className="block">
                <span className="text-sm font-medium text-[var(--fyxvo-text)]">Subject</span>
                <input
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  required
                  minLength={5}
                  className="mt-2 h-11 w-full rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 text-sm text-[var(--fyxvo-text)] outline-none focus:border-[var(--fyxvo-brand)]"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-[var(--fyxvo-text)]">Description</span>
                <textarea
                  rows={7}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  required
                  minLength={10}
                  className="mt-2 w-full rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 py-3 text-sm text-[var(--fyxvo-text)] outline-none focus:border-[var(--fyxvo-brand)]"
                />
              </label>

              <Button type="submit" loading={submitting} disabled={submitting}>
                Submit ticket
              </Button>
            </form>
          </div>

          <div className="rounded-[2rem] border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-6">
            <h2 className="text-xl font-semibold text-[var(--fyxvo-text)]">Your tickets</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--fyxvo-text-muted)]">
              Recent support requests linked to this wallet session.
            </p>

            <div className="mt-6 space-y-4">
              {loading ? (
                <>
                  <LoadingSkeleton className="h-24 rounded-2xl" />
                  <LoadingSkeleton className="h-24 rounded-2xl" />
                </>
              ) : tickets.length > 0 ? (
                tickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="rounded-2xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-[var(--fyxvo-border)] px-3 py-1 text-xs text-[var(--fyxvo-text-muted)]">
                        {ticket.status}
                      </span>
                      <span className="rounded-full border border-[var(--fyxvo-border)] px-3 py-1 text-xs text-[var(--fyxvo-text-muted)]">
                        {ticket.priority}
                      </span>
                      {ticket.projectName ? (
                        <span className="rounded-full border border-[var(--fyxvo-border)] px-3 py-1 text-xs text-[var(--fyxvo-text-muted)]">
                          {ticket.projectName}
                        </span>
                      ) : null}
                    </div>
                    <h3 className="mt-3 text-lg font-semibold text-[var(--fyxvo-text)]">
                      {ticket.subject}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-[var(--fyxvo-text-soft)]">
                      {ticket.description}
                    </p>
                    {ticket.adminResponse ? (
                      <div className="mt-4 rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)] p-4">
                        <p className="text-xs uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">
                          Admin response
                        </p>
                        <p className="mt-2 text-sm leading-6 text-[var(--fyxvo-text-soft)]">
                          {ticket.adminResponse}
                        </p>
                      </div>
                    ) : null}
                    <p className="mt-3 text-xs text-[var(--fyxvo-text-muted)]">
                      Opened {new Date(ticket.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-6 text-center">
                  <p className="text-sm font-medium text-[var(--fyxvo-text)]">No tickets yet</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--fyxvo-text-muted)]">
                    Submit a ticket from the form to start a support thread with the team.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </AuthGate>
    </div>
  );
}
