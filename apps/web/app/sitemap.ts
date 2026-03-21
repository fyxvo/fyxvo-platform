import type { MetadataRoute } from "next";
import { webEnv } from "../lib/env";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = webEnv.siteUrl;
  const now = new Date();
  return [
    { url: `${base}/`, lastModified: now, changeFrequency: "weekly", priority: 1.0 },
    { url: `${base}/pricing`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/docs`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/contact`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/status`, lastModified: now, changeFrequency: "hourly", priority: 0.7 },
    { url: `${base}/changelog`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/cookies`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/enterprise`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/playground`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/assistant`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/operators`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/compare`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: `${base}/support`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/updates`, lastModified: now, changeFrequency: "weekly", priority: 0.7 }
  ];
}
