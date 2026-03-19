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
    <span className={cn("inline-flex items-center gap-3", className)}>
      <span className={cn("relative h-11 w-11 shrink-0", iconClassName)}>
        <Image
          src="/brand/logo.png"
          alt="Fyxvo"
          fill
          sizes="44px"
          className="object-contain"
          priority={priority}
        />
      </span>
      {withWordmark ? (
        <span className="flex min-w-0 flex-col">
          <span className="font-display text-xl font-semibold leading-none tracking-[0.02em] text-[var(--fyxvo-text)]">
            Fyxvo
          </span>
          <span className="mt-1 hidden text-[11px] uppercase leading-none tracking-[0.18em] text-[var(--fyxvo-text-muted)] min-[420px]:block sm:tracking-[0.22em]">
            Solana infrastructure
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
