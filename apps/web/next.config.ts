import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.join(currentDirectory, "../..");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  outputFileTracingRoot: workspaceRoot,
  turbopack: {
    root: workspaceRoot,
    resolveAlias: {
      "@solana-mobile/wallet-adapter-mobile": "./apps/web/lib/solana-mobile-wallet-shim.ts",
      "whatwg-fetch": "./apps/web/lib/whatwg-fetch-shim.ts"
    }
  },
  async headers() {
    // Content Security Policy allows Fyxvo domains and blocks unauthorized external requests.
    // 'unsafe-inline' for styles is required by Tailwind CSS class injection at runtime.
    // 'unsafe-eval' is excluded — we rely on Next.js bundling, not eval-based code.
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "connect-src 'self' https://api.fyxvo.com https://rpc.fyxvo.com https://status.fyxvo.com https://api.coingecko.com wss:",
      "frame-src 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests",
      "report-uri /api/csp-report"
    ].join("; ");

    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: csp
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff"
          },
          {
            key: "X-Frame-Options",
            value: "DENY"
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin"
          },
          {
            key: "Permissions-Policy",
            value:
              "accelerometer=(), camera=(), geolocation=(), gyroscope=(), microphone=(), payment=(), usb=()"
          }
        ]
      }
    ];
  }
};

export default nextConfig;
