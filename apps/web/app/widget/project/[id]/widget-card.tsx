"use client";

import { useEffect, useState } from "react";

interface WidgetData {
  projectName: string;
  requestsToday: number;
  gatewayStatus: string;
  avgLatencyMs: number;
  successRate?: number;
  isPublic: boolean;
}

interface AnalyticsHourBucket {
  hour: string;
  count: number;
}

export function WidgetCard({
  id,
  initialData,
  isDark,
  isLive,
  sizeMode = "medium",
  isCompact = false,
  themeMode = "dark",
}: {
  id: string;
  initialData: WidgetData;
  isDark: boolean;
  isLive: boolean;
  sizeMode?: "small" | "medium" | "large";
  isCompact?: boolean;
  themeMode?: "dark" | "light" | "auto";
}) {
  const [data, setData] = useState(initialData);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [hourlyBuckets, setHourlyBuckets] = useState<AnalyticsHourBucket[]>([]);

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

  // For large size: fetch 24h analytics
  useEffect(() => {
    if (sizeMode !== "large") return;
    const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://api.fyxvo.com";
    void fetch(`${apiUrl}/v1/projects/${id}/analytics/hourly`)
      .then((r) => r.ok ? r.json() as Promise<{ buckets: AnalyticsHourBucket[] }> : null)
      .then((body) => {
        if (body?.buckets) setHourlyBuckets(body.buckets);
      })
      .catch(() => undefined);
  }, [id, sizeMode]);

  const effectiveIsDark = themeMode === "auto" ? true : isDark;

  const bg = effectiveIsDark ? "bg-[#0a0a0f]" : "bg-gray-50";
  const text = effectiveIsDark ? "text-white" : "text-gray-900";
  const muted = effectiveIsDark ? "text-white/40" : "text-gray-400";

  const cardStyle: React.CSSProperties = isCompact
    ? {}
    : {
        border: effectiveIsDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.1)",
        padding: "1.5rem",
        borderRadius: "1rem",
      };

  const cardBg = isCompact ? "" : effectiveIsDark ? "bg-white/5" : "bg-white shadow-sm";

  const maxBucket = hourlyBuckets.length > 0 ? Math.max(...hourlyBuckets.map((b) => b.count), 1) : 1;

  return (
    <div className={`flex min-h-screen items-center justify-center p-4 ${bg}`}>
      <div className={`w-full max-w-xs ${cardBg}`} style={cardStyle}>
        {/* Header — always shown */}
        <div className="flex items-center justify-between mb-4">
          <p className={`text-xs uppercase tracking-wider ${muted}`}>Fyxvo</p>
          <div className={`h-2 w-2 rounded-full ${data.gatewayStatus === "healthy" ? "bg-emerald-400" : "bg-amber-400"}`} />
        </div>
        <p className={`font-semibold truncate ${text}`}>{data.projectName}</p>

        {/* small: status + count only */}
        {sizeMode === "small" && (
          <div className="mt-4">
            <p className={`text-xs ${muted}`}>Requests today</p>
            <p className={`mt-0.5 text-lg font-semibold ${text}`}>{data.requestsToday.toLocaleString()}</p>
            <p className={`mt-2 text-xs ${muted}`}>
              Status: <span className={data.gatewayStatus === "healthy" ? "text-emerald-400" : "text-amber-400"}>{data.gatewayStatus}</span>
            </p>
          </div>
        )}

        {/* medium: status + count + latency + success rate */}
        {sizeMode === "medium" && (
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <p className={`text-xs ${muted}`}>Requests today</p>
              <p className={`mt-0.5 text-lg font-semibold ${text}`}>{data.requestsToday.toLocaleString()}</p>
            </div>
            <div>
              <p className={`text-xs ${muted}`}>Avg latency</p>
              <p className={`mt-0.5 text-lg font-semibold ${text}`}>{data.avgLatencyMs}ms</p>
            </div>
            {data.successRate !== undefined ? (
              <div>
                <p className={`text-xs ${muted}`}>Success rate</p>
                <p className={`mt-0.5 text-lg font-semibold ${text}`}>{(data.successRate * 100).toFixed(1)}%</p>
              </div>
            ) : null}
          </div>
        )}

        {/* large: medium + mini 24h bar chart */}
        {sizeMode === "large" && (
          <>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div>
                <p className={`text-xs ${muted}`}>Requests today</p>
                <p className={`mt-0.5 text-lg font-semibold ${text}`}>{data.requestsToday.toLocaleString()}</p>
              </div>
              <div>
                <p className={`text-xs ${muted}`}>Avg latency</p>
                <p className={`mt-0.5 text-lg font-semibold ${text}`}>{data.avgLatencyMs}ms</p>
              </div>
              {data.successRate !== undefined ? (
                <div>
                  <p className={`text-xs ${muted}`}>Success rate</p>
                  <p className={`mt-0.5 text-lg font-semibold ${text}`}>{(data.successRate * 100).toFixed(1)}%</p>
                </div>
              ) : null}
            </div>
            <div className="mt-4">
              <p className={`mb-2 text-xs ${muted}`}>24h requests</p>
              {hourlyBuckets.length > 0 ? (
                <div className="flex items-end gap-px" style={{ height: "32px" }}>
                  {hourlyBuckets.slice(-24).map((b, i) => (
                    <div
                      key={i}
                      title={`${b.count} requests`}
                      style={{
                        flex: "1 1 0",
                        height: `${Math.max(2, Math.round((b.count / maxBucket) * 32))}px`,
                        background: effectiveIsDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.15)",
                        borderRadius: "1px",
                      }}
                    />
                  ))}
                </div>
              ) : (
                <div className={`text-xs ${muted}`}>No hourly data</div>
              )}
            </div>
          </>
        )}

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
