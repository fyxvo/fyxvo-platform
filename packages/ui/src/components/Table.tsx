import type { ReactNode } from "react";
import { cn } from "../lib/cn";

export interface TableColumn<Row> {
  readonly key: string;
  readonly header: ReactNode;
  readonly cell: (row: Row) => ReactNode;
  readonly className?: string;
  readonly align?: "left" | "right" | "center";
}

export interface TableProps<Row> {
  readonly columns: readonly TableColumn<Row>[];
  readonly rows: readonly Row[];
  readonly getRowKey: (row: Row) => string;
  readonly emptyState?: ReactNode;
  readonly className?: string;
}

export function Table<Row>({
  columns,
  rows,
  getRowKey,
  emptyState = "No records available.",
  className,
}: TableProps<Row>) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel)]",
        className
      )}
    >
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-[var(--fyxvo-border)] text-sm">
          <thead className="bg-[var(--fyxvo-panel-soft)]">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={cn(
                    "px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--fyxvo-text-muted)]",
                    column.align === "right" ? "text-right" : column.align === "center" ? "text-center" : "text-left",
                    column.className
                  )}
                  scope="col"
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--fyxvo-border)] text-[var(--fyxvo-text-soft)]">
            {rows.length > 0 ? (
              rows.map((row) => (
                <tr
                  key={getRowKey(row)}
                  className="transition-colors duration-100 hover:bg-[var(--fyxvo-panel-soft)]"
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={cn(
                        "px-4 py-3.5 align-middle",
                        column.align === "right" ? "text-right" : column.align === "center" ? "text-center" : "text-left",
                        column.className
                      )}
                    >
                      {column.cell(row)}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  className="px-4 py-10 text-center text-sm text-[var(--fyxvo-text-muted)]"
                  colSpan={columns.length}
                >
                  {emptyState}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
