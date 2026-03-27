import process from "node:process";
import {
  FYXVO_DEVNET_ADMIN_AUTHORITY,
  FYXVO_DEVNET_USDC_MINT_ADDRESS,
  deriveFyxvoProtocolAddresses,
} from "@fyxvo/config";
import { Keypair } from "@solana/web3.js";

function getArg(name: string) {
  const prefix = `--${name}=`;
  const entry = process.argv.find((value) => value.startsWith(prefix));
  return entry ? entry.slice(prefix.length) : undefined;
}

function readValue(name: string, fallback?: string) {
  return getArg(name) ?? process.env[name] ?? fallback ?? null;
}

const cluster = readValue("SOLANA_CLUSTER", "devnet") ?? "devnet";
const currentProgramId = readValue("CURRENT_FYXVO_PROGRAM_ID", process.env.FYXVO_PROGRAM_ID ?? null);
const targetProgramId = readValue("TARGET_FYXVO_PROGRAM_ID", null);
const protocolAuthority = readValue("TARGET_FYXVO_PROTOCOL_AUTHORITY", FYXVO_DEVNET_ADMIN_AUTHORITY)!;
const pauseAuthority = readValue("TARGET_FYXVO_PAUSE_AUTHORITY", protocolAuthority)!;
const upgradeAuthority =
  readValue("TARGET_FYXVO_UPGRADE_AUTHORITY", process.env.FYXVO_UPGRADE_AUTHORITY_HINT ?? null) ??
  Keypair.generate().publicKey.toBase58();
const usdcMint = readValue("TARGET_USDC_MINT_ADDRESS", FYXVO_DEVNET_USDC_MINT_ADDRESS)!;

const derived =
  targetProgramId == null
    ? null
    : deriveFyxvoProtocolAddresses({
        programId: targetProgramId,
        usdcMintAddress: usdcMint,
      });

const nextCommands = [
  "solana-keygen new -o ~/.config/solana/fyxvo-governed-upgrade-authority.json",
  "solana-keygen new -o ~/.config/solana/fyxvo-governed-program-keypair.json",
  "export ANCHOR_WALLET=~/.config/solana/fyxvo-governed-upgrade-authority.json",
  "export FYXVO_PROGRAM_KEYPAIR_PATH=~/.config/solana/fyxvo-governed-program-keypair.json",
  "pnpm solana:program:build",
  "pnpm solana:program:deploy:devnet --generate-program-id",
  "FYXVO_ADMIN_AUTHORITY=<protocol-authority> pnpm solana:protocol:init",
  "pnpm solana:protocol:verify",
  "pnpm solana:flow:devnet-live",
];

const runtimeEnv = {
  FYXVO_PROGRAM_ID: targetProgramId ?? "<set after deploy>",
  FYXVO_ADMIN_AUTHORITY: protocolAuthority,
  FYXVO_AUTHORITY_MODE: "governed",
  FYXVO_PROTOCOL_AUTHORITY: protocolAuthority,
  FYXVO_PAUSE_AUTHORITY: pauseAuthority,
  FYXVO_UPGRADE_AUTHORITY_HINT: upgradeAuthority,
};

process.stdout.write(
  JSON.stringify(
    {
      currentDeployment: {
        cluster,
        currentProgramId,
        currentAdminAuthority: FYXVO_DEVNET_ADMIN_AUTHORITY,
      },
      recommendation: {
        summary:
          "Deploy a fresh devnet program under a controlled upgrade-authority key. Keep the existing admin signer as protocol authority for continuity unless you already have a governed multisig ready.",
        targetProgramId: targetProgramId ?? null,
        protocolAuthority,
        pauseAuthority,
        upgradeAuthority,
        usdcMint,
        derivedAddresses: derived
          ? {
              programId: derived.programId.toBase58(),
              protocolConfig: derived.protocolConfig.toBase58(),
              treasury: derived.treasury.toBase58(),
              operatorRegistry: derived.operatorRegistry.toBase58(),
              treasuryUsdcVault: derived.treasuryUsdcVault?.toBase58() ?? null,
            }
          : null,
      },
      hostedEnvTemplate: {
        api: runtimeEnv,
        gateway: runtimeEnv,
        worker: runtimeEnv,
      },
      rolloutCommands: nextCommands,
      cutoverChecklist: [
        "Stage API, gateway, and worker against the new program ID first.",
        "Verify protocol readiness, funding, gateway billing, analytics, and assistant flows on the new program.",
        "Upload canonical security metadata and IDL with the new upgrade-authority key.",
        "Only cut hosted traffic after the staged devnet flow is green and commit lineage is aligned.",
      ],
    },
    null,
    2
  ) + "\n"
);
