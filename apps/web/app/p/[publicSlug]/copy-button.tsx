"use client";

import { useState } from "react";

export default function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard not available
    }
  };

  return (
    <button
      onClick={() => void copy()}
      className="shrink-0 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-[#f1f5f9] hover:bg-white/[0.05] transition-colors"
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}
