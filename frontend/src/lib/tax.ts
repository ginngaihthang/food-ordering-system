// How much of a tax-inclusive total is tax (same formula the server uses)
export function taxIncluded(total: number, ratePercent: number): number {
  if (!(ratePercent > 0)) return 0;
  return Math.round(((total * ratePercent) / (100 + ratePercent) + Number.EPSILON) * 100) / 100;
}