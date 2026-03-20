"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function NavProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevRoute = useRef(`${pathname}${searchParams.toString()}`);

  useEffect(() => {
    const currentRoute = `${pathname}${searchParams.toString()}`;
    if (currentRoute === prevRoute.current) return;
    prevRoute.current = currentRoute;

    // Complete any in-progress animation
    setProgress(100);
    setVisible(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
    timerRef.current = setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 300);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [pathname, searchParams]);

  if (!visible && progress === 0) return null;

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        height: "2px",
        pointerEvents: "none"
      }}
    >
      <div
        style={{
          height: "100%",
          background: "var(--fyxvo-accent, #6366f1)",
          width: `${progress}%`,
          transition: progress === 100 ? "width 0.1s ease-out, opacity 0.3s ease 0.1s" : "width 0.4s ease",
          opacity: visible ? 1 : 0
        }}
      />
    </div>
  );
}
