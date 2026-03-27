import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { PublicKey, type Commitment, type Connection } from "@solana/web3.js";
import { anchorAccountDiscriminator, fyxvoProgramSeeds, readU64Le } from "./fyxvo-program.js";

export const FYXVO_DEVNET_ADMIN_AUTHORITY = "AgMDb4kHaUKqZSjZvFUoKpXYYTjz5Lg5pf3CwYuyAsem";
export const FYXVO_DEVNET_USDC_MINT_ADDRESS = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";
export const FYXVO_DEVNET_PROTOCOL_CONFIG = "GCWgmpoS2booNCp5VNP6z9HdYmkXpoXpM3rPK8kziqKX";
export const FYXVO_DEVNET_TREASURY = "3JaVp2CsJASutTAzVAjNfXi4yAR5f8uH1zoXAgaSh3px";
export const FYXVO_DEVNET_OPERATOR_REGISTRY = "Df3tPaGGietrQdqjX7FGkuYb1XF6o36Vat2q92BmioWC";
export const FYXVO_DEVNET_TREASURY_USDC_VAULT = "31xqm4gxzqQhxLr8RpBpMggr4DywGUnMLDWPKdR5Baa9";
export const FYXVO_DEVNET_MANAGED_OPERATOR_WALLET = "8TZ1Q5TqNmbDkza57ZssfmufMxX8hxoKV28uhWg4Qnph";
export const FYXVO_DEVNET_MANAGED_OPERATOR_ACCOUNT = "5DnhYryvZAKWLY6kuzQKYrUdNBCskQ3oZgnrMmj6Fwi6";
export const FYXVO_DEVNET_MANAGED_REWARD_ACCOUNT = "HM3HHtkJDY4gYzeixSfEQp2Hk7VrE8mQoouNhM7q3TEG";

const protocolConfigDiscriminator = anchorAccountDiscriminator("ProtocolConfig");
const treasuryDiscriminator = anchorAccountDiscriminator("Treasury");
const operatorRegistryDiscriminator = anchorAccountDiscriminator("OperatorRegistry");
const bpfLoaderUpgradeableProgramId = new PublicKey("BPFLoaderUpgradeab1e11111111111111111111111");

export interface FyxvoProtocolAddresses {
  readonly programId: PublicKey;
  readonly protocolConfig: PublicKey;
  readonly treasury: PublicKey;
  readonly operatorRegistry: PublicKey;
  readonly treasuryUsdcVault?: PublicKey;
}

export interface FyxvoProtocolConfigState {
  readonly authority: string;
  readonly treasury: string;
  readonly operatorRegistry: string;
  readonly usdcMint: string;
  readonly feeBps: number;
  readonly paused: boolean;
  readonly bump: number;
}

export interface FyxvoTreasuryState {
  readonly protocolConfig: string;
  readonly usdcVault: string;
  readonly solBalance: bigint;
  readonly usdcBalance: bigint;
  readonly reservedSolRewards: bigint;
  readonly reservedUsdcRewards: bigint;
  readonly protocolSolFeesOwed: bigint;
  readonly protocolUsdcFeesOwed: bigint;
  readonly bump: number;
}

export interface FyxvoOperatorRegistryState {
  readonly protocolConfig: string;
  readonly totalRegistered: bigint;
  readonly bump: number;
}

export interface FyxvoProtocolReadiness {
  readonly ready: boolean;
  readonly cluster: "devnet";
  readonly programId: string;
  readonly expectedProgramId: string;
  readonly expectedAdminAuthority: string;
  readonly expectedUpgradeAuthorityHint: string | null;
  readonly expectedUsdcMint: string;
  readonly programDataAddress: string | null;
  readonly programUpgradeAuthority: string | null;
  readonly addresses: {
    readonly programId: string;
    readonly protocolConfig: string;
    readonly treasury: string;
    readonly operatorRegistry: string;
    readonly treasuryUsdcVault: string;
  };
  readonly checks: {
    readonly programDeployed: boolean;
    readonly programExecutable: boolean;
    readonly protocolConfigExists: boolean;
    readonly treasuryExists: boolean;
    readonly operatorRegistryExists: boolean;
    readonly treasuryUsdcVaultExists: boolean;
    readonly adminAuthorityMatches: boolean;
    readonly upgradeAuthorityKnown: boolean;
    readonly upgradeAuthorityMatchesHint: boolean | null;
    readonly usdcMintMatches: boolean;
    readonly treasuryMatches: boolean;
    readonly treasuryUsdcVaultMatches: boolean;
    readonly operatorRegistryMatches: boolean;
  };
  readonly acceptedAssets: {
    readonly sol: true;
    readonly usdcConfigured: boolean;
  };
  readonly protocolConfig: FyxvoProtocolConfigState | null;
  readonly treasury: FyxvoTreasuryState | null;
  readonly operatorRegistry: FyxvoOperatorRegistryState | null;
  readonly reasons: string[];
}

function decodeUpgradeableProgramDataAddress(data: Buffer): string | null {
  if (data.length < 36 || data.readUInt32LE(0) !== 2) {
    return null;
  }

  return new PublicKey(data.subarray(4, 36)).toBase58();
}

function decodeUpgradeableProgramAuthority(data: Buffer): string | null {
  if (data.length < 16 || data.readUInt32LE(0) !== 3) {
    return null;
  }

  const option = data.readUInt32LE(12);
  if (option !== 1 || data.length < 48) {
    return null;
  }

  return new PublicKey(data.subarray(16, 48)).toBase58();
}

export function deriveFyxvoProtocolAddresses(input: {
  readonly programId: string | PublicKey;
  readonly usdcMintAddress?: string | PublicKey;
}): FyxvoProtocolAddresses {
  const programId = input.programId instanceof PublicKey ? input.programId : new PublicKey(input.programId);
  const protocolConfig = PublicKey.findProgramAddressSync([fyxvoProgramSeeds.protocolConfig], programId)[0];
  const treasury = PublicKey.findProgramAddressSync([fyxvoProgramSeeds.treasury], programId)[0];
  const operatorRegistry = PublicKey.findProgramAddressSync(
    [fyxvoProgramSeeds.operatorRegistry, protocolConfig.toBuffer()],
    programId
  )[0];
  const usdcMintAddress =
    input.usdcMintAddress instanceof PublicKey
      ? input.usdcMintAddress
      : input.usdcMintAddress
        ? new PublicKey(input.usdcMintAddress)
        : undefined;

  return {
    programId,
    protocolConfig,
    treasury,
    operatorRegistry,
    ...(usdcMintAddress
      ? {
          treasuryUsdcVault: getAssociatedTokenAddressSync(usdcMintAddress, treasury, true)
        }
      : {})
  };
}

function ensureDiscriminator(data: Buffer, discriminator: Buffer, label: string) {
  if (data.length < discriminator.length) {
    throw new Error(`${label} account data is too short to decode.`);
  }

  if (!data.subarray(0, discriminator.length).equals(discriminator)) {
    throw new Error(`${label} account discriminator does not match.`);
  }
}

export function decodeFyxvoProtocolConfig(data: Buffer): FyxvoProtocolConfigState {
  ensureDiscriminator(data, protocolConfigDiscriminator, "ProtocolConfig");

  return {
    authority: new PublicKey(data.subarray(8, 40)).toBase58(),
    treasury: new PublicKey(data.subarray(40, 72)).toBase58(),
    operatorRegistry: new PublicKey(data.subarray(72, 104)).toBase58(),
    usdcMint: new PublicKey(data.subarray(104, 136)).toBase58(),
    feeBps: data.readUInt16LE(136),
    paused: data.readUInt8(138) === 1,
    bump: data.readUInt8(139)
  };
}

export function decodeFyxvoTreasury(data: Buffer): FyxvoTreasuryState {
  ensureDiscriminator(data, treasuryDiscriminator, "Treasury");

  return {
    protocolConfig: new PublicKey(data.subarray(8, 40)).toBase58(),
    usdcVault: new PublicKey(data.subarray(40, 72)).toBase58(),
    solBalance: readU64Le(data, 72),
    usdcBalance: readU64Le(data, 80),
    reservedSolRewards: readU64Le(data, 88),
    reservedUsdcRewards: readU64Le(data, 96),
    protocolSolFeesOwed: readU64Le(data, 104),
    protocolUsdcFeesOwed: readU64Le(data, 112),
    bump: data.readUInt8(120)
  };
}

export function decodeFyxvoOperatorRegistry(data: Buffer): FyxvoOperatorRegistryState {
  ensureDiscriminator(data, operatorRegistryDiscriminator, "OperatorRegistry");

  return {
    protocolConfig: new PublicKey(data.subarray(8, 40)).toBase58(),
    totalRegistered: readU64Le(data, 40),
    bump: data.readUInt8(48)
  };
}

export async function fetchFyxvoProtocolReadiness(input: {
  readonly connection: Pick<Connection, "getAccountInfo">;
  readonly programId: string;
  readonly expectedAdminAuthority?: string;
  readonly expectedUpgradeAuthorityHint?: string | null;
  readonly expectedUsdcMint?: string;
  readonly commitment?: Commitment;
}): Promise<FyxvoProtocolReadiness> {
  const expectedAdminAuthority = input.expectedAdminAuthority ?? FYXVO_DEVNET_ADMIN_AUTHORITY;
  const expectedUpgradeAuthorityHint = input.expectedUpgradeAuthorityHint ?? null;
  const expectedUsdcMint = input.expectedUsdcMint ?? FYXVO_DEVNET_USDC_MINT_ADDRESS;
  const addresses = deriveFyxvoProtocolAddresses({
    programId: input.programId,
    usdcMintAddress: expectedUsdcMint
  });
  const commitment = input.commitment ?? "confirmed";

  const [programInfo, protocolConfigInfo, treasuryInfo, operatorRegistryInfo, treasuryUsdcVaultInfo] =
    await Promise.all([
      input.connection.getAccountInfo(addresses.programId, commitment).catch(() => null),
      input.connection.getAccountInfo(addresses.protocolConfig, commitment).catch(() => null),
      input.connection.getAccountInfo(addresses.treasury, commitment).catch(() => null),
      input.connection.getAccountInfo(addresses.operatorRegistry, commitment).catch(() => null),
      input.connection.getAccountInfo(addresses.treasuryUsdcVault!, commitment).catch(() => null)
    ]);
  const programDataAddress =
    programInfo?.owner?.equals(bpfLoaderUpgradeableProgramId) === true
      ? decodeUpgradeableProgramDataAddress(Buffer.from(programInfo.data))
      : null;
  const programDataInfo = programDataAddress
    ? await input.connection.getAccountInfo(new PublicKey(programDataAddress), commitment).catch(() => null)
    : null;
  const programUpgradeAuthority =
    programDataInfo?.owner?.equals(bpfLoaderUpgradeableProgramId) === true
      ? decodeUpgradeableProgramAuthority(Buffer.from(programDataInfo.data))
      : null;

  let protocolConfig: FyxvoProtocolConfigState | null = null;
  let treasury: FyxvoTreasuryState | null = null;
  let operatorRegistry: FyxvoOperatorRegistryState | null = null;
  const reasons: string[] = [];

  if (protocolConfigInfo) {
    try {
      protocolConfig = decodeFyxvoProtocolConfig(Buffer.from(protocolConfigInfo.data));
    } catch (error) {
      reasons.push(error instanceof Error ? error.message : "ProtocolConfig account could not be decoded.");
    }
  }

  if (treasuryInfo) {
    try {
      treasury = decodeFyxvoTreasury(Buffer.from(treasuryInfo.data));
    } catch (error) {
      reasons.push(error instanceof Error ? error.message : "Treasury account could not be decoded.");
    }
  }

  if (operatorRegistryInfo) {
    try {
      operatorRegistry = decodeFyxvoOperatorRegistry(Buffer.from(operatorRegistryInfo.data));
    } catch (error) {
      reasons.push(error instanceof Error ? error.message : "OperatorRegistry account could not be decoded.");
    }
  }

  const checks = {
    programDeployed: programInfo !== null,
    programExecutable: programInfo?.executable === true,
    protocolConfigExists: protocolConfig !== null,
    treasuryExists: treasury !== null,
    operatorRegistryExists: operatorRegistry !== null,
    treasuryUsdcVaultExists: treasuryUsdcVaultInfo !== null,
    adminAuthorityMatches: protocolConfig?.authority === expectedAdminAuthority,
    upgradeAuthorityKnown: programUpgradeAuthority !== null,
    upgradeAuthorityMatchesHint:
      expectedUpgradeAuthorityHint == null
        ? null
        : programUpgradeAuthority == null
          ? false
          : programUpgradeAuthority === expectedUpgradeAuthorityHint,
    usdcMintMatches: protocolConfig?.usdcMint === expectedUsdcMint,
    treasuryMatches:
      protocolConfig?.treasury === addresses.treasury.toBase58() &&
      treasury?.protocolConfig === addresses.protocolConfig.toBase58(),
    treasuryUsdcVaultMatches: treasury?.usdcVault === addresses.treasuryUsdcVault?.toBase58(),
    operatorRegistryMatches:
      protocolConfig?.operatorRegistry === addresses.operatorRegistry.toBase58() &&
      operatorRegistry?.protocolConfig === addresses.protocolConfig.toBase58()
  } as const;

  if (!checks.programDeployed) {
    reasons.push(`Program ${input.programId} is not deployed on Solana devnet.`);
  } else if (!checks.programExecutable) {
    reasons.push(`Program ${input.programId} exists on devnet but is not marked executable.`);
  }

  if (!checks.protocolConfigExists) {
    reasons.push(`ProtocolConfig PDA ${addresses.protocolConfig.toBase58()} does not exist.`);
  }

  if (!checks.treasuryExists) {
    reasons.push(`Treasury PDA ${addresses.treasury.toBase58()} does not exist.`);
  }

  if (!checks.operatorRegistryExists) {
    reasons.push(`OperatorRegistry PDA ${addresses.operatorRegistry.toBase58()} does not exist.`);
  }

  if (!checks.treasuryUsdcVaultExists) {
    reasons.push(
      `Accepted asset config for devnet USDC is incomplete because treasury vault ${addresses.treasuryUsdcVault?.toBase58()} does not exist.`
    );
  }

  if (protocolConfig && !checks.adminAuthorityMatches) {
    reasons.push(
      `Protocol authority is ${protocolConfig.authority}, expected ${expectedAdminAuthority}.`
    );
  }

  if (expectedUpgradeAuthorityHint && programUpgradeAuthority == null) {
    reasons.push("Program upgrade authority could not be decoded from the deployed program.");
  }

  if (
    expectedUpgradeAuthorityHint &&
    programUpgradeAuthority &&
    programUpgradeAuthority !== expectedUpgradeAuthorityHint
  ) {
    reasons.push(
      `Program upgrade authority is ${programUpgradeAuthority}, expected ${expectedUpgradeAuthorityHint}.`
    );
  }

  if (protocolConfig && !checks.usdcMintMatches) {
    reasons.push(`Protocol USDC mint is ${protocolConfig.usdcMint}, expected ${expectedUsdcMint}.`);
  }

  if (protocolConfig && treasury && !checks.treasuryMatches) {
    reasons.push("Treasury linkage does not match the derived protocol addresses.");
  }

  if (treasury && !checks.treasuryUsdcVaultMatches) {
    reasons.push("Accepted asset config for devnet USDC does not match the derived treasury token vault.");
  }

  if (protocolConfig && operatorRegistry && !checks.operatorRegistryMatches) {
    reasons.push("Operator registry linkage does not match the derived protocol addresses.");
  }

  return {
    ready:
      checks.programDeployed &&
      checks.programExecutable &&
      checks.protocolConfigExists &&
      checks.treasuryExists &&
      checks.operatorRegistryExists &&
      checks.treasuryUsdcVaultExists &&
      checks.adminAuthorityMatches &&
      checks.usdcMintMatches &&
      checks.treasuryMatches &&
      checks.treasuryUsdcVaultMatches &&
      checks.operatorRegistryMatches,
    cluster: "devnet",
    programId: input.programId,
    expectedProgramId: input.programId,
    expectedAdminAuthority,
    expectedUpgradeAuthorityHint,
    expectedUsdcMint,
    programDataAddress,
    programUpgradeAuthority,
    addresses: {
      programId: addresses.programId.toBase58(),
      protocolConfig: addresses.protocolConfig.toBase58(),
      treasury: addresses.treasury.toBase58(),
      operatorRegistry: addresses.operatorRegistry.toBase58(),
      treasuryUsdcVault: addresses.treasuryUsdcVault!.toBase58()
    },
    checks,
    acceptedAssets: {
      sol: true,
      usdcConfigured: checks.usdcMintMatches && checks.treasuryUsdcVaultExists
    },
    protocolConfig,
    treasury,
    operatorRegistry,
    reasons: [...new Set(reasons)]
  };
}

export function formatFyxvoProtocolReadiness(readiness: FyxvoProtocolReadiness): string {
  if (readiness.ready) {
    return `Fyxvo protocol ${readiness.programId} is ready on Solana devnet.`;
  }

  return readiness.reasons.join(" ");
}
