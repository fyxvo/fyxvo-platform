async function getWidgetData(id: string) {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://api.fyxvo.com"}/v1/projects/${id}/widget`, {
      next: { revalidate: 30 },
    });
    if (!res.ok) return null;
    return res.json() as Promise<{ projectName: string; requestsToday: number; gatewayStatus: string; avgLatencyMs: number; isPublic: boolean }>;
  } catch {
    return null;
  }
}

export default async function WidgetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getWidgetData(id);

  if (!data || !data.isPublic) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0f] p-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-5 text-center">
          <p className="text-sm text-white/50">Analytics set to private</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0f] p-4">
      <div className="w-full max-w-xs rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs uppercase tracking-wider text-white/40">Fyxvo</p>
          <div className={`h-2 w-2 rounded-full ${data.gatewayStatus === "healthy" ? "bg-emerald-400" : "bg-amber-400"}`} />
        </div>
        <p className="font-semibold text-white truncate">{data.projectName}</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-white/40">Requests today</p>
            <p className="mt-0.5 text-lg font-semibold text-white">{data.requestsToday.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-white/40">Avg latency</p>
            <p className="mt-0.5 text-lg font-semibold text-white">{data.avgLatencyMs}ms</p>
          </div>
        </div>
        <p className="mt-4 text-xs text-white/30 text-center">powered by fyxvo.com</p>
      </div>
    </div>
  );
}
