"use client";

import { useMemo } from "react";

function formatJson(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  return JSON.stringify(value, null, 2);
}

function highlightJson(text: string) {
  const html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(
      /("(?:\\u[\da-fA-F]{4}|\\[^u]|[^\\"])*"\s*:?)|\b(true|false|null)\b|-?\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b/g,
      (match) => {
        if (match.startsWith('"')) {
          const tokenClass = match.endsWith(":") ? "text-sky-300" : "text-emerald-300";
          return `<span class="${tokenClass}">${match}</span>`;
        }
        if (/true|false/.test(match)) {
          return `<span class="text-violet-300">${match}</span>`;
        }
        if (match === "null") {
          return `<span class="text-zinc-500">${match}</span>`;
        }
        return `<span class="text-amber-300">${match}</span>`;
      }
    );

  return html;
}

interface JsonResponseViewProps {
  value: unknown;
  emptyMessage?: string;
  maxHeightClassName?: string;
}

export function JsonResponseView({
  value,
  emptyMessage = "No response yet.",
  maxHeightClassName = "max-h-[32rem]",
}: JsonResponseViewProps) {
  const text = useMemo(() => {
    if (value == null || value === "") {
      return "";
    }
    return formatJson(value);
  }, [value]);

  if (!text) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] px-4 py-6 text-sm text-[var(--fyxvo-text-muted)]">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--fyxvo-border)] bg-[#0b0d10]">
      <pre
        className={`overflow-auto p-4 text-sm leading-6 ${maxHeightClassName}`}
        dangerouslySetInnerHTML={{ __html: highlightJson(text) }}
      />
    </div>
  );
}
