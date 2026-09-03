export type Plan = "free" | "pro";

// ADR 0007 (gate de plano): the team-size limit is the first monetization gate.
// Free = 1 active professional; Pro = 3. A plan not in this map (unexpected at
// runtime) falls back to the most restrictive, Free.
export const PROFESSIONAL_LIMITS: Record<Plan, number> = {
  free: 1,
  pro: 3,
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
