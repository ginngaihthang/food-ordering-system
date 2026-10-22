import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchOrdersByTokens, type OrderResult } from '@/api/orders';
import { forgetOrder, getRememberedOrderTokens } from '@/lib/orderHistory';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Received',
  PREPARING: 'Preparing',
  READY: 'Ready',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

/* ---------- UI-only (same look as Menu, Cart, SessionOrders, OrderStatus) ---------- */

const BRAND = 'bg-gradient-to-br from-[#e8432d] to-[#ff8a3d]';
const CARD = 'rounded-3xl bg-card shadow-[0_8px_24px_rgba(140,70,20,0.12)]';

// Colour and emoji for each status (the tile on the left and the badge)
const STATUS_THEME: Record<string, { emoji: string; tile: string; badge: string }> = {
  PENDING: {
    emoji: '🧾',
    tile: 'from-[#ffe0a3] to-[#ffb347]',
    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300',
  },
  PREPARING: {
    emoji: '🍳',
    tile: 'from-[#cfe3ff] to-[#7db2ee]',
    badge: 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300',
  },
  READY: {
    emoji: '🎉',
    tile: 'from-[#c9f2dc] to-[#5fd39a]',
    badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300',
  },
  COMPLETED: {
    emoji: '😋',
    tile: 'from-[#e7e5e4] to-[#c4bfba]',
    badge: 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300',
  },
  CANCELLED: {
    emoji: '😕',
    tile: 'from-[#ffd0d0] to-[#ff8f8f]',
    badge: 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300',
  },
};

export default function MyTakeawayOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderResult[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function load() {
      try {
        const data = await fetchOrdersByTokens(getRememberedOrderTokens());

        // Drop any order that's already been paid, nothing left to track for the customer
        const stillRelevant = data.filter((order) => order.paymentStatus !== 'PAID');

        // Clean up localStorage so paid orders don't keep coming back
        data
          .filter((order) => order.paymentStatus === 'PAID')
          .forEach((order) => forgetOrder(order.publicToken));

        setOrders(stillRelevant);
      } catch (err) {
        console.error('Failed to load orders:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fff6e8] dark:bg-[#1b110c]">
        <div className="w-full max-w-md sm:max-w-2xl lg:max-w-5xl mx-auto p-4 sm:p-6 space-y-4 overflow-x-hidden">
          <Skeleton className="h-28 sm:h-40 w-full rounded-3xl" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <Skeleton className="h-24 w-full rounded-3xl" />
            <Skeleton className="h-24 w-full rounded-3xl" />
            <Skeleton className="h-24 w-full rounded-3xl hidden sm:block" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fff6e8] dark:bg-[#1b110c]">
      <div className="w-full max-w-md sm:max-w-2xl lg:max-w-5xl mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6 overflow-x-hidden">
        {/* Hero header */}
        <section className="relative overflow-hidden rounded-3xl sm:rounded-[28px] bg-gradient-to-br from-[#e8432d] via-[#ff8a3d] to-[#ffb627] px-4 py-5 text-white sm:px-8 sm:py-8">
          <div className="pointer-events-none absolute -right-12 -top-14 h-44 w-44 rounded-full bg-white/15" />
          <div className="pointer-events-none absolute -bottom-12 -left-8 h-28 w-28 rounded-full bg-white/15" />

          <div className="relative z-10 flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => navigate('/menu')}
              aria-label="Back to menu"
              className="grid h-9 w-9 sm:h-11 sm:w-11 shrink-0 place-items-center rounded-full bg-white text-[#e8432d] shadow-sm transition active:scale-95"
            >
              <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
            <span className="rounded-full bg-white/25 px-3 py-1 text-xs sm:text-sm font-semibold backdrop-blur">
              🛍️ Takeaway
            </span>
          </div>
          <h1 className="relative z-10 mt-2 sm:mt-4 font-display text-2xl sm:text-5xl font-black leading-tight tracking-tight text-white">
            My Recent Orders
          </h1>
          {orders.length > 0 && (
            <p className="relative z-10 text-sm sm:text-lg text-white/90">
              {orders.length} {orders.length === 1 ? 'order' : 'orders'} on this device
            </p>
          )}

          <div
            aria-hidden="true"
            className="pointer-events-none absolute bottom-2 right-3 z-10 flex gap-0.5 text-3xl sm:bottom-4 sm:right-8 sm:text-6xl drop-shadow-lg"
          >
            <span className="motion-safe:animate-[bob_3.2s_ease-in-out_infinite]">🧾</span>
            <span className="motion-safe:animate-[bob_3.2s_ease-in-out_0.5s_infinite]">🍜</span>
          </div>
        </section>

        {orders.length === 0 ? (
          <div className="text-center py-12 sm:py-20 space-y-3">
            <p className="text-6xl">🍽️</p>
            <p className="text-sm sm:text-lg text-muted-foreground">
              No recent orders found on this device.
            </p>
            <button
              onClick={() => navigate('/menu')}
              className={`mt-2 h-11 sm:h-12 px-6 rounded-2xl ${BRAND} text-white text-sm sm:text-base font-bold shadow-[0_10px_22px_rgba(232,67,45,0.35)] transition active:scale-95`}
            >
              Browse Menu
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {orders.map((order) => {
              const total = order.OrderItems.reduce((sum, i) => sum + Number(i.subtotal), 0);
              const theme = STATUS_THEME[order.status] ?? STATUS_THEME.PENDING;
              const isReady = order.status === 'READY';
              return (
                <button
                  key={order.id}
                  onClick={() => navigate(`/order/${order.publicToken}`)}
                  className={`group w-full text-left flex items-center gap-3 p-3 sm:p-4 transition duration-200 hover:-translate-y-0.5 active:scale-[.99] ${CARD} ${
                    isReady ? 'ring-2 ring-emerald-500' : ''
                  } ${order.status === 'CANCELLED' ? 'opacity-80' : ''}`}
                >
                  <div
                    className={`grid h-14 w-14 sm:h-16 sm:w-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${theme.tile} text-2xl sm:text-3xl drop-shadow`}
                  >
                    {theme.emoji}
                  </div>

                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-display text-base sm:text-xl font-black leading-tight">
                        Order #{order.id}
                      </span>
                      <span
                        className={`text-[11px] sm:text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ${theme.badge}`}
                      >
                        {STATUS_LABELS[order.status]}
                      </span>
                    </div>

                    {order.pickupNumber && (
                      <p className="text-xs sm:text-sm font-semibold text-[#e8432d]">
                        Pickup #{order.pickupNumber}
                      </p>
                    )}

                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {new Date(order.createdAt).toLocaleString()}
                    </p>

                    <p className="font-display text-base sm:text-xl font-black">
                      ${total.toFixed(2)}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}