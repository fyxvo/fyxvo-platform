"use client";

import { Globe } from "./globe";
import { ParticleBackground } from "./particle-background";
import { CountUp } from "./countup";

type HeroStat = {
  label: string;
  value: number;
  suffix?: string;
  decimals?: number;
};

type HeroSectionProps = {
  stats: HeroStat[];
  children: React.ReactNode;
};

export function HeroSection({ stats, children }: HeroSectionProps) {
  return (
    <section className="hero-platform relative flex min-h-screen flex-col items-center justify-center overflow-hidden border-b border-[var(--fyxvo-border)]">
      {/* 3D Globe background */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <Globe className="h-full w-full" cameraZ={2.6} />
      </div>

      {/* Orange radial glow */}
      <div
        className="pointer-events-none absolute inset-0 z-[1]"
        style={{
          background:
            "radial-gradient(ellipse 70% 55% at 50% 55%, rgba(249,115,22,0.11) 0%, transparent 65%)",
        }}
        aria-hidden="true"
      />

      {/* Bottom fade into page background */}
      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0 z-[2] h-64"
        style={{
          background:
            "linear-gradient(to bottom, transparent 0%, var(--fyxvo-bg) 100%)",
        }}
        aria-hidden="true"
      />

      {/* Hero content */}
      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        {children}

        {/* Stats countup */}
        {stats.length > 0 && (
          <div className="mt-12 flex flex-wrap items-center justify-start gap-10 sm:gap-16">
            {stats.map((s) => (
              <div key={s.label} className="text-left">
                <div
                  className="text-4xl font-bold"
                  style={{ color: "var(--fyxvo-text)" }}
                >
                  <CountUp
                    target={s.value}
                    suffix={s.suffix ?? ""}
                    decimals={s.decimals ?? 0}
                    duration={2000}
                  />
                </div>
                <div
                  className="mt-1 text-[11px] uppercase tracking-[0.22em]"
                  style={{ color: "var(--fyxvo-text-muted)" }}
                >
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export function DashboardParticles() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 opacity-30" aria-hidden="true">
      <ParticleBackground className="h-full w-full" />
    </div>
  );
}
