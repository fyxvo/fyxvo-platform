import type { Metadata } from "next";
import { IBM_Plex_Sans, Space_Grotesk } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import { AppFrame } from "../components/app-frame";
import { CookieNotice } from "../components/cookie-notice";
import { FeedbackWidget } from "../components/feedback-widget";
import { PerformanceObserver } from "../components/performance-observer";
import { NavProgress } from "../components/nav-progress";
import { PortalProvider } from "../components/portal-provider";
import { ServiceWorkerRegistration } from "../components/service-worker-registration";
import { SolanaProvider } from "../components/solana-provider";
import { ThemeProvider } from "../components/theme-provider";
import { webEnv } from "../lib/env";

const fontSans = IBM_Plex_Sans({
  variable: "--font-ibm-plex-sans",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"]
});

const fontDisplay = Space_Grotesk({
  variable: "--font-space-grotesk",
  weight: ["500", "700"],
  subsets: ["latin"]
});

export const metadata: Metadata = {
  metadataBase: new URL(webEnv.siteUrl),
  applicationName: webEnv.appName,
  title: {
    default: `${webEnv.appName} | Devnet Solana infrastructure`,
    template: `%s | ${webEnv.appName}`
  },
  description:
    "Fund a Solana devnet project on chain, issue an API key, and send the first real request with honest status surfaces and a clear launch path.",
  alternates: {
    canonical: "/"
  },
  icons: {
    icon: [{ url: "/icon.png", type: "image/png" }],
    apple: [{ url: "/apple-icon.png", type: "image/png" }],
    shortcut: [{ url: "/icon.png", type: "image/png" }]
  },
  openGraph: {
    type: "website",
    url: webEnv.siteUrl,
    siteName: webEnv.appName,
    title: `${webEnv.appName} | Devnet Solana infrastructure`,
    description:
      "Fund Solana projects on chain, issue API keys, send devnet JSON-RPC traffic, and verify exactly what is live from one calm control surface.",
    images: [
      {
        url: webEnv.socialImageUrl,
        alt: `${webEnv.appName} devnet infrastructure preview`
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: `${webEnv.appName} | Devnet Solana infrastructure`,
    description:
      "Wallet-authenticated control, funded relay access, clear quickstart flows, and an honest live devnet status surface.",
    images: [webEnv.socialImageUrl]
  },
  robots: {
    index: webEnv.allowIndexing,
    follow: webEnv.allowIndexing
  },
  category: "technology"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme="fyxvo-dark"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body className={`${fontSans.variable} ${fontDisplay.variable}`}>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[9999] focus:rounded focus:bg-[var(--fyxvo-brand)] focus:px-4 focus:py-2 focus:text-white focus:shadow-lg"
        >
          Skip to main content
        </a>
        <ThemeProvider>
          <SolanaProvider>
            <PortalProvider>
              <Suspense fallback={null}>
                <NavProgress />
              </Suspense>
              <AppFrame>{children}</AppFrame>
              <CookieNotice />
              <ServiceWorkerRegistration />
              <Suspense fallback={null}>
                <FeedbackWidget />
              </Suspense>
              <Suspense fallback={null}>
                <PerformanceObserver />
              </Suspense>
            </PortalProvider>
          </SolanaProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
