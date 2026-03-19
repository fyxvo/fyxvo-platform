import type { ReactNode } from "react";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@fyxvo/ui";

export function MetricCard({
  label,
  value,
  detail,
  accent,
  footer,
}: {
  readonly label: string;
  readonly value: string;
  readonly detail: string;
  readonly accent?: ReactNode;
  readonly footer?: ReactNode;
}) {
  return (
    <Card className="fyxvo-surface border-white/5">
      <CardHeader className="mb-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--fyxvo-text-muted)]">
              {label}
            </p>
            <CardTitle className="mt-3 break-words text-3xl">{value}</CardTitle>
          </div>
          {accent ? <div className="shrink-0 self-start">{accent}</div> : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm leading-6 text-[var(--fyxvo-text-muted)]">{detail}</p>
        {footer ? <div>{footer}</div> : null}
      </CardContent>
    </Card>
  );
}

export function DeltaBadge({
  value,
  positive = true,
}: {
  readonly value: string;
  readonly positive?: boolean;
}) {
  return <Badge tone={positive ? "success" : "warning"}>{value}</Badge>;
}
