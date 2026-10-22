export const MAX_ITEMS_PER_ORDER = 30;
export const MAX_QUANTITY_PER_ITEM = 20;

type ParsedItems = { ok: true; quantities: Map<number, number> } | { ok: false; message: string };

// product id -> quantity (the same product listed twice is merged)
export function parseOrderItems(raw: unknown): ParsedItems {
  if (!Array.isArray(raw) || raw.length === 0) {
    return { ok: false, message: 'Order must contain at least one item' };
  }
  if (raw.length > MAX_ITEMS_PER_ORDER) {
    return { ok: false, message: `An order can have at most ${MAX_ITEMS_PER_ORDER} items` };
  }

  const quantities = new Map<number, number>();
  for (const entry of raw as unknown[]) {
    const item = (entry ?? {}) as { productId?: unknown; quantity?: unknown };
    const productId = Number(item.productId);
    const quantity = Number(item.quantity);

    if (!Number.isInteger(productId) || productId <= 0) {
      return { ok: false, message: 'Invalid product in order' };
    }
    if (!Number.isInteger(quantity) || quantity < 1) {
      return { ok: false, message: 'Invalid quantity in order' };
    }
    quantities.set(productId, (quantities.get(productId) ?? 0) + quantity);
  }

  for (const quantity of quantities.values()) {
    if (quantity > MAX_QUANTITY_PER_ITEM) {
      return { ok: false, message: `You can order at most ${MAX_QUANTITY_PER_ITEM} of one item` };
    }
  }
  return { ok: true, quantities };
}