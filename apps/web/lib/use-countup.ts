"use client";

import { useEffect, useRef, useState } from "react";

export function useCountUp(
  target: number,
  options: { duration?: number; decimals?: number; startOnView?: boolean } = {},
) {
  const { duration = 1600, decimals = 0, startOnView = true } = options;
  // Initialize to target immediately if not using scroll trigger
  const [value, setValue] = useState(startOnView ? 0 : target);
  const ref = useRef<HTMLElement | null>(null);
  const started = useRef(false);

  useEffect(() => {
    // When startOnView is false, value is already initialized to target above
    if (!startOnView) return;

    const el = ref.current;
    if (!el) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && !started.current) {
          started.current = true;

          if (reduced) {
            setValue(target);
            observer.disconnect();
            return;
          }

          const start = performance.now();
          const tick = (now: number) => {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = eased * target;
            setValue(parseFloat(current.toFixed(decimals)));
            if (progress < 1) requestAnimationFrame(tick);
          };

          requestAnimationFrame(tick);
          observer.disconnect();
        }
      },
      { threshold: 0.3 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [target, duration, decimals, startOnView]);

  return { value, ref };
}
