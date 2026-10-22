import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  fetchSessionReceipt,
  fetchOrderReceipt,
  type PaymentMethod,
  type ReceiptOrderItem,
  type ReceiptTax,
} from '@/api/payment';
import { useSettings } from '@/context/SettingsContext';

interface ReceiptView {
  info: { label: string; value: string }[];
  items: ReceiptOrderItem[];
  total: number;
  tax: ReceiptTax;
  paymentStatus: 'UNPAID' | 'PAID';
  paymentMethod: PaymentMethod | null;
  paidAt: string | null;
  cashReceived: number | null;
}

export default function Receipt() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const isOrder = searchParams.get('type') === 'order';
  const { settings, loading: settingsLoading, money } = useSettings();
  const receiptId = Number(id);
  const validId = Number.isInteger(receiptId) && receiptId > 0;
  const [view, setView] = useState<ReceiptView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!validId) return;

    let cancelled = false;

    async function load() {
      try {
        if (isOrder) {
          const data = await fetchOrderReceipt(receiptId);
          if (cancelled) return;
          setView({
            info: [
              { label: 'Order #', value: String(data.orderId) },
              ...(data.pickupNumber
                ? [{ label: 'Pickup #', value: String(data.pickupNumber) }]
                : []),
              { label: 'Type', value: 'Takeaway' },
              { label: 'Date', value: new Date(data.createdAt).toLocaleString() },
            ],
            items: data.items,
            total: data.total,
            tax: data.tax,
            paymentStatus: data.paymentStatus,
            paymentMethod: data.paymentMethod,
            paidAt: data.paidAt,
            cashReceived: data.cashReceived
          });
        } else {
          const data = await fetchSessionReceipt(receiptId);
          if (cancelled) return;
          setView({
            info: [
              { label: 'Table', value: String(data.tableNumber) },
              { label: 'Session #', value: String(data.sessionId) },
              { label: 'Date', value: new Date(data.startedAt).toLocaleString() },
            ],
            // Cancelled orders were never charged, so they don't appear on the receipt
            items: data.orders
              .filter((order) => order.status !== 'CANCELLED')
              .flatMap((order) => order.OrderItems),
            total: data.total,
            tax: data.tax,
            paymentStatus: data.paymentStatus,
            paymentMethod: data.paymentMethod,
            paidAt: data.paidAt,
            cashReceived: null
          });
        }
      } catch (err) {
        console.error('Failed to load receipt:', err);
        if (!cancelled) setError('Could not load this receipt');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();

    return () => {
      cancelled = true;
    };
  }, [receiptId, validId, isOrder]);

  // Open the print dialog once, after both the receipt and the settings are ready
  useEffect(() => {
    if (!view || settingsLoading) return;
    const timer = window.setTimeout(() => window.print(), 300);
    return () => window.clearTimeout(timer);
  }, [view, settingsLoading]);

  if (loading || settingsLoading) {
    return <div className="p-8 text-center">Loading receipt...</div>;
  }
  if (error || !view) {
    return <div className="p-8 text-center text-red-600">{error || 'Receipt not found'}</div>;
  }

  const { tax } = view;
  const taxName = `${settings.taxLabel}${tax.rate !== null ? ` ${tax.rate}%` : ''}`;
  const paymentText =
    view.paymentStatus === 'PAID'
      ? view.paymentMethod === 'ONLINE'
        ? 'Online'
        : 'Cash'
      : 'UNPAID';

  if (!validId) {
    return <div className="p-8 text-center text-red-600">Receipt not found</div>;
  }
  if (loading || settingsLoading) {
    return <div className="p-8 text-center">Loading receipt...</div>;
  }
  if (error || !view) {
    return <div className="p-8 text-center text-red-600">{error || 'Receipt not found'}</div>;
  }

  return (
    <div className="mx-auto max-w-sm p-6 font-mono text-sm print:p-0">
      <style>{`
        @media print {
          @page { size: 80mm auto; margin: 4mm; }
          body { -webkit-print-color-adjust: exact; }
        }
      `}</style>

      <div className="mb-4 space-y-1 text-center">
        <h1 className="text-lg font-bold">{settings.restaurantName}</h1>
        {settings.address && <p className="text-xs text-muted-foreground">{settings.address}</p>}
        {settings.phone && <p className="text-xs text-muted-foreground">Tel: {settings.phone}</p>}
        {settings.taxNumber && (
          <p className="text-xs text-muted-foreground">
            {settings.taxLabel} Reg. No: {settings.taxNumber}
          </p>
        )}
      </div>

      <div className="space-y-1 border-y border-dashed py-2">
        {view.info.map((row) => (
          <div key={row.label} className="flex justify-between gap-3">
            <span>{row.label}</span>
            <span className="text-right">{row.value}</span>
          </div>
        ))}
      </div>

      <div className="space-y-1 py-2">
        {view.items.map((item) => (
          <div key={item.id} className="flex justify-between gap-3">
            <span>
              {item.quantity}× {item.Product?.name}
            </span>
            <span className="shrink-0">{money(item.subtotal)}</span>
          </div>
        ))}
      </div>

      <div className="space-y-1 border-t border-dashed pt-2">
        <div className="flex justify-between text-base font-bold">
          <span>TOTAL</span>
          <span>{money(view.total)}</span>
        </div>

        {tax.amount > 0 && (
          <div className="space-y-0.5 text-xs text-muted-foreground">
            <div className="flex justify-between">
              <span>Amount excl. {settings.taxLabel}</span>
              <span>{money(tax.net)}</span>
            </div>
            <div className="flex justify-between">
              <span>{taxName} (included)</span>
              <span>{money(tax.amount)}</span>
            </div>
          </div>
        )}

        <div className="flex justify-between">
          <span>Payment</span>
          <span>{paymentText}</span>
        </div>
        {view.paidAt && (
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Paid at</span>
            <span>{new Date(view.paidAt).toLocaleString()}</span>
          </div>
        )}
        {view.cashReceived !== null && (
            <>
              <div className="flex justify-between">
                <span>Cash received</span>
                <span>{money(view.cashReceived)}</span>
              </div>
              <div className="flex justify-between">
                <span>Change</span>
                <span>{money(Math.round((view.cashReceived - view.total) * 100) / 100)}</span>
              </div>
            </>
          )}
      </div>

      {settings.receiptFooter && (
        <p className="mt-4 text-center text-xs text-muted-foreground">{settings.receiptFooter}</p>
      )}
    </div>
  );
}