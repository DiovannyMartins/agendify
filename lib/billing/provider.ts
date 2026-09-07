// The billing provider seam (ADR 0008). This interface is the contract that
// abstracts the payment provider; `lib/billing/mercado-pago.ts` is the concrete
// Mercado Pago implementation behind it. The rest of the billing module and the
// plan gate depend only on this interface, never on Mercado Pago, so swapping
// providers (or stubbing in tests) requires no change to callers.
import type { BillingPlan } from "./types";

export interface CreatePreapprovalInput {
  // The plan being subscribed to; the provider derives the price and the
  // subscription terms from it. Only the pro plan is currently offered.
  plan: BillingPlan;
  // A caller-owned identifier carried through to the provider (business id).
  externalReference: string;
  payerEmail?: string;
  // Where Mercado Pago sends the payer back after the flow (dashboard).
  backUrl: string;
}

export interface CreatePreapprovalResult {
  preapprovalId: string;
  initPoint: string;
}

export interface BillingProvider {
  // Creates a recurring preapproval (subscription) for the paid plan and returns
  // the checkout link (`init_point`) the user is redirected to.
  createPreapproval(input: CreatePreapprovalInput): Promise<CreatePreapprovalResult>;
}
