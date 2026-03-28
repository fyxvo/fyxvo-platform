"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePortal } from "../../../components/portal-provider";

const API = "https://api.fyxvo.com";

interface InviteInfo {
  projectName: string;
  inviterWallet: string;
  expiresAt: string;
  projectId: string;
}

type InviteState =
  | { status: "loading" }
  | { status: "valid"; info: InviteInfo }
  | { status: "invalid"; message: string }
  | { status: "accepted" }
  | { status: "declined" };

function shortenWallet(address: string) {
  if (address.length <= 14) return address;
  return `${address.slice(0, 8)}…${address.slice(-6)}`;
}

export default function InvitePage({
  params,
}: {
  readonly params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const router = useRouter();
  const portal = usePortal();

  const [state, setState] = useState<InviteState>({ status: "loading" });
  const [acting, setActing] = useState<"accept" | "decline" | null>(null);

  useEffect(() => {
    if (!token) {
      setState({ status: "invalid", message: "Invalid invite link." });
      return;
    }
    void fetch(`${API}/v1/invite/${token}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as {
            message?: string;
          };
          setState({
            status: "invalid",
            message:
              body.message ?? "This invite link is invalid or has expired.",
          });
          return;
        }
        const data = (await res.json()) as InviteInfo;
        setState({ status: "valid", info: data });
      })
      .catch(() => {
        setState({
          status: "invalid",
          message: "Could not reach the server. Please try again.",
        });
      });
  }, [token]);

  async function handleAccept() {
    if (!portal.token) return;
    setActing("accept");
    try {
      const res = await fetch(`${API}/v1/invite/${token}/accept`, {
        method: "POST",
        headers: { Authorization: `Bearer ${portal.token}` },
      });
      if (res.ok) {
        setState({ status: "accepted" });
        setTimeout(() => void router.push("/dashboard"), 2000);
      } else {
        const body = (await res.json().catch(() => ({}))) as {
          message?: string;
        };
        setState({
          status: "invalid",
          message: body.message ?? "Could not accept the invitation.",
        });
      }
    } catch {
      setState({
        status: "invalid",
        message: "Network error. Please try again.",
      });
    } finally {
      setActing(null);
    }
  }

  async function handleDecline() {
    if (!portal.token) return;
    setActing("decline");
    try {
      await fetch(`${API}/v1/invite/${token}/decline`, {
        method: "POST",
        headers: { Authorization: `Bearer ${portal.token}` },
      });
      setState({ status: "declined" });
    } catch {
      setState({
        status: "invalid",
        message: "Network error. Please try again.",
      });
    } finally {
      setActing(null);
    }
  }

  return (
    <main
      className="flex min-h-screen items-center justify-center p-4"
      style={{ backgroundColor: "#0a0a0f" }}
    >
      <div className="w-full max-w-md space-y-4">
        {state.status === "loading" && (
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-10 text-center">
            <p className="text-sm text-[#64748b]">Loading invitation&hellip;</p>
          </div>
        )}

        {state.status === "invalid" && (
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/[0.05] p-6">
            <p className="font-medium text-rose-400">Invite not found</p>
            <p className="mt-1 text-sm text-[#64748b]">{state.message}</p>
          </div>
        )}

        {state.status === "accepted" && (
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.05] p-6">
            <p className="font-medium text-emerald-400">Invitation accepted</p>
            <p className="mt-1 text-sm text-[#64748b]">
              You have joined the project. Redirecting to dashboard&hellip;
            </p>
          </div>
        )}

        {state.status === "declined" && (
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6">
            <p className="font-medium text-[#f1f5f9]">Invitation declined</p>
            <p className="mt-1 text-sm text-[#64748b]">
              You have declined this invitation. You can close this page.
            </p>
          </div>
        )}

        {state.status === "valid" && (
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6">
            <h1 className="text-xl font-bold text-[#f1f5f9]">
              Project Invitation
            </h1>

            <div className="mt-5 space-y-3 rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-[#64748b]">Project</span>
                <span className="font-medium text-[#f1f5f9]">
                  {state.info.projectName}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-[#64748b]">Invited by</span>
                <span className="font-mono text-sm text-[#f1f5f9]">
                  {shortenWallet(state.info.inviterWallet)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-[#64748b]">Expires</span>
                <span className="text-sm text-[#f1f5f9]">
                  {new Date(state.info.expiresAt).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>
            </div>

            {!portal.token ? (
              <div className="mt-5 rounded-xl border border-amber-500/20 bg-amber-500/[0.05] p-4">
                <p className="text-sm text-amber-400">
                  Connect a wallet to respond. You need to authenticate before
                  you can accept or decline this invitation.
                </p>
              </div>
            ) : (
              <div className="mt-5 flex gap-3">
                <button
                  type="button"
                  onClick={() => void handleAccept()}
                  disabled={acting !== null}
                  className="flex-1 rounded-xl bg-[#f97316] px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {acting === "accept" ? "Accepting…" : "Accept"}
                </button>
                <button
                  type="button"
                  onClick={() => void handleDecline()}
                  disabled={acting !== null}
                  className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-[#f1f5f9] transition-colors hover:bg-white/[0.08] disabled:opacity-50"
                >
                  {acting === "decline" ? "Declining…" : "Decline"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
