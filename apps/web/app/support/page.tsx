"use client";

import { type FormEvent, useEffect, useState } from "react";
import { usePortal } from "../../components/portal-provider";

const API = "https://api.fyxvo.com";

interface Ticket {
  id: string;
  subject: string;
  status: "open" | "resolved" | "closed";
  createdAt: string;
  message?: string;
  category?: string;
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    open: "bg-blue-500/15 text-blue-400",
    resolved: "bg-green-500/15 text-green-400",
    closed: "bg-white/10 text-[#64748b]",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status] ?? "bg-white/10 text-[#64748b]"}`}>
      {status}
    </span>
  );
}

export default function SupportPage() {
  const portal = usePortal();

  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("General inquiry");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<
    { type: "success"; ticketId: string } | { type: "error"; msg: string } | null
  >(null);

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedData, setExpandedData] = useState<Record<string, Ticket>>({});

  useEffect(() => {
    if (!portal.token) {
      setTicketsLoading(false);
      return;
    }
    fetch(`${API}/v1/support/tickets`, {
      headers: { Authorization: `Bearer ${portal.token}` },
    })
      .then((r) => r.json())
      .then((d) => {
        const arr = Array.isArray(d) ? d : (d as { tickets?: Ticket[] }).tickets ?? [];
        setTickets(arr as Ticket[]);
      })
      .catch(() => null)
      .finally(() => setTicketsLoading(false));
  }, [portal.token]);

  if (portal.walletPhase !== "authenticated" || !portal.token) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center py-20">
        <div className="mx-auto max-w-md text-center">
          <p className="text-[#64748b] text-sm mb-4">Connect your wallet to access support.</p>
          <p className="text-xs text-[#64748b]">Use the wallet button in the header to authenticate.</p>
        </div>
      </div>
    );
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitResult(null);
    try {
      const r = await fetch(`${API}/v1/support/tickets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${portal.token}`,
        },
        body: JSON.stringify({ subject, category, message }),
      });
      const d = await r.json() as { id?: string; ticketId?: string };
      if (!r.ok) throw new Error();
      const ticketId = d.id ?? d.ticketId ?? "—";
      setSubmitResult({ type: "success", ticketId });
      setSubject("");
      setCategory("General inquiry");
      setMessage("");
      const newTicket: Ticket = { id: ticketId, subject, status: "open", createdAt: new Date().toISOString(), category };
      setTickets((prev) => [newTicket, ...prev]);
    } catch {
      setSubmitResult({ type: "error", msg: "Failed to submit ticket. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  const expandTicket = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    if (expandedData[id]) return;
    try {
      const r = await fetch(`${API}/v1/support/tickets/${id}`, {
        headers: { Authorization: `Bearer ${portal.token!}` },
      });
      const d = await r.json() as Ticket;
      setExpandedData((prev) => ({ ...prev, [id]: d }));
    } catch {
      // keep existing data
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-[#f1f5f9] mb-4">Support</h1>
        <p className="text-[#64748b] mb-12 max-w-xl">
          Submit a support request and track your open tickets below.
        </p>

        {/* Ticket submission form */}
        <div className="max-w-2xl mb-16">
          <h2 className="text-lg font-semibold text-[#f1f5f9] mb-6">Submit a ticket</h2>

          {submitResult?.type === "success" ? (
            <div className="rounded-2xl border border-green-500/20 bg-green-500/10 p-6 text-center">
              <p className="text-green-400 font-medium mb-1">Ticket submitted successfully.</p>
              <p className="text-sm text-[#64748b]">
                Ticket ID: <span className="font-mono text-[#f1f5f9]">{submitResult.ticketId}</span>
              </p>
              <button
                onClick={() => setSubmitResult(null)}
                className="mt-4 text-sm text-[#f97316] hover:underline"
              >
                Submit another
              </button>
            </div>
          ) : (
            <form onSubmit={(e) => void submit(e)} className="space-y-4">
              {submitResult?.type === "error" && (
                <p className="text-sm rounded-lg px-4 py-2 bg-red-500/10 text-red-400">{submitResult.msg}</p>
              )}

              <div className="space-y-1">
                <label className="text-xs text-[#64748b]">Subject</label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-sm text-[#f1f5f9] placeholder-[#64748b] focus:outline-none focus:ring-2 focus:ring-[#f97316]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-[#64748b]">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-xl border border-white/[0.08] bg-[#0a0a0f] px-4 py-2 text-sm text-[#f1f5f9] focus:outline-none focus:ring-2 focus:ring-[#f97316]"
                >
                  <option>General inquiry</option>
                  <option>Technical issue</option>
                  <option>Billing</option>
                  <option>Feature request</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-[#64748b]">Message</label>
                <textarea
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={5}
                  className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-sm text-[#f1f5f9] placeholder-[#64748b] focus:outline-none focus:ring-2 focus:ring-[#f97316] resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="rounded-xl bg-[#f97316] px-6 py-2.5 text-sm font-medium text-white hover:bg-[#ea6c0a] transition-colors disabled:opacity-50"
              >
                {submitting ? "Submitting…" : "Submit ticket"}
              </button>
            </form>
          )}
        </div>

        {/* Ticket list */}
        <div>
          <h2 className="text-lg font-semibold text-[#f1f5f9] mb-6">Your tickets</h2>

          {ticketsLoading ? (
            <p className="text-sm text-[#64748b]">Loading tickets…</p>
          ) : tickets.length === 0 ? (
            <p className="text-sm text-[#64748b]">No tickets yet.</p>
          ) : (
            <div className="rounded-2xl border border-white/[0.08] overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.08] bg-white/[0.02]">
                    <th className="px-4 py-3 text-left text-xs text-[#64748b] font-medium">Subject</th>
                    <th className="px-4 py-3 text-left text-xs text-[#64748b] font-medium">Status</th>
                    <th className="px-4 py-3 text-left text-xs text-[#64748b] font-medium">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((ticket) => (
                    <>
                      <tr
                        key={ticket.id}
                        onClick={() => void expandTicket(ticket.id)}
                        className="border-b border-white/[0.04] cursor-pointer hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="px-4 py-3 text-[#f1f5f9]">{ticket.subject}</td>
                        <td className="px-4 py-3">
                          <StatusBadge status={ticket.status} />
                        </td>
                        <td className="px-4 py-3 text-[#64748b]">
                          {new Date(ticket.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                      {expandedId === ticket.id && (
                        <tr key={`${ticket.id}-detail`}>
                          <td colSpan={3} className="px-4 py-4 bg-white/[0.02] border-b border-white/[0.04]">
                            {expandedData[ticket.id] != null ? (
                              <div className="space-y-2 text-sm">
                                {expandedData[ticket.id]?.category && (
                                  <p className="text-[#64748b]">
                                    Category:{" "}
                                    <span className="text-[#f1f5f9]">{expandedData[ticket.id]?.category}</span>
                                  </p>
                                )}
                                {expandedData[ticket.id]?.message && (
                                  <p className="text-[#94a3b8] whitespace-pre-wrap">
                                    {expandedData[ticket.id]?.message}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <p className="text-sm text-[#64748b]">Loading…</p>
                            )}
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
