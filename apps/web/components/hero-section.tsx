"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import { ParticleBackground } from "./particle-background";
import { CountUp } from "./countup";
import { Globe2D } from "./globe-2d";

// Dynamically import the 3D globe with SSR disabled for better performance
const Globe = dynamic(() => import("./globe").then((mod) => ({ default: mod.Globe })), {
  ssr: false,
  loading: () => <Globe2D className="h-full w-full opacity-60" />,
});

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
      {/* 3D Globe background with 2D fallback */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <Suspense fallback={<Globe2D className="h-full w-full opacity-60" />}>
          <Globe className="h-full w-full" cameraZ={2.6} />
        </Suspense>
      </div>

      {/* Orange radial glow - enhanced */}
      <div
        className="pointer-events-none absolute inset-0 z-[1]"
        style={{
          background:
            "radial-gradient(ellipse 70% 55% at 50% 55%, rgba(249,115,22,0.12) 0%, transparent 65%)",
        }}
        aria-hidden="true"
      />

      {/* Top vignette */}
      <div
        className="pointer-events-none absolute top-0 left-0 right-0 z-[2] h-48"
        style={{
          background:
            "linear-gradient(to bottom, var(--fyxvo-bg) 0%, transparent 100%)",
        }}
        aria-hidden="true"
      />

      {/* Bottom fade into page background */}
      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0 z-[2] h-80"
        style={{
          background:
            "linear-gradient(to bottom, transparent 0%, var(--fyxvo-bg) 100%)",
        }}
        aria-hidden="true"
      />

      {/* Hero content */}
      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        {children}

        {/* Stats countup - enhanced with cards */}
        {stats.length > 0 && (
          <div className="mt-14 flex flex-wrap items-center justify-start gap-6 sm:gap-8">
            {stats.map((s, index) => (
              <div 
                key={s.label} 
                className="text-left group animate-fade-up"
                style={{ animationDelay: `${index * 100 + 400}ms` }}
              >
                <div className="relative">
                  <div
                    className="text-4xl sm:text-5xl font-bold tabular-nums"
                    style={{ color: "var(--fyxvo-text)" }}
                  >
                    <CountUp
                      target={s.value}
                      suffix={s.suffix ?? ""}
                      decimals={s.decimals ?? 0}
                      duration={2000}
                    />
                  </div>
                  <div className="absolute -bottom-1 left-0 h-0.5 w-0 bg-[var(--fyxvo-brand)] group-hover:w-full transition-all duration-500" />
                </div>
                <div
                  className="mt-2 text-[11px] uppercase tracking-[0.22em]"
                  style={{ color: "var(--fyxvo-text-muted)" }}
                >
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 animate-bounce">
        <div className="flex flex-col items-center gap-2">
          <span className="text-[10px] uppercase tracking-wider text-[var(--fyxvo-text-muted)]">Scroll</span>
          <svg 
            className="w-5 h-5 text-[var(--fyxvo-text-muted)]" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
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
