/** Stripe currency for all Veriium charges (USD). */
export const STRIPE_CURRENCY = "usd" as const;

/** $35 diagnostic fee on quote decline (§7.3). */
export const DIAGNOSTIC_FEE_CENTS = 3500;

/** $50 cancellation / no-show fee (§7.3). */
export const CANCELLATION_FEE_CENTS = 5000;

/** Diagnostic decline payout split (§7.3). */
export const DIAGNOSTIC_MECHANIC_PAYOUT = 25;
export const DIAGNOSTIC_PLATFORM_FEE = 10;

/** Cancel / no-show payout split (§7.3). */
export const CANCELLATION_MECHANIC_PAYOUT = 30;
export const CANCELLATION_PLATFORM_FEE = 20;
