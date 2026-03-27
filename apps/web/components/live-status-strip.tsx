"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type ChipStatus = "ok" | "degraded" | "loading";

interface StatusState {
  api: ChipStatus;
  gateway: ChipStatus;
  protocol: ChipStatus;
  lastUpdated: Date | null;
}

function StatusChip({
  label,
  status,
}: {
  readonly label: string;
  readonly status: ChipStatus;
}) {
  const dotColor =
    status === "ok"
      ? "bg-emerald-400"
      : status === "degraded"
        ? "bg-amber-400"
        : "bg-[#64748b] animate-pulse";

  const textColor =
    status === "ok"
      ? "text-emerald-400"
      : status === "degraded"
        ? "text-amber-400"
        : "text-[#64748b]";

  const borderColor =
    status === "ok"
      ? "border-emerald-400/25"
      : status === "degraded"
        ? "border-amber-400/25"
        : "border-white/[0.08]";

  const statusLabel =
    status === "ok" ? "operational" : status === "degraded" ? "degraded" : "checking";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border ${borderColor} bg-white/[0.03]`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
      <span className="text-[#f1f5f9]">{label}</span>
      <span className={textColor}>{statusLabel}</span>
    </span>
  );
}

export function LiveStatusStrip() {
  const [state, setState] = useState<StatusState>({
    api: "loading",
    gateway: "loading",
    protocol: "loading",
    lastUpdated: null,
  });

  useEffect(() => {
    async function fetchStatus() {
      const [apiResult, gatewayResult] = await Promise.allSettled([
        fetch("https://api.fyxvo.com/health", { signal: AbortSignal.timeout(8000) }).then((r) =>
          r.json()
        ),
        fetch("https://rpc.fyxvo.com/v1/status", { signal: AbortSignal.timeout(8000) }).then((r) =>
          r.json()
        ),
      ]);

      const apiStatus: ChipStatus =
        apiResult.status === "fulfilled" && (apiResult.value as { status?: string })?.status === "ok"
          ? "ok"
          : "degraded";

      const gatewayData =
        gatewayResult.status === "fulfilled"
          ? (gatewayResult.value as { status?: string; health?: string })
          : null;
      const gatewayStatus: ChipStatus =
        gatewayData?.status === "ok" || gatewayData?.health === "ok" ? "ok" : "degraded";

      const apiData =
        apiResult.status === "fulfilled"
          ? (apiResult.value as { protocolReady?: boolean; protocol?: { ready?: boolean } })
          : null;
      const protocolReady =
        apiData?.protocolReady === true || apiData?.protocol?.ready === true;
      const protocolStatus: ChipStatus = protocolReady ? "ok" : "degraded";

      setState({
        api: apiStatus,
        gateway: gatewayStatus,
        protocol: protocolStatus,
        lastUpdated: new Date(),
      });
    }

    void fetchStatus();
    const interval = setInterval(() => {
      void fetchStatus();
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-wrap items-center gap-3 py-3.5">
      <span className="text-xs font-medium uppercase tracking-[0.16em] text-[#64748b] mr-1">
        Live network
      </span>
      <StatusChip label="API" status={state.api} />
      <StatusChip label="Gateway" status={state.gateway} />
      <StatusChip label="Protocol" status={state.protocol} />
      {state.lastUpdated ? (
        <span className="text-xs text-[#64748b] ml-auto hidden sm:block">
          Updated {state.lastUpdated.toLocaleTimeString()}
        </span>
      ) : null}
      <Link
        href="/status"
        className="text-xs font-medium text-[#f97316] hover:text-[#f97316]/80 transition-colors ml-auto sm:ml-0"
      >
        Full status →
      </Link>
    </div>
  );
}
