// Stripe is temporarily disabled.
// To re-enable: restore the Stripe SDK import and set STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET in Replit Secrets.

export const stripe = null as any;

export function stripeEnabled(): boolean {
  return false;
}

export const PLAN_SLUG_TO_ENUM: Record<string, string> = {
  starter: "STARTER",
  professional: "PROFESSIONAL",
  agency: "AGENCY",
  enterprise: "ENTERPRISE",
};
