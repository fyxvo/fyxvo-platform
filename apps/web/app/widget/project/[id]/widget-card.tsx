"use client";

import { useEffect, useState } from "react";

interface WidgetData {
  projectName: string;
  requestsToday: number;
  gatewayStatus: string;
  avgLatencyMs: number;
  isPublic: boolean;
}

export function WidgetCard({
  id,
  initialData,
  isDark,
  isLive,
}: {
  id: string;
  initialData: WidgetData;
  isDark: boolean;
  isLive: boolean;
}) {
  const [data, setData] = useState(initialData);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    if (!isLive) return;
    const interval = setInterval(async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://api.fyxvo.com";
        const res = await fetch(`${apiUrl}/v1/projects/${id}/widget`);
        if (res.ok) {
          const fresh = await res.json() as WidgetData;
          setData(fresh);
          setLastUpdated(new Date());
        }
      } catch {
        // silently ignore refresh errors
      }
    }, 30_000);
    return () => clearInterval(interval);
  }, [id, isLive]);

  const bg = isDark ? "bg-[#0a0a0f]" : "bg-gray-50";
  const card = isDark ? "border-white/10 bg-white/5" : "border-gray-200 bg-white shadow-sm";
  const text = isDark ? "text-white" : "text-gray-900";
  const muted = isDark ? "text-white/40" : "text-gray-400";

  return (
    <div className={`flex min-h-screen items-center justify-center p-4 ${bg}`}>
      <div className={`w-full max-w-xs rounded-2xl border p-6 ${card}`}>
        <div className="flex items-center justify-between mb-4">
          <p className={`text-xs uppercase tracking-wider ${muted}`}>Fyxvo</p>
          <div className={`h-2 w-2 rounded-full ${data.gatewayStatus === "healthy" ? "bg-emerald-400" : "bg-amber-400"}`} />
        </div>
        <p className={`font-semibold truncate ${text}`}>{data.projectName}</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <p className={`text-xs ${muted}`}>Requests today</p>
            <p className={`mt-0.5 text-lg font-semibold ${text}`}>{data.requestsToday.toLocaleString()}</p>
          </div>
          <div>
            <p className={`text-xs ${muted}`}>Avg latency</p>
            <p className={`mt-0.5 text-lg font-semibold ${text}`}>{data.avgLatencyMs}ms</p>
          </div>
        </div>
        {isLive && (
          <p className={`mt-3 text-xs ${muted}`}>
            Updated {lastUpdated.toLocaleTimeString()}
          </p>
        )}
        <p className={`mt-4 text-xs text-center ${muted}`}>powered by fyxvo.com</p>
      </div>
    </div>
  );
}
