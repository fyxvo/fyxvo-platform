import type { MetadataRoute } from "next";
import { webEnv } from "../lib/env";

interface LeaderboardSitemapResponse {
  readonly entries?: Array<{
    readonly hasPublicPage?: boolean;
    readonly publicSlug?: string | null;
  }>;
}

async function fetchPublicProjectEntries(baseUrl: string, lastModified: Date): Promise<MetadataRoute.Sitemap> {
  try {
    const response = await fetch(new URL("/v1/leaderboard", webEnv.apiBaseUrl).toString(), {
      next: { revalidate: 300 }
    });
    if (!response.ok) {
      return [];
    }

    const body = (await response.json()) as LeaderboardSitemapResponse;
    const seen = new Set<string>();

    return (body.entries ?? [])
      .filter((entry) => entry.hasPublicPage && typeof entry.publicSlug === "string" && entry.publicSlug.length > 0)
      .filter((entry) => {
        const publicSlug = entry.publicSlug!;
        if (seen.has(publicSlug)) {
          return false;
        }
        seen.add(publicSlug);
        return true;
      })
      .map((entry) => ({
        url: `${baseUrl}/p/${entry.publicSlug!}`,
        lastModified,
        changeFrequency: "daily" as const,
        priority: 0.7
      }));
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = webEnv.siteUrl;
  const now = new Date();
  const publicProjectEntries = await fetchPublicProjectEntries(base, now);

  return [
    { url: `${base}/`, lastModified: now, changeFrequency: "weekly", priority: 1.0 },
    { url: `${base}/pricing`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/docs`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/contact`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/status`, lastModified: now, changeFrequency: "hourly", priority: 0.7 },
    { url: `${base}/security`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/reliability`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/changelog`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/cookies`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/enterprise`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/playground`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/operators`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/leaderboard`, lastModified: now, changeFrequency: "daily", priority: 0.7 },
    { url: `${base}/explore`, lastModified: now, changeFrequency: "daily", priority: 0.7 },
    { url: `${base}/compare`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: `${base}/support`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/updates`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    ...publicProjectEntries
  ];
}
