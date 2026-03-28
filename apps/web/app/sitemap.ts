import type { MetadataRoute } from "next";

const BASE = "https://www.fyxvo.com";

const STATIC_ROUTES = [
  "",
  "/pricing",
  "/docs",
  "/status",
  "/enterprise",
  "/contact",
  "/changelog",
  "/updates",
  "/leaderboard",
  "/explore",
  "/security",
  "/reliability",
  "/privacy",
  "/terms",
  "/cookies",
  "/operators",
  "/compare",
  "/network",
  "/mainnet",
  "/playground",
  "/assistant",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return STATIC_ROUTES.map((route) => ({
    url: `${BASE}${route}`,
    lastModified,
    changeFrequency: "weekly",
    priority: route === "" ? 1 : 0.8,
  }));
}
