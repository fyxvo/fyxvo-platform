import { WidgetCard } from "./widget-card";

type WidgetSearchParams = {
  theme?: string;
  live?: string;
};

export default async function WidgetPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<WidgetSearchParams>;
}) {
  const { id } = await params;
  const { theme, live } = await searchParams;
  const isDark = theme !== "light";
  const isLive = live === "true";

  const data = await getWidgetData(id);
  if (!data || !data.isPublic) {
    return (
      <div className={`flex min-h-screen items-center justify-center p-4 ${isDark ? "bg-[#0a0a0f]" : "bg-gray-50"}`}>
        <div className={`rounded-2xl border px-6 py-5 text-center ${isDark ? "border-white/10 bg-white/5" : "border-gray-200 bg-white"}`}>
          <p className={`text-sm ${isDark ? "text-white/50" : "text-gray-400"}`}>Analytics set to private</p>
        </div>
      </div>
    );
  }

  return <WidgetCard id={id} initialData={data} isDark={isDark} isLive={isLive} />;
}

async function getWidgetData(id: string) {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://api.fyxvo.com";
    const res = await fetch(`${apiUrl}/v1/projects/${id}/widget`, {
      next: { revalidate: 30 },
    });
    if (!res.ok) return null;
    return res.json() as Promise<{
      projectName: string;
      requestsToday: number;
      gatewayStatus: string;
      avgLatencyMs: number;
      isPublic: boolean;
    }>;
  } catch {
    return null;
  }
}
