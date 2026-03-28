"use client";

import { Button } from "@fyxvo/ui";
import { useState } from "react";
import { CheckIcon, CopyIcon } from "./icons";

interface CopyButtonProps {
  text: string;
  className?: string;
}

export function CopyButton({ text, className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleCopy}
      aria-label="Copy"
      className={className}
    >
      {copied ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
      <span className="sr-only">Copy</span>
    </Button>
  );
}
