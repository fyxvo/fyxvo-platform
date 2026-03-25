import type { MetadataRoute } from "next";
import { webEnv } from "../lib/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/dashboard",
          "/settings",
          "/api-keys",
          "/funding",
          "/analytics",
          "/projects",
          "/transactions",
          "/widget",
          "/admin"
        ]
      }
    ],
    sitemap: new URL("/sitemap.xml", webEnv.siteUrl).toString()
  };
}
