"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function NavProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const prevRoute = useRef(`${pathname}${searchParams.toString()}`);

  useEffect(() => {
    const currentRoute = `${pathname}${searchParams.toString()}`;
    if (currentRoute === prevRoute.current) return;
    prevRoute.current = currentRoute;

    let resetTimer: ReturnType<typeof setTimeout> | null = null;

    const completeTimer = setTimeout(() => {
      setProgress(100);
      setVisible(true);

      resetTimer = setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 300);
    }, 0);

    return () => {
      clearTimeout(completeTimer);
      if (resetTimer) clearTimeout(resetTimer);
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
