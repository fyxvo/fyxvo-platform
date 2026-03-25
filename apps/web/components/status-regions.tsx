"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@fyxvo/ui";
import { webEnv } from "../lib/env";

interface CalendarDay {
  date: string;
  availability: number;
  color: "green" | "amber" | "red";
}

interface NetworkStatsRegion {
  region?: string;
}

export function StatusRegions() {
  const [activeRegion, setActiveRegion] = useState<string>("us-east-1");

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch(new URL("/v1/network/stats", webEnv.apiBaseUrl).toString(), {
          cache: "no-store",
        });
        if (res.ok) {
          const data = await res.json() as NetworkStatsRegion;
          if (data.region) {
            setTimeout(() => setActiveRegion(data.region!), 0);
          }
        }
      } catch {
        // fallback to default
      }
    })();
  }, []);

  const regions = [
    { id: "us-east-1", label: "us-east-1", status: "active" as const },
    { id: "eu-west-1", label: "eu-west-1", status: "coming-soon" as const },
    { id: "ap-southeast-1", label: "ap-southeast-1", status: "coming-soon" as const },
  ];

  return (
    <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
      <CardHeader>
        <CardTitle>Gateway Regions</CardTitle>
        <CardDescription>
          Active and planned gateway regions for the Fyxvo relay network.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {regions.map((region) => {
          const isActive = region.status === "active" && region.id === activeRegion;
          const isComingSoon = region.status === "coming-soon";
          return (
            <div
              key={region.id}
              className="flex items-center justify-between gap-4 rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <span
                  className={`text-base ${isActive ? "text-emerald-500" : "text-[var(--fyxvo-text-muted)]"}`}
                  aria-hidden="true"
                >
                  {isActive ? "●" : "○"}
                </span>
                <span className="font-mono text-sm text-[var(--fyxvo-text)]">{region.label}</span>
              </div>
              <span
                className={`text-xs font-medium ${
                  isActive
                    ? "text-emerald-600 dark:text-emerald-400"
                    : isComingSoon
                      ? "text-[var(--fyxvo-text-muted)]"
                      : "text-[var(--fyxvo-text-muted)]"
                }`}
              >
                {isActive ? "Active" : "Coming soon"}
              </span>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

export function StatusHealthCalendar() {
  const [calendar, setCalendar] = useState<CalendarDay[]>([]);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch(
          new URL("/v1/network/health-calendar", webEnv.apiBaseUrl).toString(),
          { cache: "no-store" }
        );
        if (res.ok) {
          const data = await res.json() as { calendar: CalendarDay[] };
          setTimeout(() => setCalendar(data.calendar), 0);
        }
      } catch {
        // no calendar data available
      }
    })();
  }, []);

  if (calendar.length === 0) return null;

  return (
    <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
      <CardHeader>
        <CardTitle>30-Day Network Health</CardTitle>
        <CardDescription>
          Daily availability over the past 30 days. Hover a square for exact percentage.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-1 flex-wrap">
          {calendar.map((day) => (
            <div
              key={day.date}
              title={`${day.date}: ${(day.availability * 100).toFixed(1)}%`}
              className="w-7 h-7 rounded"
              style={{
                backgroundColor:
                  day.color === "green"
                    ? "#22c55e"
                    : day.color === "amber"
                      ? "#f59e0b"
                      : "#ef4444",
              }}
            />
          ))}
        </div>
        <div className="flex flex-wrap gap-4">
          {(
            [
              { color: "#22c55e", label: "Green \u226595%" },
              { color: "#f59e0b", label: "Amber 80\u201395%" },
              { color: "#ef4444", label: "Red <80%" },
            ] as const
          ).map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <span
                className="h-3 w-3 rounded-sm"
                style={{ backgroundColor: item.color }}
                aria-hidden="true"
              />
              <span className="text-xs text-[var(--fyxvo-text-muted)]">{item.label}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
