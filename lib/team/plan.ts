export type Plan = "free" | "pro";

// ADR 0007 (gate de plano): the team-size limit is the first monetization gate.
// Free = 1 active professional; Pro = 3. A plan not in this map (unexpected at
// runtime) falls back to the most restrictive, Free.
export const PROFESSIONAL_LIMITS: Record<Plan, number> = {
  free: 1,
  pro: 3,
};

export const PLAN_LABEL: Record<Plan, string> = {
  free: "Free",
  pro: "Pro",
};

export function getProfessionalLimit(plan: Plan): number {
  return PROFESSIONAL_LIMITS[plan] ?? PROFESSIONAL_LIMITS.free;
}

// Server-side gate: whether the business may have one more ACTIVE professional
// given its current active headcount. Both creating a professional and
// reactivating a deactivated one add an active seat, so both funnel through
// this rule. The count passed in must be the count of already-active
// professionals (the new seat is not yet counted).
export function canAddProfessional(currentActiveCount: number, plan: Plan): boolean {
  return currentActiveCount < getProfessionalLimit(plan);
}

// ADR 0007 (seam para Stripe): self-serve upgrade is a SERVER concern gated by
// environment. Only dev and preview expose "Assinar Pro"; production has NO
// self-serve upgrade — the plan is set manually in the DB. The env inputs are
// injectable so the rule is unit-testable without mocking `process.env`.
//
// Production is the default-safe resolution: VERCEL_ENV === "production", or a
// non-Vercel build where VERCEL_ENV is unset but NODE_ENV is "production". Only
// an explicit preview sign (VERCEL_ENV="preview") or a development NODE_ENV
// keeps self-serve enabled.
//
// The future Stripe seam lives exactly here: instead of flipping this flag 1→0
// by hand for a real upgrade, `setPlan` (lib/team/actions.ts) will be routed
// through a Stripe checkout session. Nothing below it changes.
export function isSelfServeUpgradeEnabled(
  env: { nodeEnv?: string; vercelEnv?: string } = {
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV,
  },
): boolean {
  const isProduction =
    env.vercelEnv === "production" ||
    (env.vercelEnv === undefined && env.nodeEnv === "production");
  return !isProduction;
}
