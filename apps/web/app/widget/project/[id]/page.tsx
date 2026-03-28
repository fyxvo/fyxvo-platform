import Link from "next/link";
import { getProjectWidget } from "../../../../lib/api";
import { SITE_URL } from "../../../../lib/env";

interface WidgetPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ theme?: string; transparent?: string }>;
}

function normalizeTheme(theme?: string) {
  return theme === "light" ? "light" : "dark";
}

function normalizeTransparent(value?: string) {
  return value === "true";
}

export default async function ProjectWidgetPage({
  params,
  searchParams,
}: WidgetPageProps) {
  const { id } = await params;
  const query = await searchParams;
  const theme = normalizeTheme(query.theme);
  const transparent = normalizeTransparent(query.transparent);
  const widget = await getProjectWidget(id);

  const isLight = theme === "light";
  const shellClassName = transparent
    ? "bg-transparent"
    : isLight
      ? "bg-white"
      : "bg-[#0f172a]";
  const panelClassName = transparent
    ? "border border-white/10 bg-black/10 backdrop-blur"
    : isLight
      ? "border border-slate-200 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.08)]"
      : "border border-white/10 bg-[#111827] shadow-[0_18px_44px_rgba(2,6,23,0.42)]";
  const textClassName = isLight ? "text-slate-950" : "text-white";
  const mutedClassName = isLight ? "text-slate-600" : "text-slate-300";
  const borderClassName = isLight ? "border-slate-200" : "border-white/10";
  const sparkBaseClassName = isLight ? "bg-slate-200" : "bg-white/10";
  const sparkBarClassName = isLight ? "bg-orange-500" : "bg-orange-400";
  const surfaceClassName = isLight ? "bg-slate-50" : "bg-white/5";

  const sparkline = widget?.requestVolume7d ?? [];
  const maxCount = Math.max(...sparkline.map((point) => point.count), 1);

  return (
    <div className={`min-h-screen ${shellClassName} p-3`}>
      <div className={`w-full max-w-sm rounded-[1.75rem] ${panelClassName} p-4`}>
        {widget ? (
          <>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-orange-500">
                  Fyxvo network
                </p>
                <h1 className={`mt-2 text-lg font-semibold tracking-tight ${textClassName}`}>
                  {widget.projectName}
                </h1>
                <p className={`mt-1 text-xs ${mutedClassName}`}>
                  Live request health embed for public README and status surfaces.
                </p>
              </div>
              <div
                className={`rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.16em] ${
                  widget.gatewayStatus === "healthy"
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                    : `border ${borderClassName} ${mutedClassName}`
                }`}
              >
                {widget.gatewayStatus}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className={`rounded-2xl border ${borderClassName} ${surfaceClassName} p-3`}>
                <p className={`text-[10px] uppercase tracking-[0.14em] ${mutedClassName}`}>
                  Requests today
                </p>
                <p className={`mt-2 text-xl font-semibold ${textClassName}`}>
                  {widget.requestsToday.toLocaleString()}
                </p>
              </div>
              <div className={`rounded-2xl border ${borderClassName} ${surfaceClassName} p-3`}>
                <p className={`text-[10px] uppercase tracking-[0.14em] ${mutedClassName}`}>
                  Average latency
                </p>
                <p className={`mt-2 text-xl font-semibold ${textClassName}`}>
                  {widget.avgLatencyMs}ms
                </p>
              </div>
            </div>

            <div className={`mt-4 rounded-2xl border ${borderClassName} ${surfaceClassName} p-3`}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className={`text-[10px] uppercase tracking-[0.14em] ${mutedClassName}`}>
                    Seven-day volume
                  </p>
                  <p className={`mt-1 text-xs ${mutedClassName}`}>
                    Updated from the public project widget API.
                  </p>
                </div>
                <p className={`text-[10px] uppercase tracking-[0.14em] ${mutedClassName}`}>
                  7d
                </p>
              </div>

              <div className="mt-4 flex h-24 items-end gap-2">
                {sparkline.map((point) => {
                  const height = Math.max(10, Math.round((point.count / maxCount) * 100));
                  return (
                    <div key={point.date} className="flex flex-1 flex-col items-center gap-2">
                      <div className={`flex h-20 w-full items-end rounded-full ${sparkBaseClassName} p-1`}>
                        <div
                          className={`w-full rounded-full ${sparkBarClassName}`}
                          style={{ height: `${height}%` }}
                          title={`${point.date}: ${point.count.toLocaleString()} requests`}
                        />
                      </div>
                      <span className={`text-[10px] ${mutedClassName}`}>
                        {point.date.slice(5)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
              <p className={`text-[11px] ${mutedClassName}`}>
                Powered by Fyxvo devnet control and relay infrastructure.
              </p>
              <Link
                href={widget.publicSlug ? `${SITE_URL}/p/${widget.publicSlug}` : `${SITE_URL}/docs`}
                target="_blank"
                className="rounded-full bg-orange-500 px-3 py-1.5 text-[11px] font-medium text-white transition hover:bg-orange-400"
              >
                Open
              </Link>
            </div>
          </>
        ) : (
          <div className={`rounded-2xl border ${borderClassName} ${surfaceClassName} p-4`}>
            <p className={`text-sm font-medium ${textClassName}`}>Widget unavailable</p>
            <p className={`mt-2 text-xs leading-6 ${mutedClassName}`}>
              The public widget API did not return data for this project yet.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
