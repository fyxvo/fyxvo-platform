import type { MetadataRoute } from "next";

const BASE = "https://fyxvo.com";

const STATIC_ROUTES = [
  "",
  "/docs",
  "/pricing",
  "/status",
  "/enterprise",
  "/compare",
  "/explore",
  "/operators",
  "/changelog",
  "/updates",
  "/reliability",
  "/security",
  "/privacy",
  "/terms",
  "/cookies",
];

export default function sitemap(): MetadataRoute.Sitemap {
  return STATIC_ROUTES.map((route) => ({
    url: `${BASE}${route}`,
    lastModified: new Date().toISOString(),
    changeFrequency: "weekly",
    priority: route === "" ? 1 : 0.8,
  }));
}
