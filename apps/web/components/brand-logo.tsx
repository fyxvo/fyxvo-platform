"use client";

import Image from "next/image";
import Link from "next/link";
import { cn } from "@fyxvo/ui";

export function BrandLogo({
  withWordmark = true,
  href = "/",
  iconClassName,
  className,
  priority = false,
}: {
  readonly withWordmark?: boolean;
  readonly href?: string;
  readonly iconClassName?: string;
  readonly className?: string;
  readonly priority?: boolean;
}) {
  const content = (
    <span className={cn("inline-flex items-center gap-3.5", className)}>
      <span
        className={cn(
          "relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[var(--fyxvo-border)] bg-black shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_18px_44px_color-mix(in_srgb,var(--fyxvo-brand)_16%,transparent)]",
          iconClassName
        )}
      >
        <span className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(251,191,36,0.18),transparent_45%),radial-gradient(circle_at_80%_100%,rgba(249,115,22,0.2),transparent_50%)]" />
        <Image
          src="/brand/logo.png"
          alt="Fyxvo"
          fill
          sizes="48px"
          className="object-contain"
          priority={priority}
        />
      </span>
      {withWordmark ? (
        <span className="flex min-w-0 flex-col">
          <span className="font-display text-xl font-semibold leading-none tracking-[0.03em] text-[var(--fyxvo-text)]">
            Fyxvo
          </span>
          <span className="mt-1 hidden text-[11px] uppercase leading-none tracking-[0.24em] text-[var(--fyxvo-brand-soft)] min-[420px]:block">
            Funded Solana relay
          </span>
        </span>
      ) : null}
    </span>
  );

  return href ? (
    <Link href={href} className="inline-flex items-center" aria-label="Fyxvo home">
      {content}
    </Link>
  ) : (
    content
  );
}
