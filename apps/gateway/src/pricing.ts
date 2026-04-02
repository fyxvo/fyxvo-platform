import { COMPUTE_HEAVY_METHODS, WRITE_METHODS } from "@fyxvo/config";
import type { GatewayEnv } from "@fyxvo/config";
import type { FundingDecision, JsonRpcPayload, JsonRpcRequest, PricingDecision, ProjectFundingState, ProjectSpendState, RoutingMode } from "./types.js";

type MethodTier = "standard" | "compute_heavy" | "write";

function classifyMethod(method: string): MethodTier {
  if (COMPUTE_HEAVY_METHODS.has(method)) return "compute_heavy";
  if (WRITE_METHODS.has(method)) return "write";
  return "standard";
}

function methodPrice(method: string, mode: RoutingMode, env: GatewayEnv): bigint {
  // Priority relay always charges priority rate regardless of method
  if (mode === "priority") {
    return BigInt(env.GATEWAY_PRIORITY_PRICE_LAMPORTS);
  }

  const tier = classifyMethod(method);
  switch (tier) {
    case "compute_heavy":
      return BigInt(env.GATEWAY_COMPUTE_HEAVY_PRICE_LAMPORTS);
    case "write":
      // Write methods use standard base × write multiplier
      return BigInt(env.GATEWAY_STANDARD_PRICE_LAMPORTS) * BigInt(env.GATEWAY_WRITE_METHOD_MULTIPLIER);
    default:
      return BigInt(env.GATEWAY_STANDARD_PRICE_LAMPORTS);
  }
}

function normalizePayload(payload: JsonRpcPayload): readonly JsonRpcRequest[] {
  return Array.isArray(payload) ? payload : [payload as JsonRpcRequest];
}

export function calculateRequestPrice(
  payload: JsonRpcPayload,
  mode: RoutingMode,
  env: GatewayEnv
): PricingDecision {
  const requests = normalizePayload(payload);
  const basePrice =
    mode === "priority"
      ? BigInt(env.GATEWAY_PRIORITY_PRICE_LAMPORTS)
      : BigInt(env.GATEWAY_STANDARD_PRICE_LAMPORTS);

  const totalPrice = requests.reduce(
    (total, request) => total + methodPrice(request.method, mode, env),
    0n
  );

  return {
    methods: requests.map((request) => request.method),
    requestCount: requests.length,
    basePrice,
    totalPrice
  };
}

export function chooseFundingAsset(input: {
  readonly funding: ProjectFundingState;
  readonly spend: ProjectSpendState;
  readonly requiredCredits: bigint;
  readonly minimumReserve: bigint;
}): FundingDecision | null {
  return chooseFundingAssetByAsset({
    funding: input.funding,
    spend: input.spend,
    requiredSolCredits: input.requiredCredits,
    requiredUsdcCredits: input.requiredCredits,
    minimumReserve: input.minimumReserve
  });
}

export function chooseFundingAssetByAsset(input: {
  readonly funding: ProjectFundingState;
  readonly spend: ProjectSpendState;
  readonly requiredSolCredits: bigint;
  readonly requiredUsdcCredits: bigint;
  readonly minimumReserve: bigint;
}): FundingDecision | null {
  const availableSol = input.funding.availableSolCredits - input.spend.sol;
  if (availableSol >= input.requiredSolCredits + input.minimumReserve) {
    return {
      asset: "SOL",
      remainingCredits: availableSol - input.requiredSolCredits
    };
  }

  const availableUsdc = input.funding.availableUsdcCredits - input.spend.usdc;
  if (availableUsdc >= input.requiredUsdcCredits + input.minimumReserve) {
    return {
      asset: "USDC",
      remainingCredits: availableUsdc - input.requiredUsdcCredits
    };
  }

  return null;
}
