import type { ReactNode } from "react";
import { createPageMetadata } from "../../lib/metadata";

export const metadata = createPageMetadata(
  "Transactions",
  "Review project funding history and open confirmed Solana devnet transactions in the explorer."
);

export default function TransactionsLayout({ children }: { children: ReactNode }) {
  return children;
}
