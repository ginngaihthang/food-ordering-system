import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchOrderByToken, type OrderResult } from '@/api/orders';
import { useSettings } from '@/context/SettingsContext';
import { getSocket } from '@/lib/socket';
import { useCart } from '@/context/CartContext';
import { PaymentNotCompleted, PaymentPending } from '@/components/orders/PaymentPending';

const PROGRESS_STEPS = [
  { key: 'PENDING', label: 'Order received' },
  { key: 'PREPARING', label: 'Preparing your food' },
  { key: 'READY', label: 'Ready for pickup' },
  { key: 'COMPLETED', label: 'Completed' },
] as const;

/* ---------- UI-only (same look as Menu, Cart and SessionOrders) ---------- */

const BRAND = 'bg-gradient-to-br from-[#e8432d] to-[#ff8a3d]';
const CARD = 'rounded-3xl bg-card shadow-[0_8px_24px_rgba(140,70,20,0.12)]';

// The pickup banner changes colour with the order status
const HERO_THEME: Record<string, { bg: string; emoji: string }> = {
  PENDING: { bg: 'from-[#e8432d] via-[#ff8a3d] to-[#ffb627]', emoji: '🧾' },
  PREPARING: { bg: 'from-[#2b6cb0] via-[#3b82f6] to-[#60a5fa]', emoji: '🍳' },
  READY: { bg: 'from-[#0f8a5f] via-[#10b981] to-[#6ee7b7]', emoji: '🎉' },
  COMPLETED: { bg: 'from-[#57534e] via-[#78716c] to-[#a8a29e]', emoji: '😋' },
};

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export default function OrderStatus() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { settings, money } = useSettings();

  const [order, setOrder] = useState<OrderResult | null>(null);
  // Only loading when there is a token to load. Without one the page shows "Order not found".
  const [loading, setLoading] = useState(Boolean(token));
  const [showAllItems, setShowAllItems] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const { clearCart } = useCart();
  const [awaitingPayment, setAwaitingPayment] = useState(false);
  const [failedMessage, setFailedMessage] = useState('');

  // Coming back from Stripe after a successful payment: empty the cart once
  useEffect(() => {
    if (searchParams.get('paid') !== '1') return;
    clearCart();
    setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams, clearCart]);

  useEffect(() => {
    if (!token) return;

    const orderToken: string = token;
    let cancelled = false;

    // Resolves to true when there is nothing more to wait for, so polling can stop
    async function load(): Promise<boolean> {
      try {
        const result = await fetchOrderByToken(orderToken);
        if (cancelled) return true;

        if (result.state === 'ready') {
          setOrder(result.order);
          setAwaitingPayment(false);
          return true;
        }
        if (result.state === 'awaiting_payment') {
          setAwaitingPayment(true);
          return false;
        }

        setFailedMessage(result.message);
        setAwaitingPayment(false);
        return true;
      } catch (err) {
        console.error('Failed to load order:', err);
        return false;
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    // While the payment is being confirmed, check again every 3 seconds
    const poll = window.setInterval(() => {
      void load().then((done) => {
        if (done) window.clearInterval(poll);
      });
    }, 3000);
    void load();

    const socket = getSocket();

    function joinRoom() {
      socket.emit('join_order_room', { token: orderToken });
    }
    // Rooms are lost when the connection drops, so rejoin and catch up on every connect
    function handleConnect() {
      joinRoom();
      void load();
    }
    if (socket.connected) joinRoom();
    socket.on('connect', handleConnect);

    function handleStatusUpdate(updated: OrderResult) {
      if (updated.publicToken === orderToken) {
        setOrder((prev) => (prev ? { ...prev, ...updated } : updated));
        setAwaitingPayment(false);
        window.clearInterval(poll);
      }
    }
    socket.on('order_status_updated', handleStatusUpdate);

    return () => {
      cancelled = true;
      window.clearInterval(poll);
      socket.off('connect', handleConnect);
      socket.off('order_status_updated', handleStatusUpdate);
    };
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fff6e8] dark:bg-[#1b110c]">
        <div className="w-full max-w-md sm:max-w-2xl lg:max-w-5xl mx-auto p-4 sm:p-6 space-y-4 overflow-x-hidden">
          <Skeleton className="h-5 w-48 mx-auto" />
          <Skeleton className="h-52 sm:h-64 w-full rounded-3xl" />
          <Skeleton className="h-64 w-full rounded-3xl" />
          <Skeleton className="h-40 w-full rounded-3xl" />
        </div>
      </div>
    );
  }

  if (failedMessage) {
    return <PaymentNotCompleted message={failedMessage} onBack={() => navigate('/cart')} />;
  }
  if (awaitingPayment && !order) {
    return <PaymentPending />;
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-[#fff6e8] dark:bg-[#1b110c]">
        <div className="w-full max-w-md mx-auto p-8 pt-20 text-center space-y-4 overflow-x-hidden">
          <p className="text-6xl">🍽️</p>
          <p className="font-display text-xl sm:text-3xl font-bold">Order not found</p>
          <button
            onClick={() => navigate('/menu')}
            className={`h-11 sm:h-12 px-6 rounded-2xl ${BRAND} text-white text-sm sm:text-base font-bold shadow-[0_10px_22px_rgba(232,67,45,0.35)] transition active:scale-95`}
          >
            Back to menu
          </button>
        </div>
      </div>
    );
  }

  const total = order.OrderItems.reduce((sum, item) => sum + Number(item.subtotal), 0);
  const currentStepIndex = PROGRESS_STEPS.findIndex((s) => s.key === order.status);
  const isCancelled = order.status === 'CANCELLED';
  const isPaid = order.paymentStatus === 'PAID';
  const totalItemCount = order.OrderItems.reduce((sum, i) => sum + i.quantity, 0);
  const visibleItems = showAllItems ? order.OrderItems : order.OrderItems.slice(0, 4);

  const paymentLabel = isPaid
    ? `Paid · ${order.paymentMethod === 'ONLINE' ? 'Online' : 'Cash'}`
    : settings.paymentInstructions || 'Pay at the counter';

  function stepCaption(idx: number): string {
    if (idx === 0) return formatTime(order!.createdAt); // when the order was received
    if (idx < currentStepIndex) return 'Done';
    if (idx === currentStepIndex) return idx === PROGRESS_STEPS.length - 1 ? 'Done' : 'In progress';
    return 'Waiting';
  }

  const theme = HERO_THEME[order.status] ?? HERO_THEME.PENDING;

  return (
    <div className="min-h-screen bg-[#fff6e8] dark:bg-[#1b110c]">
      <div className="w-full max-w-md sm:max-w-2xl lg:max-w-5xl mx-auto px-4 sm:px-6 pb-10 overflow-x-hidden">
        <p className="text-center text-xs sm:text-sm text-muted-foreground py-4 sm:py-5">
          Order #{order.id} · Placed {formatTime(order.createdAt)}
        </p>

        <div className="space-y-4 sm:space-y-5 lg:space-y-0 lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-8 lg:items-start">
          {/* LEFT: pickup number + progress */}
          <div className="space-y-4 sm:space-y-5">
            {!isCancelled && (
              <section
                className={`relative overflow-hidden rounded-3xl sm:rounded-[28px] bg-gradient-to-br ${theme.bg} px-5 py-6 sm:py-9 text-center text-white shadow-[0_12px_30px_rgba(140,70,20,0.2)]`}
              >
                <div className="pointer-events-none absolute -right-12 -top-14 h-44 w-44 rounded-full bg-white/15" />
                <div className="pointer-events-none absolute -bottom-12 -left-8 h-32 w-32 rounded-full bg-white/15" />

                <div className="relative z-10 space-y-1 sm:space-y-2">
                  <p className="text-[11px] sm:text-xs font-bold tracking-[0.25em] uppercase text-white/85">
                    Pickup Number
                  </p>
                  <p className="font-display text-7xl sm:text-9xl font-black leading-none tracking-tight text-white drop-shadow-lg">
                    {order.pickupNumber ?? '-'}
                  </p>
                  <p className="pt-2 text-base sm:text-2xl font-bold text-white">
                    {order.status === 'PENDING' && 'We got your order'}
                    {order.status === 'PREPARING' && 'Your food is being prepared'}
                    {order.status === 'READY' && 'Your order is ready!'}
                    {order.status === 'COMPLETED' && 'Order completed'}
                  </p>
                  <p className="text-sm sm:text-lg text-white/90">
                    {order.status === 'PENDING' && 'The kitchen will start shortly.'}
                    {order.status === 'PREPARING' && 'Almost there.'}
                    {order.status === 'READY' && 'Please collect at the counter.'}
                    {order.status === 'COMPLETED' && 'Thanks for ordering!'}
                  </p>
                </div>

                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute bottom-2 right-3 z-10 text-4xl sm:bottom-4 sm:right-6 sm:text-6xl drop-shadow-lg motion-safe:animate-[bob_3.2s_ease-in-out_infinite]"
                >
                  {theme.emoji}
                </span>
              </section>
            )}

            {isCancelled && (
              <div className="rounded-3xl bg-red-50 dark:bg-red-500/10 p-6 sm:p-8 text-center space-y-2 shadow-[0_8px_24px_rgba(140,70,20,0.1)]">
                <p className="text-4xl">😕</p>
                <p className="font-display text-xl sm:text-3xl font-bold text-red-700 dark:text-red-300">
                  Order Cancelled
                </p>
                <p className="text-sm sm:text-base text-muted-foreground">
                  Please contact staff if you have questions.
                </p>
                {order.paymentStatus === 'PAID' && (
                  <p className="text-sm font-medium text-red-700">
                    Your payment has been refunded. It can take a few days to appear in your account.
                  </p>
                )}
              </div>
            )}

            {!isCancelled && (
              <div className={`p-4 sm:p-6 space-y-4 ${CARD}`}>
                <h2 className="font-display text-lg sm:text-2xl font-bold">Progress</h2>
                <div>
                  {PROGRESS_STEPS.map((step, idx) => {
                    const isDone = idx <= currentStepIndex;
                    const isLast = idx === PROGRESS_STEPS.length - 1;
                    const isNow = idx === currentStepIndex && order.status !== 'COMPLETED';
                    const showCheck = idx < currentStepIndex || (isDone && isLast);
                    return (
                      <div key={step.key} className="flex gap-3 sm:gap-4">
                        <div className="flex flex-col items-center shrink-0">
                          <div
                            className={`h-7 w-7 sm:h-9 sm:w-9 rounded-full flex items-center justify-center text-sm font-bold ${
                              isDone
                                ? `${BRAND} text-white`
                                : 'bg-foreground/10 text-muted-foreground'
                            } ${isNow ? 'ring-4 ring-[#ff8a3d]/30 motion-safe:animate-pulse' : ''}`}
                          >
                            {showCheck ? '✓' : idx + 1}
                          </div>
                          {!isLast && (
                            <span
                              className={`w-0.5 flex-1 rounded-full ${
                                idx < currentStepIndex ? 'bg-[#ff8a3d]' : 'bg-foreground/15'
                              }`}
                              style={{ minHeight: '2rem' }}
                            />
                          )}
                        </div>
                        <div className={`min-w-0 ${isLast ? 'pb-0' : 'pb-4 sm:pb-6'}`}>
                          <p
                            className={`text-sm sm:text-lg ${
                              isDone ? 'font-bold' : 'font-semibold text-muted-foreground'
                            }`}
                          >
                            {step.label}
                          </p>
                          <p className="text-xs sm:text-sm text-muted-foreground">{stepCaption(idx)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT (desktop) / below (phone, tablet): your order */}
          <div className="space-y-4 sm:space-y-5 lg:sticky lg:top-6">
            <div className={`p-4 sm:p-6 space-y-3 ${CARD}`}>
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg sm:text-2xl font-bold">Your order</h2>
                <span className="text-xs sm:text-sm text-muted-foreground">
                  {totalItemCount} {totalItemCount === 1 ? 'item' : 'items'}
                </span>
              </div>

              <div className="space-y-2">
                {visibleItems.map((item) => (
                  <div key={item.id} className="flex justify-between gap-3 text-sm sm:text-base">
                    <span className="min-w-0">
                      {item.quantity}× {item.Product?.name ?? `Product #${item.productId}`}
                    </span>
                    <span className="font-bold shrink-0">{money(item.subtotal)}</span>
                  </div>
                ))}
              </div>

              {order.OrderItems.length > 4 && !showAllItems && (
                <button
                  onClick={() => setShowAllItems(true)}
                  className="w-full h-10 rounded-full bg-foreground/5 text-sm font-semibold transition hover:bg-foreground/10 active:scale-[.99]"
                >
                  Show all {order.OrderItems.length} items
                </button>
              )}

              <div className="border-t border-dashed border-foreground/15 pt-3 flex items-baseline justify-between">
                <span className="font-bold">Total</span>
                <span className="font-display text-2xl sm:text-3xl font-black tracking-tight text-[#e8432d]">
                  {money(total)}
                </span>
              </div>

              {!isCancelled && (
                <div className="flex justify-between items-center gap-4 text-sm text-muted-foreground pt-1">
                  <span className="shrink-0">Payment</span>
                  <span
                    className={`text-right ${
                      isPaid
                        ? 'rounded-full bg-emerald-100 dark:bg-emerald-500/20 px-3 py-1 text-xs sm:text-sm font-bold text-emerald-700 dark:text-emerald-300'
                        : ''
                    }`}
                  >
                    {paymentLabel}
                  </span>
                </div>
              )}
            </div>

            <button
              onClick={() => navigate('/menu')}
              className={`w-full h-12 sm:h-14 rounded-xl sm:rounded-2xl ${BRAND} text-white text-sm sm:text-[17px] font-bold shadow-[0_12px_28px_rgba(232,67,45,0.45)] transition active:scale-[.99]`}
            >
              Order More
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}