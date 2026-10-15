import { QuoteLine } from "../data/types";
export function calculateLineNet(
  quantity: number,
  unitPriceCents: number | null,
  discountBps: number,
) {
  const grossCents = quantity * (unitPriceCents ?? 0);
  const discountCents = Math.round((grossCents * discountBps) / 10000);
  return { grossCents, discountCents, netCents: grossCents - discountCents };
}
export function calculateQuoteTotals(
  lines: QuoteLine[],
  freightCents = 0,
  limit = 500,
) {
  const sum = lines.reduce(
    (a, l) => {
      const x = calculateLineNet(l.quantity, l.unitPriceCents, l.discountBps);
      return {
        gross: a.gross + x.grossCents,
        discount: a.discount + x.discountCents,
        net: a.net + x.netCents,
      };
    },
    { gross: 0, discount: 0, net: 0 },
  );
  return {
    totalGrossCents: sum.gross,
    totalDiscountCents: sum.discount,
    totalNetCents: sum.net,
    totalCents: sum.net + freightCents,
    hasPricePending: lines.some((l) => l.unitPriceCents == null),
    requiresApprovalByDiscount: lines.some((l) => l.discountBps > limit),
  };
}
