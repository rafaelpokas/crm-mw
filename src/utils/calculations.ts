import { QuoteLine } from '../data/types';

export function calculateLineNet(quantity: number, unitPriceCents: number, discountBps: number) {
  const grossCents = quantity * unitPriceCents;
  // Arredondar meio para cima: Math.round((grossCents * discountBps) / 10000)
  const discountCents = Math.round((grossCents * discountBps) / 10000);
  const netCents = grossCents - discountCents;
  return {
    grossCents,
    discountCents,
    netCents
  };
}

export function calculateQuoteTotals(lines: QuoteLine[], freightCents: number = 0) {
  let totalGrossCents = 0;
  let totalDiscountCents = 0;
  let totalNetCents = 0;
  let hasPricePending = false;
  let requiresApprovalByDiscount = false;

  for (const line of lines) {
    if (line.unitPriceCents === null || line.unitPriceCents === undefined) {
      hasPricePending = true;
    } else {
      totalGrossCents += line.grossCents;
      totalDiscountCents += line.discountCents;
      totalNetCents += line.netCents;
      if (line.discountBps > 500) {
        requiresApprovalByDiscount = true;
      }
    }
  }

  const finalTotalCents = totalNetCents + (freightCents || 0);

  return {
    totalGrossCents,
    totalDiscountCents,
    totalNetCents,
    totalCents: finalTotalCents,
    hasPricePending,
    requiresApprovalByDiscount
  };
}
