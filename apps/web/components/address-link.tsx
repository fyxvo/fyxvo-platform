import { SOLANA_CLUSTER } from "../lib/env";
import { shortAddress } from "../lib/format";

interface AddressLinkProps {
  address: string;
  type?: "account" | "tx";
  chars?: number;
  className?: string;
}

export function AddressLink({ address, type = "account", chars = 4, className }: AddressLinkProps) {
  const cluster = SOLANA_CLUSTER === "mainnet-beta" ? "" : `?cluster=${SOLANA_CLUSTER}`;
  const base = type === "tx" ? "tx" : "address";
  const href = `https://explorer.solana.com/${base}/${address}${cluster}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className ?? "font-mono text-xs text-[var(--fyxvo-brand)] hover:underline"}
    >
      {shortAddress(address, chars)}
    </a>
  );
}
