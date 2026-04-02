export const subscriptionPlans = [
  "starter",
  "builder",
  "scale",
  "growth",
  "business",
  "network",
  "payperrequest"
] as const;

export const subscriptionStatuses = ["active", "paused", "cancelled", "overdue"] as const;

export type SubscriptionPlan = (typeof subscriptionPlans)[number];
export type SubscriptionStatus = (typeof subscriptionStatuses)[number];

export interface SubscriptionPlanConfig {
  readonly plan: SubscriptionPlan;
  readonly priceUsdcBaseUnits: bigint;
  readonly requestsIncluded: bigint;
  readonly priorityRequestsIncluded: bigint;
}

export const subscriptionPlanConfig: Record<SubscriptionPlan, SubscriptionPlanConfig> = {
  starter: {
    plan: "starter",
    priceUsdcBaseUnits: 29_000_000n,
    requestsIncluded: 2_000_000n,
    priorityRequestsIncluded: 100_000n
  },
  builder: {
    plan: "builder",
    priceUsdcBaseUnits: 99_000_000n,
    requestsIncluded: 10_000_000n,
    priorityRequestsIncluded: 500_000n
  },
  scale: {
    plan: "scale",
    priceUsdcBaseUnits: 299_000_000n,
    requestsIncluded: 50_000_000n,
    priorityRequestsIncluded: 2_000_000n
  },
  growth: {
    plan: "growth",
    priceUsdcBaseUnits: 999_000_000n,
    requestsIncluded: 200_000_000n,
    priorityRequestsIncluded: 10_000_000n
  },
  business: {
    plan: "business",
    priceUsdcBaseUnits: 2_999_000_000n,
    requestsIncluded: 1_000_000_000n,
    priorityRequestsIncluded: 50_000_000n
  },
  network: {
    plan: "network",
    priceUsdcBaseUnits: 9_999_000_000n,
    requestsIncluded: 9_223_372_036_854_775_807n,
    priorityRequestsIncluded: 9_223_372_036_854_775_807n
  },
  payperrequest: {
    plan: "payperrequest",
    priceUsdcBaseUnits: 0n,
    requestsIncluded: 0n,
    priorityRequestsIncluded: 0n
  }
} as const;

export const subscriptionOveragePricing = {
  standardLamports: 50_000n,
  priorityLamports: 200_000n,
  // USDC uses 6 decimal places, so 0.5 USDC = 500_000 base units.
  standardUsdcBaseUnits: 500_000n,
  priorityUsdcBaseUnits: 2_000_000n
} as const;

export function getSubscriptionPlanConfig(plan: SubscriptionPlan): SubscriptionPlanConfig {
  return subscriptionPlanConfig[plan];
}
