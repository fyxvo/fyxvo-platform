"use client";

import { useState } from "react";
import { Button } from "@fyxvo/ui";
import { CopyIcon } from "./icons";

export function CopyButton({
  value,
  label = "Copy",
  className,
}: {
  readonly value: string;
  readonly label?: string;
  readonly className?: string;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <Button
      variant="ghost"
      size="sm"
      className={className}
      leadingIcon={<CopyIcon className="h-4 w-4" />}
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1600);
      }}
    >
      {copied ? "Copied" : label}
    </Button>
  );
}
