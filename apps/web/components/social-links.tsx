"use client";

import Link from "next/link";
import { cn } from "@fyxvo/ui";
import { DiscordIcon, TelegramIcon, XSocialIcon } from "./icons";

const socialLinks = [
  {
    href: "https://x.com/fyxvo",
    label: "X",
    icon: XSocialIcon,
  },
  {
    href: "https://discord.gg/Uggu236Jgj",
    label: "Discord",
    icon: DiscordIcon,
  },
  {
    href: "https://t.me/fyxvo",
    label: "Telegram",
    icon: TelegramIcon,
  },
] as const;

export function SocialLinks({ className }: { readonly className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-3", className)}>
      {socialLinks.map((item) => {
        const Icon = item.icon;

        return (
          <Link
            key={item.label}
            href={item.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={item.label}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] text-[var(--fyxvo-text-soft)] shadow-[0_14px_40px_rgba(2,6,23,0.12)] transition hover:border-brand-500/40 hover:bg-[var(--fyxvo-panel)] hover:text-brand-400"
          >
            <Icon className="h-5 w-5" />
          </Link>
        );
      })}
    </div>
  );
}

export function SocialLinkButtons({ className }: { readonly className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-3", className)}>
      {socialLinks.map((item) => {
        const Icon = item.icon;

        return (
          <Link
            key={item.label}
            href={item.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 py-2 text-sm text-[var(--fyxvo-text-soft)] shadow-[0_14px_40px_rgba(2,6,23,0.12)] transition hover:border-brand-500/40 hover:bg-[var(--fyxvo-panel)] hover:text-brand-400"
          >
            <Icon className="h-5 w-5" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
