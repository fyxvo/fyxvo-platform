import {
  anchorInstructionDiscriminator,
  createExplorerUrl,
  decodeFyxvoProjectFundingState,
  encodeU64,
  type FyxvoProtocolReadiness,
  fetchFyxvoProtocolReadiness,
  fyxvoProgramSeeds,
  formatFyxvoProtocolReadiness,
  getSolanaNetworkConfig
} from "@fyxvo/config";
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import {
  Connection,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction
} from "@solana/web3.js";
import type {
  BlockchainClient,
  FundingPreparation,
  FundingVerification,
  OnChainProjectSnapshot,
  ProjectActivationVerification,
  ProjectCreationPreparation
} from "./types.js";

export class ProtocolReadinessError extends Error {
  constructor(readonly readiness: FyxvoProtocolReadiness) {
    super(formatFyxvoProtocolReadiness(readiness));
  }
}

function toIsoTimestamp() {
  return new Date().toISOString();
}

function toBalances(data: Buffer) {
  const decoded = decodeFyxvoProjectFundingState(data);
  return {
    totalSolFunded: decoded.totalSolFunded.toString(),
    totalUsdcFunded: decoded.totalUsdcFunded.toString(),
    availableSolCredits: decoded.availableSolCredits.toString(),
    availableUsdcCredits: decoded.availableUsdcCredits.toString(),
    outstandingSolRewards: decoded.outstandingSolRewards.toString(),
    outstandingUsdcRewards: decoded.outstandingUsdcRewards.toString(),
    totalSolRewardsAccrued: decoded.totalSolRewardsAccrued.toString(),
    totalUsdcRewardsAccrued: decoded.totalUsdcRewardsAccrued.toString()
  } as const;
}

export class SolanaBlockchainClient implements BlockchainClient {
  private readonly connection: Connection;
  private readonly programId: PublicKey;
  private readonly usdcMint: PublicKey;
  private readonly expectedAdminAuthority: PublicKey;
  private readonly expectedUpgradeAuthorityHint: string | null;
  private readonly network = getSolanaNetworkConfig("devnet");

  constructor(input: {
    readonly rpcUrl?: string;
    readonly programId?: string;
    readonly expectedAdminAuthority: string;
    readonly expectedUpgradeAuthorityHint?: string | null;
    readonly usdcMintAddress: string;
    readonly connection?: Connection;
  }) {
    this.connection = input.connection ?? new Connection(input.rpcUrl ?? this.network.rpcUrl, "confirmed");
    this.programId = new PublicKey(input.programId ?? this.network.programIds.fyxvo);
    this.usdcMint = new PublicKey(input.usdcMintAddress);
    this.expectedAdminAuthority = new PublicKey(input.expectedAdminAuthority);
    this.expectedUpgradeAuthorityHint = input.expectedUpgradeAuthorityHint ?? null;
  }

  async getLatestBlockhash() {
    return this.connection.getLatestBlockhash("confirmed");
  }

  async getProtocolReadiness() {
    return fetchFyxvoProtocolReadiness({
      connection: this.connection,
      programId: this.programId.toBase58(),
      expectedAdminAuthority: this.expectedAdminAuthority.toBase58(),
      expectedUpgradeAuthorityHint: this.expectedUpgradeAuthorityHint,
      expectedUsdcMint: this.usdcMint.toBase58()
    });
  }

  async prepareProjectCreationTransaction(input: {
    readonly ownerWalletAddress: string;
    readonly chainProjectId: bigint;
    readonly storedProjectPda: string;
  }): Promise<ProjectCreationPreparation> {
    const ownerWallet = new PublicKey(input.ownerWalletAddress);
    const addresses = await this.deriveProjectAddresses(ownerWallet, input.chainProjectId, input.storedProjectPda);

    if (addresses.projectAccountInfo) {
      throw new Error("This project already exists on chain.");
    }

    const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash("confirmed");
    const instruction = new TransactionInstruction({
      programId: this.programId,
      keys: [
        { pubkey: ownerWallet, isSigner: true, isWritable: true },
        { pubkey: addresses.protocolConfigPda, isSigner: false, isWritable: false },
        { pubkey: addresses.treasuryPda, isSigner: false, isWritable: true },
        { pubkey: addresses.projectPda, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
      ],
      data: Buffer.concat([
        anchorInstructionDiscriminator("create_project"),
        encodeU64(input.chainProjectId)
      ])
    });

    const message = new TransactionMessage({
      payerKey: ownerWallet,
      recentBlockhash: blockhash,
      instructions: [instruction]
    }).compileToV0Message();

    const transaction = new VersionedTransaction(message);

    return {
      projectPda: addresses.projectPda.toBase58(),
      protocolConfigPda: addresses.protocolConfigPda.toBase58(),
      treasuryPda: addresses.treasuryPda.toBase58(),
      recentBlockhash: blockhash,
      lastValidBlockHeight,
      transactionBase64: Buffer.from(transaction.serialize()).toString("base64")
    };
  }

  async prepareFundingTransaction(input: {
    readonly ownerWalletAddress: string;
    readonly chainProjectId: bigint;
    readonly storedProjectPda: string;
    readonly funderWalletAddress: string;
    readonly asset: "SOL" | "USDC";
    readonly amount: bigint;
    readonly funderTokenAccount?: string;
  }): Promise<FundingPreparation> {
    const ownerWallet = new PublicKey(input.ownerWalletAddress);
    const funderWallet = new PublicKey(input.funderWalletAddress);
    const addresses = await this.deriveProjectAddresses(ownerWallet, input.chainProjectId, input.storedProjectPda);

    if (!addresses.projectAccountInfo) {
      throw new Error("This project has not been activated on chain yet.");
    }

    const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash("confirmed");
    const instruction =
      input.asset === "SOL"
        ? this.buildDepositSolInstruction({
            funderWallet,
            protocolConfigPda: addresses.protocolConfigPda,
            treasuryPda: addresses.treasuryPda,
            projectPda: addresses.projectPda,
            amount: input.amount
          })
        : this.buildDepositUsdcInstruction({
            funderWallet,
            protocolConfigPda: addresses.protocolConfigPda,
            treasuryPda: addresses.treasuryPda,
            projectPda: addresses.projectPda,
            funderTokenAccount: new PublicKey(
              input.funderTokenAccount ??
                getAssociatedTokenAddressSync(this.usdcMint, funderWallet).toBase58()
            ),
            amount: input.amount
          });

    const message = new TransactionMessage({
      payerKey: funderWallet,
      recentBlockhash: blockhash,
      instructions: [instruction]
    }).compileToV0Message();

    const transaction = new VersionedTransaction(message);

    return {
      protocolConfigPda: addresses.protocolConfigPda.toBase58(),
      treasuryPda: addresses.treasuryPda.toBase58(),
      projectPda: addresses.projectPda.toBase58(),
      recentBlockhash: blockhash,
      lastValidBlockHeight,
      transactionBase64: Buffer.from(transaction.serialize()).toString("base64"),
      amount: input.amount.toString(),
      asset: input.asset,
      ...(input.asset === "USDC"
        ? {
            treasuryUsdcVault: getAssociatedTokenAddressSync(
              this.usdcMint,
              addresses.treasuryPda,
              true
            ).toBase58()
          }
        : {})
    };
  }

  async readProjectOnChain(input: {
    readonly ownerWalletAddress: string;
    readonly chainProjectId: bigint;
    readonly storedProjectPda: string;
  }): Promise<OnChainProjectSnapshot> {
    const ownerWallet = new PublicKey(input.ownerWalletAddress);
    const addresses = await this.deriveProjectAddresses(ownerWallet, input.chainProjectId, input.storedProjectPda);
    const treasuryUsdcVault = getAssociatedTokenAddressSync(this.usdcMint, addresses.treasuryPda, true);

    const [treasurySolBalance, treasuryUsdcBalance] = await Promise.all([
      this.connection.getBalance(addresses.treasuryPda, "confirmed").catch(() => 0),
      this.connection
        .getTokenAccountBalance(treasuryUsdcVault, "confirmed")
        .catch(() => undefined)
    ]);

    return {
      projectPda: addresses.projectPda.toBase58(),
      treasuryPda: addresses.treasuryPda.toBase58(),
      treasurySolBalance,
      projectAccountExists: addresses.projectAccountInfo !== null,
      projectAccountDataLength: addresses.projectAccountInfo?.data.length ?? 0,
      ...(addresses.projectAccountInfo
        ? {
            balances: toBalances(Buffer.from(addresses.projectAccountInfo.data))
          }
        : {}),
      ...(treasuryUsdcBalance
        ? {
            treasuryUsdcVault: {
              address: treasuryUsdcVault.toBase58(),
              amount: treasuryUsdcBalance.value.amount
            }
          }
        : {})
    };
  }

  async waitForConfirmedProjectActivation(input: {
    readonly ownerWalletAddress: string;
    readonly chainProjectId: bigint;
    readonly storedProjectPda: string;
    readonly signature: string;
  }): Promise<ProjectActivationVerification> {
    const confirmedAt = await this.waitForConfirmedSignature(input.signature);
    const onchain = await this.readProjectOnChain(input);

    if (!onchain.projectAccountExists) {
      throw new Error("The transaction was confirmed but the project account is still missing on chain.");
    }

    return {
      signature: input.signature,
      confirmedAt,
      explorerUrl: createExplorerUrl(`/tx/${input.signature}`, "devnet"),
      onchain
    };
  }

  async waitForConfirmedFunding(input: {
    readonly ownerWalletAddress: string;
    readonly chainProjectId: bigint;
    readonly storedProjectPda: string;
    readonly signature: string;
  }): Promise<Omit<FundingVerification, "fundingRequestId">> {
    const confirmedAt = await this.waitForConfirmedSignature(input.signature);
    const onchain = await this.readProjectOnChain(input);

    if (!onchain.projectAccountExists) {
      throw new Error("The funding transaction was confirmed but the project account is still missing on chain.");
    }

    return {
      signature: input.signature,
      confirmedAt,
      explorerUrl: createExplorerUrl(`/tx/${input.signature}`, "devnet"),
      onchain
    };
  }

  private async deriveProjectAddresses(
    ownerWallet: PublicKey,
    chainProjectId: bigint,
    storedProjectPda: string
  ) {
    const readiness = await this.getProtocolReadiness();
    if (!readiness.ready) {
      throw new ProtocolReadinessError(readiness);
    }

    const protocolConfigPda = PublicKey.findProgramAddressSync(
      [fyxvoProgramSeeds.protocolConfig],
      this.programId
    )[0];
    const treasuryPda = PublicKey.findProgramAddressSync(
      [fyxvoProgramSeeds.treasury],
      this.programId
    )[0];
    const projectPda = PublicKey.findProgramAddressSync(
      [fyxvoProgramSeeds.project, ownerWallet.toBuffer(), encodeU64(chainProjectId)],
      this.programId
    )[0];

    if (projectPda.toBase58() !== storedProjectPda) {
      throw new Error("Stored project PDA does not match the derived program address.");
    }

    const projectAccountInfo = await this.connection.getAccountInfo(projectPda, "confirmed");

    return {
      protocolConfigPda,
      treasuryPda,
      projectPda,
      projectAccountInfo
    };
  }

  private async waitForConfirmedSignature(signature: string): Promise<string> {
    const deadline = Date.now() + 90_000;

    while (Date.now() < deadline) {
      const result = await this.connection.getSignatureStatuses([signature], {
        searchTransactionHistory: true
      });
      const status = result.value[0];

      if (status?.err) {
        throw new Error(`Solana rejected the transaction: ${JSON.stringify(status.err)}`);
      }

      if (status?.confirmationStatus === "confirmed" || status?.confirmationStatus === "finalized") {
        return toIsoTimestamp();
      }

      await new Promise((resolve) => setTimeout(resolve, 1_500));
    }

    throw new Error("Timed out while waiting for Solana to confirm the transaction.");
  }

  private buildDepositSolInstruction(input: {
    readonly funderWallet: PublicKey;
    readonly protocolConfigPda: PublicKey;
    readonly treasuryPda: PublicKey;
    readonly projectPda: PublicKey;
    readonly amount: bigint;
  }) {
    return new TransactionInstruction({
      programId: this.programId,
      keys: [
        { pubkey: input.funderWallet, isSigner: true, isWritable: true },
        { pubkey: input.protocolConfigPda, isSigner: false, isWritable: false },
        { pubkey: input.treasuryPda, isSigner: false, isWritable: true },
        { pubkey: input.projectPda, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
      ],
      data: Buffer.concat([
        anchorInstructionDiscriminator("deposit_sol"),
        encodeU64(input.amount)
      ])
    });
  }

  private buildDepositUsdcInstruction(input: {
    readonly funderWallet: PublicKey;
    readonly protocolConfigPda: PublicKey;
    readonly treasuryPda: PublicKey;
    readonly projectPda: PublicKey;
    readonly funderTokenAccount: PublicKey;
    readonly amount: bigint;
  }) {
    return new TransactionInstruction({
      programId: this.programId,
      keys: [
        { pubkey: input.funderWallet, isSigner: true, isWritable: true },
        { pubkey: input.protocolConfigPda, isSigner: false, isWritable: false },
        { pubkey: input.treasuryPda, isSigner: false, isWritable: true },
        { pubkey: input.projectPda, isSigner: false, isWritable: true },
        { pubkey: this.usdcMint, isSigner: false, isWritable: false },
        { pubkey: input.funderTokenAccount, isSigner: false, isWritable: true },
        {
          pubkey: getAssociatedTokenAddressSync(this.usdcMint, input.treasuryPda, true),
          isSigner: false,
          isWritable: true
        },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false }
      ],
      data: Buffer.concat([
        anchorInstructionDiscriminator("deposit_usdc"),
        encodeU64(input.amount)
      ])
    });
  }
}
