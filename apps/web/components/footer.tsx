import Image from "next/image";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-[var(--fyxvo-border)] py-8 px-4">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Image src="/brand/logo.png" width={32} height={32} alt="Fyxvo" />
          <span className="font-display font-bold text-[var(--fyxvo-brand)]">Fyxvo</span>
          <span className="text-xs text-[var(--fyxvo-text-muted)]">
            © {new Date().getFullYear()} Fyxvo Inc.
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm text-[var(--fyxvo-text-muted)]">
          <Link href="/docs" className="hover:text-[var(--fyxvo-text)] transition-colors">
            Docs
          </Link>
          <Link href="/status" className="hover:text-[var(--fyxvo-text)] transition-colors">
            Status
          </Link>
          <Link href="/pricing" className="hover:text-[var(--fyxvo-text)] transition-colors">
            Pricing
          </Link>
          <Link href="/privacy" className="hover:text-[var(--fyxvo-text)] transition-colors">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-[var(--fyxvo-text)] transition-colors">
            Terms
          </Link>
        </div>
      </div>
    </footer>
  );
}
