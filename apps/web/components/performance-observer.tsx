"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

function getUaCategory(): "mobile" | "desktop" | "tablet" {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent.toLowerCase();
  if (/tablet|ipad/.test(ua)) return "tablet";
  if (/mobile|android|iphone/.test(ua)) return "mobile";
  return "desktop";
}

export function PerformanceObserver() {
  const pathname = usePathname();
  const sentRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (sentRef.current.has(pathname)) return;
    sentRef.current.add(pathname);

    const sendMetrics = (fcp: number | null, lcp: number | null) => {
      void fetch("/api/performance", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ page: pathname, fcp, lcp, ua: getUaCategory() }),
      }).catch(() => undefined);
    };

    let fcp: number | null = null;
    let lcp: number | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const scheduleFlush = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => { sendMetrics(fcp, lcp); }, 3000);
    };

    try {
      const fcpObs = new window.PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === "first-contentful-paint") {
            fcp = Math.round(entry.startTime);
            scheduleFlush();
          }
        }
      });
      fcpObs.observe({ type: "paint", buffered: true });

      const lcpObs = new window.PerformanceObserver((list) => {
        const entries = list.getEntries();
        if (entries.length > 0) {
          lcp = Math.round(entries[entries.length - 1]!.startTime);
          scheduleFlush();
        }
      });
      lcpObs.observe({ type: "largest-contentful-paint", buffered: true });
    } catch { /* not supported */ }

    return () => { if (timer) clearTimeout(timer); };
  }, [pathname]);

  return null;
}
