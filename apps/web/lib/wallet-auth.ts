import bs58 from "bs58";
import { createAuthChallenge, verifyWalletSession } from "./api";
import type { WalletSession } from "./types";

export async function authenticateWallet(params: {
  walletAddress: string;
  signMessage: (message: Uint8Array) => Promise<Uint8Array>;
}): Promise<WalletSession> {
  const challenge = await createAuthChallenge(params.walletAddress);
  const encoded = new TextEncoder().encode(challenge.message);
  const signatureBytes = await params.signMessage(encoded);
  const signature = bs58.encode(signatureBytes);

  return verifyWalletSession({
    walletAddress: params.walletAddress,
    message: challenge.message,
    signature,
  });
}
