export interface CancellableOrder {
  id: number;
  status: string;
  orderType: 'DINE_IN' | 'TAKEAWAY';
  pickupNumber: number | null;
  paymentStatus?: 'UNPAID' | 'PAID';
  paymentMethod?: 'CASH' | 'ONLINE' | null;
  TableSession?: {
    paymentStatus?: 'UNPAID' | 'PAID';
    RestaurantTable?: { tableNumber: number } | null;
  } | null;
}

export function isOnlinePaidTakeaway(order: CancellableOrder): boolean {
  return (
    order.orderType === 'TAKEAWAY' &&
    order.paymentStatus === 'PAID' &&
    order.paymentMethod === 'ONLINE'
  );
}

// Orders paid online can be cancelled because the customer is refunded automatically
export function canCancelOrder(order: CancellableOrder): boolean {
  if (order.status === 'CANCELLED' || order.status === 'COMPLETED') return false;
  return !isOrderPaid(order) || isOnlinePaidTakeaway(order);
}

// An order counts as paid if it was paid directly (takeaway) or its table session was paid (dine-in)
export function isOrderPaid(order: CancellableOrder): boolean {
  return order.paymentStatus === 'PAID' || order.TableSession?.paymentStatus === 'PAID';
}



export function getOrderLabel(order: CancellableOrder): string {
  const tableNumber = order.TableSession?.RestaurantTable?.tableNumber;
  const place =
    order.orderType === 'DINE_IN'
      ? tableNumber
        ? `Table ${tableNumber}`
        : 'Dine-in'
      : order.pickupNumber
        ? `Pickup ${order.pickupNumber}`
        : 'Takeaway';

  return `Order #${order.id} · ${place}`;
}