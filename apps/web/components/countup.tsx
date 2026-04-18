"use client";

import { useCountUp } from "../lib/use-countup";

type Props = {
  target: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  duration?: number;
  className?: string;
};

export function CountUp({ target, prefix = "", suffix = "", decimals = 0, duration = 1600, className }: Props) {
  const { value, ref } = useCountUp(target, { decimals, duration });

  return (
    <span ref={ref as React.RefObject<HTMLSpanElement>} className={className}>
      {prefix}{value.toLocaleString(undefined, { maximumFractionDigits: decimals, minimumFractionDigits: decimals })}{suffix}
    </span>
  );
}
