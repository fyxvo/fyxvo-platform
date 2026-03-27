import { DEFAULT_SOLANA_COMMITMENT } from "./constants.js";
import { FYXVO_DEVNET_ADMIN_AUTHORITY, FYXVO_DEVNET_USDC_MINT_ADDRESS } from "./protocol.js";

export type SolanaNetwork = "devnet";

export interface SolanaNetworkConfig {
  readonly cluster: SolanaNetwork;
  readonly rpcUrl: string;
  readonly websocketUrl: string;
  readonly explorerBaseUrl: string;
  readonly commitment: typeof DEFAULT_SOLANA_COMMITMENT;
  readonly programIds: {
    readonly fyxvo: string;
  };
  readonly adminAuthority: string;
  readonly usdcMintAddress: string;
}

export const solanaDevnetConfig: SolanaNetworkConfig = {
  cluster: "devnet",
  rpcUrl: "https://api.devnet.solana.com",
  websocketUrl: "wss://api.devnet.solana.com",
  explorerBaseUrl: "https://explorer.solana.com",
  commitment: DEFAULT_SOLANA_COMMITMENT,
  programIds: {
    fyxvo: "Gsi8tsTm7BinEgcYd1Uc4wtNBjMrjYfbtKdoDpGdvkJc"
  },
  adminAuthority: FYXVO_DEVNET_ADMIN_AUTHORITY,
  usdcMintAddress: FYXVO_DEVNET_USDC_MINT_ADDRESS
};

export const solanaNetworks = {
  devnet: solanaDevnetConfig
} as const;

export function getSolanaNetworkConfig(network: SolanaNetwork = "devnet"): SolanaNetworkConfig {
  return solanaNetworks[network];
}

export function createExplorerUrl(path: string, network: SolanaNetwork = "devnet"): string {
  const normalizedPath = path.replace(/^\//, "");
  const url = new URL(`/${normalizedPath}`, solanaNetworks[network].explorerBaseUrl);
  url.searchParams.set("cluster", network);
  return url.toString();
}
