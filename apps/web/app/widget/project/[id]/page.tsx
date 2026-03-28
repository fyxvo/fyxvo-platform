const API = "https://api.fyxvo.com";

interface WidgetData {
  projectName: string;
  requestsToday: number;
  gatewayStatus: string;
  avgLatencyMs: number;
  publicSlug?: string;
  isPublic: boolean;
}

async function fetchWidgetData(id: string): Promise<WidgetData | null> {
  try {
    const res = await fetch(`${API}/v1/projects/${id}/widget`, {
      next: { revalidate: 30 },
    });
    if (!res.ok) return null;
    return (await res.json()) as WidgetData;
  } catch {
    return null;
  }
}

export default async function WidgetPage({
  params,
}: {
  readonly params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const widget = await fetchWidgetData(id);

  const isOk = widget?.gatewayStatus === "ok";

  if (!widget || !widget.isPublic) {
    return (
      <div
        className="flex min-h-screen items-center justify-center p-4"
        style={{ backgroundColor: "#0a0a0f" }}
      >
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-6 py-5 text-center">
          <p className="text-sm text-[#64748b]">Analytics set to private</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center p-4"
      style={{ backgroundColor: "#0a0a0f" }}
    >
      <div className="w-full max-w-xs rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <p className="truncate font-bold text-[#f1f5f9]">
            {widget.projectName}
          </p>
          <span
            className={`flex h-2.5 w-2.5 shrink-0 rounded-full ${
              isOk ? "bg-emerald-400" : "bg-amber-400"
            }`}
            title={isOk ? "Gateway OK" : "Gateway degraded"}
          />
        </div>

        {/* Stats */}
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#64748b]">Requests today</span>
            <span className="font-medium text-[#f1f5f9]">
              {widget.requestsToday.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#64748b]">Avg latency</span>
            <span className="font-medium text-[#f97316]">
              {widget.avgLatencyMs}ms
            </span>
          </div>
        </div>

        {/* Link to public profile */}
        {widget.publicSlug && (
          <div className="mt-4 border-t border-white/[0.06] pt-4">
            <a
              href={`/p/${widget.publicSlug}`}
              className="text-xs text-[#64748b] hover:text-[#f97316] transition-colors"
            >
              View project page →
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
