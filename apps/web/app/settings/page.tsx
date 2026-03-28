"use client";

import { useEffect, useState } from "react";
import { usePortal } from "../../components/portal-provider";

const API = "https://api.fyxvo.com";

type Tab = "notifications" | "email" | "digest" | "preferences" | "diagnostics";

function ToggleSwitch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#f97316] focus:ring-offset-2 focus:ring-offset-[#0a0a0f] ${
        checked ? "bg-[#f97316]" : "bg-white/10"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

function NotificationsTab({ token }: { token: string }) {
  const [prefs, setPrefs] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  useEffect(() => {
    fetch(`${API}/v1/notifications/preferences`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => {
        setPrefs(typeof d === "object" && d !== null ? (d as Record<string, boolean>) : {});
      })
      .catch(() => setNotice({ type: "error", msg: "Failed to load preferences." }))
      .finally(() => setLoading(false));
  }, [token]);

  const toggle = async (key: string, value: boolean) => {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    setSaving(true);
    setNotice(null);
    try {
      const r = await fetch(`${API}/v1/notifications/preferences`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(next),
      });
      if (!r.ok) throw new Error();
      setNotice({ type: "success", msg: "Saved." });
    } catch {
      setNotice({ type: "error", msg: "Failed to save." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-[#64748b] text-sm">Loading preferences…</p>;
  }

  const keys = Object.keys(prefs);
  if (keys.length === 0) {
    return <p className="text-[#64748b] text-sm">No notification preferences found.</p>;
  }

  return (
    <div className="space-y-4">
      {notice && (
        <p
          className={`text-sm rounded-lg px-4 py-2 ${
            notice.type === "success"
              ? "bg-green-500/10 text-green-400"
              : "bg-red-500/10 text-red-400"
          }`}
        >
          {notice.msg}
        </p>
      )}
      {keys.map((key) => (
        <div
          key={key}
          className="flex items-center justify-between rounded-2xl border border-white/[0.08] bg-white/[0.03] px-5 py-4"
        >
          <span className="text-sm font-medium text-[#f1f5f9] capitalize">
            {key.replace(/_/g, " ")}
          </span>
          <ToggleSwitch
            checked={!!prefs[key]}
            onChange={(v) => void toggle(key, v)}
          />
        </div>
      ))}
      {saving && <p className="text-xs text-[#64748b]">Saving…</p>}
    </div>
  );
}

function EmailTab({ token, email }: { token: string; email?: string | null }) {
  const [verifyStatus, setVerifyStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [testStatus, setTestStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [deliveryStatus, setDeliveryStatus] = useState<Record<string, unknown> | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);

  useEffect(() => {
    fetch(`${API}/v1/me/email-delivery-status`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => setDeliveryStatus(d as Record<string, unknown>))
      .catch(() => null)
      .finally(() => setLoadingStatus(false));
  }, [token]);

  const requestVerify = async () => {
    setVerifyStatus(null);
    try {
      const r = await fetch(`${API}/v1/me/verify-email/request`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) throw new Error();
      setVerifyStatus({ type: "success", msg: "Verification email sent." });
    } catch {
      setVerifyStatus({ type: "error", msg: "Failed to send verification email." });
    }
  };

  const sendTest = async () => {
    setTestStatus(null);
    try {
      const r = await fetch(`${API}/v1/me/email-delivery/test`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await r.json().catch(() => null);
      if (!r.ok) throw new Error((d as { message?: string })?.message ?? "Failed");
      setTestStatus({ type: "success", msg: `Test sent. ${JSON.stringify(d)}` });
    } catch (e) {
      setTestStatus({ type: "error", msg: e instanceof Error ? e.message : "Failed to send test." });
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-5 py-4">
        <p className="text-xs text-[#64748b] uppercase tracking-wider mb-1">Current email</p>
        <p className="text-sm text-[#f1f5f9]">{email ?? "Not set"}</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => void requestVerify()}
          className="rounded-xl bg-[#f97316] px-4 py-2 text-sm font-medium text-white hover:bg-[#ea6c0a] transition-colors"
        >
          Request verification
        </button>
        <button
          onClick={() => void sendTest()}
          className="rounded-xl border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-medium text-[#f1f5f9] hover:bg-white/[0.08] transition-colors"
        >
          Send test email
        </button>
      </div>

      {verifyStatus && (
        <p
          className={`text-sm rounded-lg px-4 py-2 ${
            verifyStatus.type === "success" ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
          }`}
        >
          {verifyStatus.msg}
        </p>
      )}
      {testStatus && (
        <p
          className={`text-sm rounded-lg px-4 py-2 ${
            testStatus.type === "success" ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
          }`}
        >
          {testStatus.msg}
        </p>
      )}

      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-5 py-4">
        <p className="text-xs text-[#64748b] uppercase tracking-wider mb-2">Delivery status</p>
        {loadingStatus ? (
          <p className="text-sm text-[#64748b]">Loading…</p>
        ) : deliveryStatus ? (
          <pre className="text-xs font-mono text-[#94a3b8] overflow-auto whitespace-pre-wrap">
            {JSON.stringify(deliveryStatus, null, 2)}
          </pre>
        ) : (
          <p className="text-sm text-[#64748b]">No status available.</p>
        )}
      </div>
    </div>
  );
}

function DigestTab({ token }: { token: string }) {
  const [enrolled, setEnrolled] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [notice, setNotice] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  useEffect(() => {
    fetch(`${API}/v1/me/digest`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => {
        const dd = d as { enrolled?: boolean };
        setEnrolled(dd.enrolled ?? false);
      })
      .catch(() => setEnrolled(false))
      .finally(() => setLoading(false));
  }, [token]);

  const enroll = async () => {
    setWorking(true);
    setNotice(null);
    try {
      const r = await fetch(`${API}/v1/me/digest`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) throw new Error();
      setEnrolled(true);
      setNotice({ type: "success", msg: "Enrolled in weekly digest." });
    } catch {
      setNotice({ type: "error", msg: "Failed to enroll." });
    } finally {
      setWorking(false);
    }
  };

  const unenroll = async () => {
    setWorking(true);
    setNotice(null);
    try {
      const r = await fetch(`${API}/v1/me/digest`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) throw new Error();
      setEnrolled(false);
      setNotice({ type: "success", msg: "Unenrolled from weekly digest." });
    } catch {
      setNotice({ type: "error", msg: "Failed to unenroll." });
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-5 py-4">
        <p className="text-xs text-[#64748b] uppercase tracking-wider mb-1">Enrollment status</p>
        {loading ? (
          <p className="text-sm text-[#64748b]">Loading…</p>
        ) : (
          <p className="text-sm font-medium text-[#f1f5f9]">
            {enrolled ? "Enrolled in weekly digest" : "Not enrolled"}
          </p>
        )}
      </div>

      {notice && (
        <p
          className={`text-sm rounded-lg px-4 py-2 ${
            notice.type === "success" ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
          }`}
        >
          {notice.msg}
        </p>
      )}

      <div className="flex gap-3">
        {!enrolled && (
          <button
            onClick={() => void enroll()}
            disabled={working || loading}
            className="rounded-xl bg-[#f97316] px-4 py-2 text-sm font-medium text-white hover:bg-[#ea6c0a] transition-colors disabled:opacity-50"
          >
            Enroll in weekly digest
          </button>
        )}
        {enrolled && (
          <button
            onClick={() => void unenroll()}
            disabled={working}
            className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50"
          >
            Unenroll
          </button>
        )}
      </div>
    </div>
  );
}

function PreferencesTab({ token }: { token: string }) {
  const [prefs, setPrefs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  useEffect(() => {
    fetch(`${API}/v1/me/dashboard-preferences`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => {
        const flat: Record<string, string> = {};
        if (typeof d === "object" && d !== null) {
          for (const [k, v] of Object.entries(d as Record<string, unknown>)) {
            flat[k] = String(v ?? "");
          }
        }
        setPrefs(flat);
      })
      .catch(() => setNotice({ type: "error", msg: "Failed to load preferences." }))
      .finally(() => setLoading(false));
  }, [token]);

  const save = async () => {
    setSaving(true);
    setNotice(null);
    try {
      const r = await fetch(`${API}/v1/me/dashboard-preferences`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(prefs),
      });
      if (!r.ok) throw new Error();
      setNotice({ type: "success", msg: "Preferences saved." });
    } catch {
      setNotice({ type: "error", msg: "Failed to save preferences." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-[#64748b] text-sm">Loading…</p>;
  }

  const keys = Object.keys(prefs);

  return (
    <div className="space-y-4">
      {notice && (
        <p
          className={`text-sm rounded-lg px-4 py-2 ${
            notice.type === "success" ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
          }`}
        >
          {notice.msg}
        </p>
      )}

      {keys.length === 0 ? (
        <p className="text-[#64748b] text-sm">No preferences found.</p>
      ) : (
        keys.map((key) => (
          <div key={key} className="space-y-1">
            <label className="text-xs text-[#64748b] capitalize">{key.replace(/_/g, " ")}</label>
            <input
              type="text"
              value={prefs[key]}
              onChange={(e) => setPrefs({ ...prefs, [key]: e.target.value })}
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-sm text-[#f1f5f9] placeholder-[#64748b] focus:outline-none focus:ring-2 focus:ring-[#f97316]"
            />
          </div>
        ))
      )}

      <button
        onClick={() => void save()}
        disabled={saving}
        className="rounded-xl bg-[#f97316] px-4 py-2 text-sm font-medium text-white hover:bg-[#ea6c0a] transition-colors disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save preferences"}
      </button>
    </div>
  );
}

function DiagnosticsTab({ token }: { token: string }) {
  const [data, setData] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API}/v1/me/session-diagnostics`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then(setData)
      .catch(() => setError("Failed to load diagnostics."))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div>
      {loading && <p className="text-[#64748b] text-sm">Loading…</p>}
      {error && <p className="text-sm text-red-400">{error}</p>}
      {data !== null && (
        <pre className="text-xs font-mono overflow-auto rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 text-[#94a3b8] max-h-[600px]">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const portal = usePortal();
  const [activeTab, setActiveTab] = useState<Tab>("notifications");

  if (portal.walletPhase !== "authenticated" || !portal.token) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center py-20">
        <div className="mx-auto max-w-md text-center">
          <p className="text-[#64748b] text-sm mb-4">Connect your wallet to access settings.</p>
          <p className="text-xs text-[#64748b]">
            Use the wallet button in the header to authenticate.
          </p>
        </div>
      </div>
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "notifications", label: "Notifications" },
    { id: "email", label: "Email" },
    { id: "digest", label: "Digest" },
    { id: "preferences", label: "Preferences" },
    { id: "diagnostics", label: "Diagnostics" },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0f] py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-[#f1f5f9] mb-8">Settings</h1>

        <div className="flex flex-wrap gap-2 mb-8 border-b border-white/[0.08] pb-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-[#f97316] text-white"
                  : "text-[#64748b] hover:text-[#f1f5f9] hover:bg-white/[0.05]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="max-w-2xl">
          {activeTab === "notifications" && <NotificationsTab token={portal.token} />}
          {activeTab === "email" && (
            <EmailTab token={portal.token} email={portal.user?.walletAddress ?? null} />
          )}
          {activeTab === "digest" && <DigestTab token={portal.token} />}
          {activeTab === "preferences" && <PreferencesTab token={portal.token} />}
          {activeTab === "diagnostics" && <DiagnosticsTab token={portal.token} />}
        </div>
      </div>
    </div>
  );
}
