/**
 * Attempts to switch the injected Phantom wallet to Solana devnet.
 * Returns true if successful, false if network mismatch persists.
 */
export async function ensureInjectedPhantomDevnet(): Promise<boolean> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const phantom = (window as any).phantom?.solana;
    if (!phantom) return false;

    // Try to switch network if the method exists
    if (typeof phantom.request === "function") {
      try {
        await phantom.request({ method: "switchNetwork", params: { network: "devnet" } });
        return true;
      } catch {
        // ignore
      }
    }

    // Fallback: check if already on devnet
    const network = phantom.network ?? phantom._network;
    return network === "devnet" || network === "devnet-solana";
  } catch {
    return false;
  }
}
