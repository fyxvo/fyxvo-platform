"use client";

import { useEffect, useRef } from "react";

export function StatusMetricValue({
  storageKey,
  value,
  className = "",
}: {
  readonly storageKey: string;
  readonly value: string;
  readonly className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const key = `fyxvo.status.metric.${storageKey}`;
    const previous = window.localStorage.getItem(key);
    if (previous !== null && previous !== value && ref.current) {
      ref.current.classList.add("bg-emerald-500/10", "text-emerald-500", "rounded-md", "px-2", "py-1");
      window.setTimeout(() => {
        ref.current?.classList.remove("bg-emerald-500/10", "text-emerald-500", "rounded-md", "px-2", "py-1");
      }, 1800);
    }
    window.localStorage.setItem(key, value);
  }, [storageKey, value]);

  return (
    <span ref={ref} className={`${className} transition-colors duration-300`}>
      {value}
    </span>
  );
}
