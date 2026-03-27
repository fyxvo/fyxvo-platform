"use client";

import { useSyncExternalStore } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@fyxvo/ui";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import type { SampleTrendPoint } from "../lib/types";

function subscribe() {
  return () => undefined;
}

function useIsClient() {
  return useSyncExternalStore(subscribe, () => true, () => false);
}

function ChartTooltip({
  active,
  payload,
  label
}: {
  readonly active?: boolean;
  readonly payload?: Array<{ readonly value?: number }>;
  readonly label?: string;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-[color:var(--fyxvo-border)] bg-[color:var(--fyxvo-panel-strong)] px-4 py-3 shadow-[0_16px_40px_rgba(2,6,23,0.28)]">
      <div className="text-xs uppercase tracking-[0.16em] text-[var(--fyxvo-text-muted)]">{label}</div>
      <div className="mt-1 text-base font-semibold text-[var(--fyxvo-text)]">{payload[0]?.value ?? 0}</div>
    </div>
  );
}

export function LineChartCard({
  title,
  description,
  points
}: {
  readonly title: string;
  readonly description: string;
  readonly points: readonly SampleTrendPoint[];
}) {
  const mounted = useIsClient();
  const maxValue = Math.max(...points.map((point) => point.value), 1);

  return (
    <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="overflow-hidden rounded-[1.8rem] border border-[color:var(--fyxvo-border)] bg-[color:var(--fyxvo-panel-soft)] px-3 py-4">
          <div className="h-64 w-full">
            {mounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={points}>
                  <defs>
                    <linearGradient id="fyxvoArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--fyxvo-brand)" stopOpacity={0.38} />
                      <stop offset="100%" stopColor="var(--fyxvo-brand)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--fyxvo-border)" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "var(--fyxvo-text-muted)", fontSize: 12 }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "var(--fyxvo-text-muted)", fontSize: 12 }}
                    width={36}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="var(--fyxvo-brand)"
                    strokeWidth={3}
                    fill="url(#fyxvoArea)"
                    activeDot={{ r: 5, fill: "var(--fyxvo-brand-strong)", strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-end gap-3 px-2">
                {points.map((point) => (
                  <div
                    key={point.label}
                    className="flex-1 rounded-t-[1.2rem] bg-[var(--fyxvo-brand)]/20"
                    style={{ height: `${Math.max((point.value / maxValue) * 100, 12)}%` }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
          {points.map((point) => (
            <div
              key={point.label}
              className="rounded-[1.3rem] border border-[color:var(--fyxvo-border)] bg-[color:var(--fyxvo-panel-soft)] p-3"
            >
              <div className="text-xs uppercase tracking-[0.14em] text-[var(--fyxvo-text-muted)]">{point.label}</div>
              <div className="mt-2 text-lg font-semibold text-[var(--fyxvo-text)]">{point.value}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function BarChartCard({
  title,
  description,
  points
}: {
  readonly title: string;
  readonly description: string;
  readonly points: readonly SampleTrendPoint[];
}) {
  const mounted = useIsClient();
  const maxValue = Math.max(...points.map((point) => point.value), 1);

  return (
    <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="overflow-hidden rounded-[1.8rem] border border-[color:var(--fyxvo-border)] bg-[color:var(--fyxvo-panel-soft)] px-3 py-4">
          <div className="h-64 w-full">
            {mounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={points} barSize={26}>
                  <CartesianGrid stroke="var(--fyxvo-border)" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "var(--fyxvo-text-muted)", fontSize: 12 }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "var(--fyxvo-text-muted)", fontSize: 12 }}
                    width={36}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="value" radius={[12, 12, 4, 4]}>
                    {points.map((point, index) => (
                      <Cell
                        key={point.label}
                        fill={index % 2 === 0 ? "var(--fyxvo-brand)" : "var(--fyxvo-brand-soft)"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-end gap-3 px-2">
                {points.map((point, index) => (
                  <div
                    key={point.label}
                    className={index % 2 === 0 ? "flex-1 rounded-t-[1.2rem] bg-[var(--fyxvo-brand)]/20" : "flex-1 rounded-t-[1.2rem] bg-[var(--fyxvo-brand-soft)]/25"}
                    style={{ height: `${Math.max((point.value / maxValue) * 100, 12)}%` }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
