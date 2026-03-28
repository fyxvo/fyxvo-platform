import type { Connection } from "@solana/web3.js";
import { VersionedTransaction } from "@solana/web3.js";

export async function signAndSubmitVersionedTransaction(params: {
  connection: Connection;
  transactionBase64: string;
  recentBlockhash: string;
  lastValidBlockHeight: number;
  signTransaction?: (transaction: VersionedTransaction) => Promise<VersionedTransaction>;
}) {
  const { connection, transactionBase64, recentBlockhash, lastValidBlockHeight, signTransaction } =
    params;

  if (!signTransaction) {
    throw new Error("This wallet does not support transaction signing.");
  }

  const decoded = Uint8Array.from(atob(transactionBase64), (char) => char.charCodeAt(0));
  const transaction = VersionedTransaction.deserialize(decoded);
  const signedTransaction = await signTransaction(transaction);
  const signature = await connection.sendRawTransaction(signedTransaction.serialize(), {
    preflightCommitment: "confirmed",
    maxRetries: 3,
  });

  const confirmation = await connection.confirmTransaction(
    {
      signature,
      blockhash: recentBlockhash,
      lastValidBlockHeight,
    },
    "confirmed"
  );

  if (confirmation.value.err) {
    throw new Error("The Solana transaction was not confirmed.");
  }

  return signature;
}

export function solToLamportsString(value: string): string {
  const trimmed = value.trim();
  if (!/^\d+(\.\d+)?$/.test(trimmed)) {
    throw new Error("Enter a valid SOL amount.");
  }

  const parts = trimmed.split(".");
  const wholePart = parts[0] ?? "0";
  const decimalPart = parts[1] ?? "";
  const normalizedDecimals = `${decimalPart}000000000`.slice(0, 9);
  const wholeLamports = BigInt(wholePart) * 1_000_000_000n;
  const decimalLamports = BigInt(normalizedDecimals);
  const lamports = wholeLamports + decimalLamports;

  if (lamports <= 0n) {
    throw new Error("Funding amount must be greater than zero.");
  }

  return lamports.toString();
}
