/** Platform take on labor (quote amount) per §7.3. */
export const SERVICE_PLATFORM_FEE_RATE = 0.15;

export type ServicePayoutBreakdown = {
  finalPrice: number;
  mechanicPayout: number;
  platformFee: number;
};

function roundCurrency(amount: number): number {
  return Math.round(amount * 100) / 100;
}

/** Compute customer total and payout split from labor quote + parts (§7.3). */
export function computeServicePayout(
  quoteAmount: number,
  partsCost: number,
): ServicePayoutBreakdown {
  const platformFee = roundCurrency(quoteAmount * SERVICE_PLATFORM_FEE_RATE);
  const mechanicPayout = roundCurrency(quoteAmount - platformFee + partsCost);
  const finalPrice = roundCurrency(quoteAmount + partsCost);

  return { finalPrice, mechanicPayout, platformFee };
}
