import { useState } from 'react';
import { Check, Circle, Printer } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { paySession } from '@/api/payment';
import { markOrderServed } from '@/api/orders';
import { useSettings } from '@/context/SettingsContext';
import { getErrorMessage } from '@/lib/error';
import type { RestaurantTable, SessionOrder, TableSessionResult } from '@/types/table';
// import type { SessionOrder, TableSessionResult } from '@/type/Table';

const ORDER_STATUS: Record<string, { label: string; className: string }> = {
  PENDING: { label: 'RECEIVED', className: 'bg-amber-100 text-amber-800' },
  PREPARING: { label: 'PREPARING', className: 'bg-blue-100 text-blue-800' },
  READY: { label: 'READY', className: 'bg-emerald-100 text-emerald-800' },
  COMPLETED: { label: 'SERVED', className: 'bg-muted text-muted-foreground' },
  CANCELLED: { label: 'CANCELLED', className: 'bg-red-100 text-red-800' },
};
const FALLBACK_STATUS = { label: 'RECEIVED', className: 'bg-amber-100 text-amber-800' };

// Quick buttons offer the first two notes that cover the bill. Edit these for your currency.
const NOTES = [5, 10, 20, 50, 100];

const toCents = (value: number | string) => Math.round(Number(value) * 100);

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function minutesOpen(startedAt: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 60000));
}

function ChecklistItem({ done, label }: { done: boolean; label: string }) {
  return (
    <li className={`flex items-center gap-2 ${done ? 'text-emerald-700' : 'text-muted-foreground'}`}>
      {done ? <Check className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
      {label}
    </li>
  );
}

interface SessionBillDialogProps {
  open: boolean;
  table: RestaurantTable | null;
  sessionData: TableSessionResult | null;
  onOpenChange: (open: boolean) => void;
  onCloseSession: () => void;
  onRefresh: () => void;
}

export function SessionBillDialog({
  open,
  table,
  sessionData,
  onOpenChange,
  onCloseSession,
  onRefresh,
}: SessionBillDialogProps) {
  const { settings, money } = useSettings();
  const [amount, setAmount] = useState('');
  const [paying, setPaying] = useState(false);
  const [servingId, setServingId] = useState<number | null>(null);
  const [error, setError] = useState('');

  // Start fresh whenever the dialog opens or switches table
  const resetKey = `${open}-${table?.id ?? ''}`;
  const [prevResetKey, setPrevResetKey] = useState(resetKey);
    if (prevResetKey !== resetKey) {
    setPrevResetKey(resetKey);
    setAmount('');
    setError('');
  }

  const orders = sessionData?.orders ?? [];
  const billable = orders.filter((o) => o.status !== 'CANCELLED');
  const unserved = billable.filter((o) => o.status !== 'COMPLETED').length;
  const isPaid = sessionData?.paymentStatus === 'PAID';
  const nothingToPay = billable.length === 0;
  const canClose = (isPaid || nothingToPay) && unserved === 0;

  const total = sessionData?.total ?? 0;
  const totalCents = toCents(total);
  const receivedCents = amount !== '' && Number.isFinite(Number(amount)) ? toCents(amount) : null;
  const enough = receivedCents !== null && receivedCents >= totalCents && totalCents > 0;
  const changeCents = receivedCents !== null ? Math.max(0, receivedCents - totalCents) : 0;
  const quickNotes = NOTES.filter((note) => note * 100 >= totalCents).slice(0, 2);

  const orderSubtotal = (order: SessionOrder) =>
    order.OrderItems.reduce((sum, item) => sum + Number(item.subtotal), 0);

  function handleAmountChange(value: string) {
    if (/^\d{0,6}(\.\d{0,2})?$/.test(value)) setAmount(value);
  }

  async function handleConfirmPayment() {
    if (!table || receivedCents === null || !enough) return;

    setPaying(true);
    setError('');
    try {
      await paySession(table.id, receivedCents / 100);
      onRefresh();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to record payment'));
    } finally {
      setPaying(false);
    }
  }

  async function handleMarkServed(orderId: number) {
    setServingId(orderId);
    setError('');
    try {
      await markOrderServed(orderId);
      onRefresh();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to mark the order as served'));
    } finally {
      setServingId(null);
    }
  }

  function handlePrint() {
    if (table) window.open(`/admin/receipt/${table.id}`, '_blank');
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 p-0 sm:max-w-lg">
        {/* Header (fixed) */}
        <DialogHeader className="shrink-0 space-y-2 p-6 pb-3">
          <DialogTitle className="text-2xl font-bold">
            Table {table?.tableNumber} · Session bill
          </DialogTitle>
          <div className="flex items-center gap-3">
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold tracking-wide ${
                isPaid
                  ? 'bg-emerald-100 text-emerald-800'
                  : nothingToPay
                    ? 'bg-muted text-muted-foreground'
                    : 'bg-amber-100 text-amber-800'
              }`}
            >
              {isPaid ? 'PAID' : nothingToPay ? 'NO CHARGE' : 'UNPAID'}
            </span>
            <DialogDescription>
              {sessionData?.session ? `Open ${minutesOpen(sessionData.session.startedAt)} min · ` : ''}
              {billable.length} {billable.length === 1 ? 'order' : 'orders'}
            </DialogDescription>
          </div>
        </DialogHeader>

        {/* Orders, total and payment (scrolls) */}
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-6 pb-4">
          {orders.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">No orders yet in this session.</p>
          ) : (
            orders.map((order) => {
              const status = ORDER_STATUS[order.status] ?? FALLBACK_STATUS;
              const cancelled = order.status === 'CANCELLED';

              return (
                <div key={order.id} className="rounded-2xl border p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-baseline gap-2">
                      <span
                        className={`font-bold ${cancelled ? 'text-muted-foreground line-through' : ''}`}
                      >
                        Order #{order.id}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {formatTime(order.createdAt)}
                      </span>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold tracking-wide ${status.className}`}
                    >
                      {status.label}
                    </span>
                  </div>

                  <div
                    className={`mt-2 space-y-1 ${cancelled ? 'text-muted-foreground line-through' : ''}`}
                  >
                    {order.OrderItems.map((item) => (
                      <div key={item.id} className="flex justify-between gap-3">
                        <span>
                          {item.quantity}× {item.Product?.name}
                        </span>
                        <span className="shrink-0">{money(item.subtotal)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-dashed pt-3 text-sm text-muted-foreground">
                    <span className={cancelled ? 'line-through' : ''}>
                      Order subtotal {money(orderSubtotal(order))}
                    </span>
                    {cancelled ? (
                      <span>Not charged</span>
                    ) : order.status === 'READY' ? (
                      <button
                        type="button"
                        disabled={servingId === order.id}
                        onClick={() => handleMarkServed(order.id)}
                        className="font-medium text-foreground underline underline-offset-2 disabled:opacity-50"
                      >
                        {servingId === order.id ? 'Saving...' : 'Mark served'}
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })
          )}

          <div className="flex items-baseline justify-between pt-2">
            <span className="text-muted-foreground">Total</span>
            <span className="text-4xl font-black tracking-tight">{money(total)}</span>
          </div>

          <div className="border-t pt-4">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Payment
            </p>

            {nothingToPay ? (
              <p className="mt-2 text-sm text-muted-foreground">
                There is nothing to pay on this table.
              </p>
            ) : isPaid ? (
              <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-emerald-50 p-4 text-emerald-800">
                <div>
                  <p className="flex items-center gap-1.5 text-lg font-bold">
                    <Check className="h-5 w-5" />
                    Paid by Cash
                  </p>
                  {sessionData && sessionData.cashReceived !== null && (
                    <p className="text-sm">
                      Received {money(sessionData.cashReceived)} · Change{' '}
                      {money(Math.max(0, (toCents(sessionData.cashReceived) - totalCents) / 100))}
                    </p>
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="shrink-0 gap-2 bg-white"
                  onClick={handlePrint}
                >
                  <Printer className="h-4 w-4" />
                  Print receipt
                </Button>
              </div>
            ) : (
              <div className="mt-3 space-y-3">
                <p className="text-sm text-muted-foreground">Cash at the counter</p>

                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    inputMode="decimal"
                    autoComplete="off"
                    placeholder="Amount received"
                    value={amount}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    className="h-12 min-w-[9rem] flex-1 rounded-xl text-lg"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-full"
                    onClick={() => setAmount((totalCents / 100).toFixed(2))}
                  >
                    Exact
                  </Button>
                  {quickNotes.map((note) => (
                    <Button
                      key={note}
                      type="button"
                      variant="outline"
                      className="rounded-full"
                      onClick={() => setAmount(String(note))}
                    >
                      {settings.currencySymbol}
                      {note}
                    </Button>
                  ))}
                </div>

                {receivedCents !== null && receivedCents >= totalCents ? (
                  <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-3 font-bold text-emerald-800">
                    <span>Change to give</span>
                    <span>{money(changeCents / 100)}</span>
                  </div>
                ) : receivedCents !== null && receivedCents > 0 ? (
                  <div className="flex items-center justify-between rounded-xl bg-amber-50 px-4 py-3 font-bold text-amber-800">
                    <span>Still needed</span>
                    <span>{money((totalCents - receivedCents) / 100)}</span>
                  </div>
                ) : null}

                <Button
                  type="button"
                  className="h-14 w-full rounded-2xl text-base font-bold"
                  disabled={!enough || paying}
                  onClick={handleConfirmPayment}
                >
                  {paying ? 'Saving payment...' : `Confirm payment · ${money(total)}`}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Checklist and buttons (fixed) */}
        <div className="shrink-0 space-y-3 border-t p-6">
          <ul className="space-y-1 text-sm">
            <ChecklistItem
              done={isPaid || nothingToPay}
              label={nothingToPay ? 'Nothing to pay' : 'Payment received'}
            />
            <ChecklistItem
              done={unserved === 0}
              label={
                unserved === 0
                  ? 'All orders served'
                  : `${unserved} order${unserved === 1 ? '' : 's'} not served yet`
              }
            />
          </ul>

          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="h-12 flex-1 gap-2 rounded-2xl"
              onClick={handlePrint}
            >
              <Printer className="h-4 w-4" />
              Print bill
            </Button>
            <Button
              type="button"
              className="h-12 flex-1 rounded-2xl"
              disabled={!canClose}
              onClick={onCloseSession}
            >
              Close session
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}