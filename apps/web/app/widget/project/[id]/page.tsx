import { WidgetCard } from "./widget-card";

type WidgetSearchParams = {
  theme?: string;
  live?: string;
  size?: string;
  compact?: string;
};

export default async function WidgetPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<WidgetSearchParams>;
}) {
  const { id } = await params;
  const { theme, live, size, compact } = await searchParams;

  // theme: "dark" | "light" | "auto"
  const themeMode = theme === "light" ? "light" : theme === "auto" ? "auto" : "dark";
  const isDark = themeMode === "dark";
  const isLive = live === "true";
  const sizeMode = (size === "small" || size === "medium" || size === "large") ? size : "medium";
  const isCompact = compact === "true";

  const data = await getWidgetData(id);
  if (!data || !data.isPublic) {
    const containerCls = isDark || themeMode === "auto" ? "bg-[#0a0a0f]" : "bg-gray-50";
    const cardCls = isDark || themeMode === "auto"
      ? "border-white/10 bg-white/5"
      : "border-gray-200 bg-white";
    const textCls = isDark || themeMode === "auto" ? "text-white/50" : "text-gray-400";
    return (
      <>
        {themeMode === "auto" && (
          <style>{`@media (prefers-color-scheme: light) { :root { --widget-bg: #f9fafb; --widget-card-bg: #ffffff; --widget-card-border: rgba(0,0,0,0.1); --widget-text: rgba(0,0,0,0.5); } } @media (prefers-color-scheme: dark) { :root { --widget-bg: #0a0a0f; --widget-card-bg: rgba(255,255,255,0.05); --widget-card-border: rgba(255,255,255,0.1); --widget-text: rgba(255,255,255,0.5); } }`}</style>
        )}
        <div className={`flex min-h-screen items-center justify-center p-4 ${containerCls}`}>
          <div className={`rounded-2xl border px-6 py-5 text-center ${cardCls}`}>
            <p className={`text-sm ${textCls}`}>Analytics set to private</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {themeMode === "auto" && (
        <style>{`@media (prefers-color-scheme: light) { :root { --widget-auto-bg: #f9fafb; --widget-auto-dark: 0; } } @media (prefers-color-scheme: dark) { :root { --widget-auto-bg: #0a0a0f; --widget-auto-dark: 1; } }`}</style>
      )}
      <WidgetCard
        id={id}
        initialData={data}
        isDark={isDark}
        isLive={isLive}
        sizeMode={sizeMode}
        isCompact={isCompact}
        themeMode={themeMode}
      />
    </>
  );
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
      successRate?: number;
      isPublic: boolean;
    }>;
  } catch {
    return null;
  }
}
