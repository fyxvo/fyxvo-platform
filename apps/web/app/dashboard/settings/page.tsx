"use client";

import { useEffect, useState } from "react";
import { usePortal } from "../../../components/portal-provider";

const API = "https://api.fyxvo.com";

const WEBHOOK_EVENTS = [
  "funding.confirmed",
  "apikey.created",
  "apikey.revoked",
  "balance.low",
  "project.activated",
] as const;

type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

interface Member {
  walletAddress: string;
  role: string;
  invitedAt?: string;
}

interface Webhook {
  id: string;
  url: string;
  events: string[];
  lastDeliveryStatus?: string;
}

interface WebhookDelivery {
  id: string;
  status: number;
  createdAt: string;
}

function GeneralSection({
  projectId,
  token,
  initialName,
  initialDescription,
}: {
  projectId: string;
  token: string;
  initialName: string;
  initialDescription: string | null;
}) {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription ?? "");
  const [tags, setTags] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [publicSlug, setPublicSlug] = useState("");
  const [notice, setNotice] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    setNotice(null);
    try {
      const r = await fetch(`${API}/v1/projects/${projectId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, description, isPublic, publicSlug }),
      });
      if (!r.ok) throw new Error();

      if (tags.trim()) {
        const tagList = tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean);
        await fetch(`${API}/v1/projects/${projectId}/tags`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ tags: tagList }),
        });
      }

      setNotice({ type: "success", msg: "Project settings saved." });
    } catch {
      setNotice({ type: "error", msg: "Failed to save project settings." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-6">
      <h2 className="text-xl font-semibold text-[#f1f5f9]">General</h2>

      {notice && (
        <p
          className={`text-sm rounded-lg px-4 py-2 ${
            notice.type === "success" ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
          }`}
        >
          {notice.msg}
        </p>
      )}

      <div className="space-y-4 max-w-lg">
        <div className="space-y-1">
          <label className="text-xs text-[#64748b]">Project name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-sm text-[#f1f5f9] focus:outline-none focus:ring-2 focus:ring-[#f97316]"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs text-[#64748b]">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-sm text-[#f1f5f9] focus:outline-none focus:ring-2 focus:ring-[#f97316] resize-none"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs text-[#64748b]">Tags (comma-separated)</label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="defi, solana, mainnet"
            className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-sm text-[#f1f5f9] placeholder-[#64748b] focus:outline-none focus:ring-2 focus:ring-[#f97316]"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsPublic(!isPublic)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
              isPublic ? "bg-[#f97316]" : "bg-white/10"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isPublic ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
          <span className="text-sm text-[#f1f5f9]">Public profile</span>
        </div>

        {isPublic && (
          <div className="space-y-1">
            <label className="text-xs text-[#64748b]">Public slug</label>
            <input
              type="text"
              value={publicSlug}
              onChange={(e) => setPublicSlug(e.target.value)}
              placeholder="my-project"
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-sm text-[#f1f5f9] placeholder-[#64748b] focus:outline-none focus:ring-2 focus:ring-[#f97316]"
            />
          </div>
        )}

        <button
          onClick={() => void save()}
          disabled={saving}
          className="rounded-xl bg-[#f97316] px-4 py-2 text-sm font-medium text-white hover:bg-[#ea6c0a] transition-colors disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </section>
  );
}

function TeamSection({ projectId, token }: { projectId: string; token: string }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteWallet, setInviteWallet] = useState("");
  const [inviteRole, setInviteRole] = useState("MEMBER");
  const [inviteNotice, setInviteNotice] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [transferWallet, setTransferWallet] = useState("");
  const [transferConfirm, setTransferConfirm] = useState(false);
  const [transferNotice, setTransferNotice] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  useEffect(() => {
    fetch(`${API}/v1/projects/${projectId}/members`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => setMembers(Array.isArray(d) ? (d as Member[]) : (d as { members?: Member[] }).members ?? []))
      .catch(() => null)
      .finally(() => setLoading(false));
  }, [projectId, token]);

  const inviteMember = async () => {
    setInviteNotice(null);
    try {
      const r = await fetch(`${API}/v1/projects/${projectId}/members/invite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ walletAddress: inviteWallet, role: inviteRole }),
      });
      if (!r.ok) throw new Error();
      setInviteNotice({ type: "success", msg: "Invitation sent." });
      setInviteWallet("");
    } catch {
      setInviteNotice({ type: "error", msg: "Failed to send invitation." });
    }
  };

  const getInviteLink = async () => {
    try {
      const r = await fetch(`${API}/v1/projects/${projectId}/invite-link`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await r.json() as { url?: string; link?: string };
      setInviteLink(d.url ?? d.link ?? null);
    } catch {
      setInviteLink(null);
    }
  };

  const transferOwnership = async () => {
    setTransferNotice(null);
    try {
      const r = await fetch(`${API}/v1/projects/${projectId}/transfer-ownership`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ walletAddress: transferWallet }),
      });
      if (!r.ok) throw new Error();
      setTransferNotice({ type: "success", msg: "Ownership transferred." });
      setTransferConfirm(false);
      setTransferWallet("");
    } catch {
      setTransferNotice({ type: "error", msg: "Failed to transfer ownership." });
    }
  };

  return (
    <section className="space-y-6">
      <h2 className="text-xl font-semibold text-[#f1f5f9]">Team</h2>

      {loading ? (
        <p className="text-sm text-[#64748b]">Loading members…</p>
      ) : members.length === 0 ? (
        <p className="text-sm text-[#64748b]">No members yet.</p>
      ) : (
        <div className="rounded-2xl border border-white/[0.08] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.08] bg-white/[0.02]">
                <th className="px-4 py-3 text-left text-xs text-[#64748b] font-medium">Wallet</th>
                <th className="px-4 py-3 text-left text-xs text-[#64748b] font-medium">Role</th>
                <th className="px-4 py-3 text-left text-xs text-[#64748b] font-medium">Invited</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m, i) => (
                <tr key={i} className="border-b border-white/[0.04] last:border-0">
                  <td className="px-4 py-3 font-mono text-xs text-[#94a3b8]">
                    {m.walletAddress.slice(0, 8)}…{m.walletAddress.slice(-4)}
                  </td>
                  <td className="px-4 py-3 text-[#f1f5f9]">{m.role}</td>
                  <td className="px-4 py-3 text-[#64748b]">
                    {m.invitedAt ? new Date(m.invitedAt).toLocaleDateString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 space-y-3 max-w-lg">
        <p className="text-sm font-medium text-[#f1f5f9]">Invite member</p>
        {inviteNotice && (
          <p
            className={`text-xs rounded px-3 py-2 ${
              inviteNotice.type === "success" ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
            }`}
          >
            {inviteNotice.msg}
          </p>
        )}
        <input
          type="text"
          value={inviteWallet}
          onChange={(e) => setInviteWallet(e.target.value)}
          placeholder="Wallet address"
          className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-sm text-[#f1f5f9] placeholder-[#64748b] focus:outline-none focus:ring-2 focus:ring-[#f97316]"
        />
        <select
          value={inviteRole}
          onChange={(e) => setInviteRole(e.target.value)}
          className="w-full rounded-xl border border-white/[0.08] bg-[#0a0a0f] px-4 py-2 text-sm text-[#f1f5f9] focus:outline-none focus:ring-2 focus:ring-[#f97316]"
        >
          <option value="MEMBER">Member</option>
          <option value="ADMIN">Admin</option>
          <option value="VIEWER">Viewer</option>
        </select>
        <button
          onClick={() => void inviteMember()}
          className="rounded-xl bg-[#f97316] px-4 py-2 text-sm font-medium text-white hover:bg-[#ea6c0a] transition-colors"
        >
          Send invite
        </button>
      </div>

      <div className="space-y-2 max-w-lg">
        <button
          onClick={() => void getInviteLink()}
          className="rounded-xl border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-medium text-[#f1f5f9] hover:bg-white/[0.08] transition-colors"
        >
          Get invite link
        </button>
        {inviteLink && (
          <div className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2">
            <span className="text-xs font-mono text-[#94a3b8] truncate flex-1">{inviteLink}</span>
            <button
              onClick={() => void navigator.clipboard.writeText(inviteLink)}
              className="text-xs text-[#f97316] hover:underline shrink-0"
            >
              Copy
            </button>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 space-y-3 max-w-lg">
        <p className="text-sm font-medium text-[#f1f5f9]">Transfer ownership</p>
        {transferNotice && (
          <p
            className={`text-xs rounded px-3 py-2 ${
              transferNotice.type === "success" ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
            }`}
          >
            {transferNotice.msg}
          </p>
        )}
        <input
          type="text"
          value={transferWallet}
          onChange={(e) => setTransferWallet(e.target.value)}
          placeholder="New owner wallet address"
          className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-sm text-[#f1f5f9] placeholder-[#64748b] focus:outline-none focus:ring-2 focus:ring-[#f97316]"
        />
        {!transferConfirm ? (
          <button
            onClick={() => setTransferConfirm(true)}
            disabled={!transferWallet}
            className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-2 text-sm font-medium text-yellow-400 hover:bg-yellow-500/20 transition-colors disabled:opacity-50"
          >
            Transfer ownership
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => void transferOwnership()}
              className="rounded-xl bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 transition-colors"
            >
              Confirm transfer
            </button>
            <button
              onClick={() => setTransferConfirm(false)}
              className="rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-[#64748b] hover:text-[#f1f5f9] transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

function WebhooksSection({ projectId, token }: { projectId: string; token: string }) {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [newUrl, setNewUrl] = useState("");
  const [newEvents, setNewEvents] = useState<Set<WebhookEvent>>(new Set());
  const [createNotice, setCreateNotice] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [testResults, setTestResults] = useState<Record<string, string>>({});
  const [deliveries, setDeliveries] = useState<Record<string, WebhookDelivery[]>>({});

  useEffect(() => {
    fetch(`${API}/v1/projects/${projectId}/webhooks`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => setWebhooks(Array.isArray(d) ? (d as Webhook[]) : (d as { webhooks?: Webhook[] }).webhooks ?? []))
      .catch(() => null)
      .finally(() => setLoading(false));
  }, [projectId, token]);

  const createWebhook = async () => {
    setCreateNotice(null);
    try {
      const r = await fetch(`${API}/v1/projects/${projectId}/webhooks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ url: newUrl, events: [...newEvents] }),
      });
      if (!r.ok) throw new Error();
      const w = await r.json() as Webhook;
      setWebhooks((prev) => [...prev, w]);
      setNewUrl("");
      setNewEvents(new Set());
      setCreateNotice({ type: "success", msg: "Webhook created." });
    } catch {
      setCreateNotice({ type: "error", msg: "Failed to create webhook." });
    }
  };

  const testWebhook = async (webhookId: string) => {
    try {
      const start = Date.now();
      const r = await fetch(`${API}/v1/projects/${projectId}/webhooks/${webhookId}/test`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const latency = Date.now() - start;
      setTestResults((prev) => ({ ...prev, [webhookId]: `${r.status} — ${latency}ms` }));
    } catch {
      setTestResults((prev) => ({ ...prev, [webhookId]: "Error" }));
    }
  };

  const fetchDeliveries = async (webhookId: string) => {
    if (deliveries[webhookId]) {
      setDeliveries((prev) => {
        const next = { ...prev };
        delete next[webhookId];
        return next;
      });
      return;
    }
    try {
      const r = await fetch(`${API}/v1/projects/${projectId}/webhooks/${webhookId}/deliveries`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await r.json() as WebhookDelivery[] | { deliveries?: WebhookDelivery[] };
      const list = Array.isArray(d) ? d : d.deliveries ?? [];
      setDeliveries((prev) => ({ ...prev, [webhookId]: list }));
    } catch {
      setDeliveries((prev) => ({ ...prev, [webhookId]: [] }));
    }
  };

  const toggleEvent = (event: WebhookEvent) => {
    setNewEvents((prev) => {
      const next = new Set(prev);
      if (next.has(event)) next.delete(event);
      else next.add(event);
      return next;
    });
  };

  return (
    <section className="space-y-6">
      <h2 className="text-xl font-semibold text-[#f1f5f9]">Webhooks</h2>

      {loading ? (
        <p className="text-sm text-[#64748b]">Loading webhooks…</p>
      ) : webhooks.length === 0 ? (
        <p className="text-sm text-[#64748b]">No webhooks configured.</p>
      ) : (
        <div className="space-y-3">
          {webhooks.map((wh) => (
            <div key={wh.id} className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-mono text-[#f1f5f9]">{wh.url}</p>
                  <p className="text-xs text-[#64748b] mt-1">{wh.events.join(", ")}</p>
                  {wh.lastDeliveryStatus && (
                    <p className="text-xs text-[#64748b]">Last delivery: {wh.lastDeliveryStatus}</p>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => void testWebhook(wh.id)}
                    className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-[#f1f5f9] hover:bg-white/[0.05] transition-colors"
                  >
                    Test
                  </button>
                  <button
                    onClick={() => void fetchDeliveries(wh.id)}
                    className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-[#f1f5f9] hover:bg-white/[0.05] transition-colors"
                  >
                    History
                  </button>
                </div>
              </div>
              {testResults[wh.id] && (
                <p className="text-xs text-[#94a3b8] font-mono">Result: {testResults[wh.id]}</p>
              )}
              {deliveries[wh.id] != null && (
                <div className="space-y-1">
                  {(deliveries[wh.id] ?? []).length === 0 ? (
                    <p className="text-xs text-[#64748b]">No deliveries.</p>
                  ) : (
                    (deliveries[wh.id] ?? []).slice(0, 10).map((d) => (
                      <div key={d.id} className="flex gap-4 text-xs text-[#64748b]">
                        <span className={d.status >= 200 && d.status < 300 ? "text-green-400" : "text-red-400"}>
                          {d.status}
                        </span>
                        <span>{new Date(d.createdAt).toLocaleString()}</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 space-y-4 max-w-lg">
        <p className="text-sm font-medium text-[#f1f5f9]">Create webhook</p>
        {createNotice && (
          <p
            className={`text-xs rounded px-3 py-2 ${
              createNotice.type === "success" ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
            }`}
          >
            {createNotice.msg}
          </p>
        )}
        <input
          type="url"
          value={newUrl}
          onChange={(e) => setNewUrl(e.target.value)}
          placeholder="https://your-server.com/webhook"
          className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-sm text-[#f1f5f9] placeholder-[#64748b] focus:outline-none focus:ring-2 focus:ring-[#f97316]"
        />
        <div className="space-y-2">
          <p className="text-xs text-[#64748b]">Events</p>
          {WEBHOOK_EVENTS.map((event) => (
            <label key={event} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={newEvents.has(event)}
                onChange={() => toggleEvent(event)}
                className="rounded border-white/10 bg-white/[0.03] text-[#f97316] focus:ring-[#f97316]"
              />
              <span className="text-sm text-[#f1f5f9] font-mono">{event}</span>
            </label>
          ))}
        </div>
        <button
          onClick={() => void createWebhook()}
          disabled={!newUrl || newEvents.size === 0}
          className="rounded-xl bg-[#f97316] px-4 py-2 text-sm font-medium text-white hover:bg-[#ea6c0a] transition-colors disabled:opacity-50"
        >
          Create webhook
        </button>
      </div>

      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 max-w-lg">
        <p className="text-xs text-[#64748b] mb-1">Webhook signature secret</p>
        <p className="text-sm text-[#94a3b8]">
          Set <code className="font-mono text-[#f97316]">FYXVO_WEBHOOK_SECRET</code> in your environment to enable request signing.
        </p>
      </div>
    </section>
  );
}

function AdvancedSection({
  projectId,
  token,
  isArchived,
}: {
  projectId: string;
  token: string;
  isArchived?: boolean;
}) {
  const [archiveConfirm, setArchiveConfirm] = useState(false);
  const [archiveNotice, setArchiveNotice] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [archived, setArchived] = useState(isArchived ?? false);

  const archiveProject = async () => {
    try {
      const r = await fetch(`${API}/v1/projects/${projectId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) throw new Error();
      setArchived(true);
      setArchiveNotice({ type: "success", msg: "Project archived." });
      setArchiveConfirm(false);
    } catch {
      setArchiveNotice({ type: "error", msg: "Failed to archive project." });
    }
  };

  const restoreProject = async () => {
    try {
      const r = await fetch(`${API}/v1/projects/${projectId}/restore`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) throw new Error();
      setArchived(false);
      setArchiveNotice({ type: "success", msg: "Project restored." });
    } catch {
      setArchiveNotice({ type: "error", msg: "Failed to restore project." });
    }
  };

  return (
    <section className="space-y-6">
      <h2 className="text-xl font-semibold text-[#f1f5f9]">Advanced</h2>

      <div className="rounded-2xl border border-red-500/30 bg-red-500/[0.03] p-5 space-y-4 max-w-lg">
        <p className="text-sm font-semibold text-red-400">Danger zone</p>

        {archiveNotice && (
          <p
            className={`text-xs rounded px-3 py-2 ${
              archiveNotice.type === "success" ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
            }`}
          >
            {archiveNotice.msg}
          </p>
        )}

        {!archived ? (
          <div className="space-y-2">
            <p className="text-sm text-[#64748b]">
              Archiving this project will disable all API keys and stop request routing.
            </p>
            {!archiveConfirm ? (
              <button
                onClick={() => setArchiveConfirm(true)}
                className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/20 transition-colors"
              >
                Archive project
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => void archiveProject()}
                  className="rounded-xl bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 transition-colors"
                >
                  Confirm archive
                </button>
                <button
                  onClick={() => setArchiveConfirm(false)}
                  className="rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-[#64748b] hover:text-[#f1f5f9] transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-[#64748b]">This project is archived.</p>
            <button
              onClick={() => void restoreProject()}
              className="rounded-xl border border-green-500/40 bg-green-500/10 px-4 py-2 text-sm font-medium text-green-400 hover:bg-green-500/20 transition-colors"
            >
              Restore project
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

export default function DashboardSettingsPage() {
  const portal = usePortal();

  if (portal.walletPhase !== "authenticated" || !portal.token) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center py-20">
        <div className="mx-auto max-w-md text-center">
          <p className="text-[#64748b] text-sm mb-4">Connect your wallet to access project settings.</p>
          <p className="text-xs text-[#64748b]">Use the wallet button in the header to authenticate.</p>
        </div>
      </div>
    );
  }

  const project = portal.selectedProject;

  if (!project) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center py-20">
        <p className="text-[#64748b] text-sm">No project selected.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-[#f1f5f9] mb-12">Project Settings</h1>

        <div className="space-y-16">
          <GeneralSection
            projectId={project.id}
            token={portal.token}
            initialName={project.name}
            initialDescription={project.description}
          />

          <div className="border-t border-white/[0.08]" />

          <TeamSection projectId={project.id} token={portal.token} />

          <div className="border-t border-white/[0.08]" />

          <WebhooksSection projectId={project.id} token={portal.token} />

          <div className="border-t border-white/[0.08]" />

          <AdvancedSection projectId={project.id} token={portal.token} />
        </div>
      </div>
    </div>
  );
}
