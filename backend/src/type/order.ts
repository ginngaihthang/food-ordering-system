export interface OrderWithItems {
  id: number;
  tableSessionId: number | null;
  orderType: 'DINE_IN' | 'TAKEAWAY';
  status: string;
  pickupNumber: number | null;
  createdAt: string;
  updatedAt: string;
  OrderItems: {
    id: number;
    quantity: number;
    unitPrice: string;
    subtotal: string;
    Product?: { id: number; name: string; imageUrl: string | null };
  }[];
}