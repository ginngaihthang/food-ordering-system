export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

// How much of a tax-inclusive total is tax
export function taxIncluded(total: number, ratePercent: number): number {
  if (!(ratePercent > 0)) return 0;
  return roundMoney((total * ratePercent) / (100 + ratePercent));
}

interface TaxableOrder {
  status: string;
  taxRate?: number | string | null;
  OrderItems: { subtotal: number | string }[];
}

// Adds up a bill. Cancelled orders are never charged, so they're skipped here.
export function summarizeTax(orders: TaxableOrder[]) {
  let total = 0;
  let tax = 0;
  const rates = new Set<number>();

  for (const order of orders) {
    if (order.status === 'CANCELLED') continue;

    const orderTotal = order.OrderItems.reduce((sum, item) => sum + Number(item.subtotal), 0);
    const rate = Number(order.taxRate) || 0;

    total += orderTotal;
    tax += taxIncluded(orderTotal, rate);
    if (rate > 0) rates.add(rate);
  }

  const rateList = [...rates];
  return {
    total: roundMoney(total),
    tax: roundMoney(tax),
    net: roundMoney(total - tax),
    // null when the visit mixed different rates (the rate changed mid-visit)
    rate: rateList.length === 1 ? (rateList[0] ?? null) : null,
  };
}