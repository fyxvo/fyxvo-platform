"use client";

import { useEffect, useRef, useState } from "react";

interface FadeInProps {
  readonly children: React.ReactNode;
  readonly className?: string;
  readonly delay?: number;
}

/**
 * Fades in children when they enter the viewport via IntersectionObserver.
 * Respects prefers-reduced-motion — visible immediately when motion is reduced.
 */
export function FadeIn({ children, className, delay = 0 }: FadeInProps) {
  const ref = useRef<HTMLDivElement>(null);

  // Lazy initial state: immediately visible if user prefers reduced motion.
  // On SSR (no window), defaults to false and client hydration corrects it.
  const [visible, setVisible] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    // Already visible (reduced-motion case handled in useState initializer)
    if (visible) return;

    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.08, rootMargin: "0px 0px -24px 0px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(16px)",
        transition: `opacity 0.5s ease ${delay}ms, transform 0.5s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}
