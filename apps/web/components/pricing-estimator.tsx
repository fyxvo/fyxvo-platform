"use client";

import { useState } from "react";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@fyxvo/ui";
import { PRICING_LAMPORTS, VOLUME_DISCOUNT, FREE_TIER_REQUESTS, applyVolumeDiscount } from "@fyxvo/config/pricing";

const LAMPORTS_PER_SOL = 1_000_000_000;

interface Props {
  readonly solPriceUsd: number | null;
}

function estimateCost(input: {
  monthly: number;
  standardPct: number;
  computeHeavyPct: number;
  priorityPct: number;
  solPriceUsd: number | null;
}) {
  const { monthly, standardPct, computeHeavyPct, priorityPct, solPriceUsd } = input;
  const standardCount = Math.round(monthly * standardPct / 100);
  const computeHeavyCount = Math.round(monthly * computeHeavyPct / 100);
  const priorityCount = Math.round(monthly * priorityPct / 100);

  const stdPrice = applyVolumeDiscount(PRICING_LAMPORTS.standard, monthly);
  const chPrice = applyVolumeDiscount(PRICING_LAMPORTS.computeHeavy, monthly);
  const priPrice = applyVolumeDiscount(PRICING_LAMPORTS.priority, monthly);

  const totalLamports = stdPrice * standardCount + chPrice * computeHeavyCount + priPrice * priorityCount;
  const totalSol = totalLamports / LAMPORTS_PER_SOL;
  const totalUsd = solPriceUsd != null ? totalSol * solPriceUsd : null;

  const discountPct = monthly >= VOLUME_DISCOUNT.tier2.monthlyRequests
    ? VOLUME_DISCOUNT.tier2.discountBps / 100
    : monthly >= VOLUME_DISCOUNT.tier1.monthlyRequests
      ? VOLUME_DISCOUNT.tier1.discountBps / 100
      : 0;

  return { totalLamports, totalSol, totalUsd, discountPct, stdPrice, chPrice, priPrice };
}

export function PricingEstimator({ solPriceUsd }: Props) {
  const [monthly, setMonthly] = useState(100_000);
  const [standardPct, setStandardPct] = useState(70);
  const [computeHeavyPct, setComputeHeavyPct] = useState(20);
  const priorityPct = Math.max(0, 100 - standardPct - computeHeavyPct);

  const result = estimateCost({ monthly, standardPct, computeHeavyPct, priorityPct, solPriceUsd });
  const freeRemaining = Math.max(0, FREE_TIER_REQUESTS - monthly);

  return (
    <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
      <CardHeader>
        <CardTitle>Cost estimator</CardTitle>
        <CardDescription>Adjust request volume and method mix to estimate monthly SOL spend.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-3">
          <div>
            <label className="text-xs uppercase tracking-wider text-[var(--fyxvo-text-muted)]">
              Monthly requests: <span className="font-medium text-[var(--fyxvo-text)]">{monthly.toLocaleString()}</span>
            </label>
            <input
              type="range"
              min={1000}
              max={50_000_000}
              step={1000}
              value={monthly}
              onChange={(e) => setMonthly(Number(e.target.value))}
              className="mt-1 w-full accent-brand-500"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-[var(--fyxvo-text-muted)]">
              Standard reads: <span className="font-medium text-[var(--fyxvo-text)]">{standardPct}%</span>
            </label>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={standardPct}
              onChange={(e) => {
                const v = Number(e.target.value);
                setStandardPct(v);
                if (v + computeHeavyPct > 100) setComputeHeavyPct(100 - v);
              }}
              className="mt-1 w-full accent-brand-500"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-[var(--fyxvo-text-muted)]">
              Compute-heavy: <span className="font-medium text-[var(--fyxvo-text)]">{computeHeavyPct}%</span>
            </label>
            <input
              type="range"
              min={0}
              max={100 - standardPct}
              step={5}
              value={computeHeavyPct}
              onChange={(e) => setComputeHeavyPct(Number(e.target.value))}
              className="mt-1 w-full accent-brand-500"
            />
          </div>
          <p className="text-xs text-[var(--fyxvo-text-muted)]">Priority relay: {priorityPct}% (remainder)</p>
        </div>

        <div className="rounded-[1.5rem] border border-[color:var(--fyxvo-border)] bg-[color:var(--fyxvo-panel-soft)] p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--fyxvo-text-muted)]">Monthly lamports</span>
            <span className="font-mono text-sm text-[var(--fyxvo-text)]">{result.totalLamports.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--fyxvo-text-muted)]">Monthly SOL</span>
            <span className="font-mono text-sm font-semibold text-[var(--fyxvo-text)]">{result.totalSol.toFixed(6)} SOL</span>
          </div>
          {result.totalUsd != null ? (
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--fyxvo-text-muted)]">Est. USD</span>
              <span className="font-mono text-sm text-[var(--fyxvo-text-soft)]">~${result.totalUsd.toFixed(2)}</span>
            </div>
          ) : null}
          {result.discountPct > 0 ? (
            <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
              <span className="text-xs">Volume discount applied</span>
              <span className="text-xs font-medium">−{result.discountPct}%</span>
            </div>
          ) : null}
          {freeRemaining > 0 ? (
            <div className="text-xs text-emerald-600 dark:text-emerald-400">
              {freeRemaining.toLocaleString()} of your {FREE_TIER_REQUESTS.toLocaleString()} free requests remain for new projects.
            </div>
          ) : null}
        </div>

        <div className="text-xs text-[var(--fyxvo-text-muted)] space-y-1">
          <p>Effective rates at this volume: {result.stdPrice} lam/std · {result.chPrice} lam/compute-heavy · {result.priPrice} lam/priority</p>
          {solPriceUsd != null ? (
            <p>SOL price used: ${solPriceUsd.toFixed(2)} (live from CoinGecko)</p>
          ) : (
            <p>USD estimate unavailable — SOL price could not be fetched.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Advanced pricing estimator
// ---------------------------------------------------------------------------

const ADVANCED_LAMPORTS_PER_REQUEST: Record<"standard" | "priority", number> = {
  standard: 1000,
  priority: 5000,
};

interface RequestTypeRow {
  readonly id: number;
  methodName: string;
  countPerDay: number;
  mode: "standard" | "priority";
}

const MAX_ROWS = 5;

function nextId(rows: RequestTypeRow[]): number {
  return rows.reduce((max, r) => Math.max(max, r.id), 0) + 1;
}

interface AdvancedProps {
  readonly solPriceUsd: number | null;
}

export function AdvancedPricingEstimator({ solPriceUsd }: AdvancedProps) {
  const [rows, setRows] = useState<RequestTypeRow[]>([
    { id: 1, methodName: "getBalance", countPerDay: 10000, mode: "standard" },
  ]);

  function updateRow(id: number, patch: Partial<Omit<RequestTypeRow, "id">>) {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...patch } : r))
    );
  }

  function addRow() {
    if (rows.length >= MAX_ROWS) return;
    setRows((prev) => [
      ...prev,
      { id: nextId(prev), methodName: "", countPerDay: 1000, mode: "standard" },
    ]);
  }

  function removeRow(id: number) {
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  const rowBreakdowns = rows.map((row) => {
    const lamportsPerReq = ADVANCED_LAMPORTS_PER_REQUEST[row.mode];
    const dailyLamports = row.countPerDay * lamportsPerReq;
    const dailySol = dailyLamports / LAMPORTS_PER_SOL;
    return { ...row, lamportsPerReq, dailyLamports, dailySol };
  });

  const totalDailySol = rowBreakdowns.reduce((sum, r) => sum + r.dailySol, 0);
  const totalMonthlySol = totalDailySol * 30;
  const totalDailyRequests = rows.reduce((sum, r) => sum + r.countPerDay, 0);
  const requestsPerSol =
    totalDailySol > 0 ? Math.round(totalDailyRequests / totalDailySol) : 0;
  const recommended30DayFund = totalMonthlySol;

  return (
    <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
      <CardHeader>
        <CardTitle>Advanced cost estimator</CardTitle>
        <CardDescription>
          Add request types by method name to model your exact traffic mix.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-3">
          {rows.map((row) => (
            <div
              key={row.id}
              className="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-center"
            >
              <input
                type="text"
                value={row.methodName}
                onChange={(e) => updateRow(row.id, { methodName: e.target.value })}
                placeholder="e.g. getBalance calls"
                className="h-9 rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-3 text-sm text-[var(--fyxvo-text)] placeholder:text-[var(--fyxvo-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--fyxvo-accent)]"
              />
              <input
                type="number"
                min={0}
                step={100}
                value={row.countPerDay}
                onChange={(e) => updateRow(row.id, { countPerDay: Math.max(0, Number(e.target.value)) })}
                className="h-9 w-28 rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-3 text-sm text-[var(--fyxvo-text)] focus:outline-none focus:ring-1 focus:ring-[var(--fyxvo-accent)]"
              />
              <select
                value={row.mode}
                onChange={(e) => updateRow(row.id, { mode: e.target.value as "standard" | "priority" })}
                className="h-9 rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-2 text-sm text-[var(--fyxvo-text)] focus:outline-none focus:ring-1 focus:ring-[var(--fyxvo-accent)]"
              >
                <option value="standard">Standard</option>
                <option value="priority">Priority</option>
              </select>
              {rows.length > 1 ? (
                <button
                  type="button"
                  onClick={() => removeRow(row.id)}
                  className="h-9 w-9 flex items-center justify-center rounded-lg border border-[var(--fyxvo-border)] text-[var(--fyxvo-text-muted)] hover:text-[var(--fyxvo-text)] transition-colors"
                  aria-label="Remove row"
                >
                  ×
                </button>
              ) : (
                <div className="h-9 w-9" />
              )}
            </div>
          ))}
        </div>

        {rows.length < MAX_ROWS ? (
          <Button variant="secondary" size="sm" onClick={addRow}>
            Add another request type
          </Button>
        ) : (
          <p className="text-xs text-[var(--fyxvo-text-muted)]">Maximum of {MAX_ROWS} request types reached.</p>
        )}

        {/* Per-type breakdown */}
        <div className="rounded-[1.5rem] border border-[color:var(--fyxvo-border)] bg-[color:var(--fyxvo-panel-soft)] p-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--fyxvo-text-muted)]">Daily cost breakdown</p>
          {rowBreakdowns.map((row) => (
            <div key={row.id} className="flex items-center justify-between text-sm">
              <span className="truncate max-w-[180px] text-[var(--fyxvo-text-soft)]">
                {row.methodName || "(unnamed)"}
                <span className="ml-1 text-xs text-[var(--fyxvo-text-muted)]">
                  {row.countPerDay.toLocaleString()} × {row.lamportsPerReq.toLocaleString()} lam
                </span>
              </span>
              <span className="font-mono text-[var(--fyxvo-text)]">{row.dailySol.toFixed(6)} SOL</span>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="rounded-[1.5rem] border border-[color:var(--fyxvo-border)] bg-[color:var(--fyxvo-panel-soft)] p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--fyxvo-text-muted)]">Total daily cost</span>
            <span className="font-mono text-sm font-semibold text-[var(--fyxvo-text)]">{totalDailySol.toFixed(6)} SOL</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--fyxvo-text-muted)]">Total monthly cost</span>
            <span className="font-mono text-sm font-semibold text-[var(--fyxvo-text)]">{totalMonthlySol.toFixed(6)} SOL</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--fyxvo-text-muted)]">Requests per SOL</span>
            <span className="font-mono text-sm text-[var(--fyxvo-text)]">{requestsPerSol.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--fyxvo-text-muted)]">Recommended 30-day fund</span>
            <span className="font-mono text-sm font-semibold text-emerald-600 dark:text-emerald-400">{recommended30DayFund.toFixed(6)} SOL</span>
          </div>
          {solPriceUsd != null && totalMonthlySol > 0 ? (
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--fyxvo-text-muted)]">Est. monthly USD</span>
              <span className="font-mono text-sm text-[var(--fyxvo-text-soft)]">~${(totalMonthlySol * solPriceUsd).toFixed(2)}</span>
            </div>
          ) : null}
        </div>

        <p className="text-xs text-[var(--fyxvo-text-muted)]">
          Standard: {ADVANCED_LAMPORTS_PER_REQUEST.standard.toLocaleString()} lamports/req ·
          Priority: {ADVANCED_LAMPORTS_PER_REQUEST.priority.toLocaleString()} lamports/req
        </p>
      </CardContent>
    </Card>
  );
}
