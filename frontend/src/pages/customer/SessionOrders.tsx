import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchSessionOrders, type SessionOrdersResult } from '@/api/orders';
import { useSettings } from '@/context/SettingsContext';
import { getSocket } from '@/lib/socket';

type StatusKey = 'PENDING' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED';

interface StatusStyle {
  label: string;
  dot: string;
  badgeBg: string;
  badgeText: string;
  barColor: string;
  borderColor: string;
}

const STATUS_CONFIG: Record<StatusKey, StatusStyle> = {
  PENDING: {
    label: 'Received',
    dot: 'bg-amber-500',
    badgeBg: 'bg-amber-100 dark:bg-amber-500/20',
    badgeText: 'text-amber-800 dark:text-amber-300',
    barColor: 'bg-amber-500',
    borderColor: 'ring-0',
  },
  PREPARING: {
    label: 'Preparing',
    dot: 'bg-blue-500',
    badgeBg: 'bg-blue-100 dark:bg-blue-500/20',
    badgeText: 'text-blue-800 dark:text-blue-300',
    barColor: 'bg-blue-500',
    borderColor: 'ring-0',
  },
  READY: {
    label: 'Ready',
    dot: 'bg-emerald-600',
    badgeBg: 'bg-emerald-100 dark:bg-emerald-500/20',
    badgeText: 'text-emerald-800 dark:text-emerald-300',
    barColor: 'bg-emerald-600',
    borderColor: 'ring-2 ring-emerald-500',
  },
  COMPLETED: {
    label: 'Served',
    dot: 'bg-gray-400',
    badgeBg: 'bg-gray-100 dark:bg-white/10',
    badgeText: 'text-gray-600 dark:text-gray-300',
    barColor: 'bg-gray-300',
    borderColor: 'ring-0',
  },
  CANCELLED: {
    label: 'Cancelled',
    dot: 'bg-red-500',
    badgeBg: 'bg-red-100 dark:bg-red-500/20',
    badgeText: 'text-red-800 dark:text-red-300',
    barColor: 'bg-red-400',
    borderColor: 'ring-0',
  },
};

const PROGRESS_ORDER: StatusKey[] = ['PENDING', 'PREPARING', 'READY'];

// UI-only: small labels under the progress bar
const STEP_LABELS = ['Received', 'Preparing', 'Ready'];

// UI-only: same look as Menu.jsx and Cart.jsx
const BRAND = 'bg-gradient-to-br from-[#e8432d] to-[#ff8a3d]';
const CARD = 'rounded-3xl bg-card shadow-[0_8px_24px_rgba(140,70,20,0.12)]';

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function minutesAgo(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
}

export default function SessionOrders() {
  const [searchParams] = useSearchParams();
  const tableToken = searchParams.get('table');
  const navigate = useNavigate();
  const { money } = useSettings();

  const [data, setData] = useState<SessionOrdersResult | null>(null);
  // Only loading when there is a table to load. Without one the page shows "No orders yet".
  const [loading, setLoading] = useState(Boolean(tableToken));

  // Loads the bill and keeps it fresh. The load function lives inside the effect, so state
  // is only set after the request finishes or from a socket callback.
  useEffect(() => {
    if (!tableToken) return;

    const token: string = tableToken;
    let cancelled = false;

    async function load() {
      try {
        const result = await fetchSessionOrders(token);
        if (!cancelled) setData(result);
      } catch (err) {
        console.error('Failed to load the orders:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    const socket = getSocket();
    function handleUpdate() {
      void load();
    }

    socket.on('order_status_updated', handleUpdate);
    socket.on('session_order_updated', handleUpdate);
    // After a dropped connection (a locked phone, bad signal), catch up on what was missed
    socket.on('connect', handleUpdate);

    return () => {
      cancelled = true;
      socket.off('order_status_updated', handleUpdate);
      socket.off('session_order_updated', handleUpdate);
      socket.off('connect', handleUpdate);
    };
  }, [tableToken]);

  const sessionId = data?.session?.id;

  // Joins the table's live-update room. sessionId is a dependency on purpose: the first
  // order creates the session, so the page joins again once it exists.
  useEffect(() => {
    if (!tableToken) return;

    const socket = getSocket();
    function joinRoom() {
      socket.emit('join_session_room', { tableToken });
    }

    if (socket.connected) joinRoom();
    socket.on('connect', joinRoom);

    return () => {
      socket.off('connect', joinRoom);
    };
  }, [tableToken, sessionId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fff6e8] dark:bg-[#1b110c]">
        <div className="w-full max-w-2xl lg:max-w-5xl mx-auto p-4 sm:p-6 space-y-4 overflow-x-hidden">
          <Skeleton className="h-28 sm:h-40 w-full rounded-3xl" />
          <Skeleton className="h-32 w-full rounded-3xl" />
          <Skeleton className="h-32 w-full rounded-3xl" />
        </div>
      </div>
    );
  }

  if (!data || !data.session || data.orders.length === 0) {
    return (
      <div className="min-h-screen bg-[#fff6e8] dark:bg-[#1b110c]">
        <div className="w-full max-w-md mx-auto p-8 pt-20 text-center space-y-4 overflow-x-hidden">
          <p className="text-6xl">🍽️</p>
          <p className="font-display text-xl sm:text-3xl font-bold">No orders yet for this table</p>
          <button
            onClick={() => navigate(tableToken ? `/menu?table=${tableToken}` : '/menu')}
            className={`h-11 sm:h-12 px-6 rounded-2xl ${BRAND} text-white text-sm sm:text-base font-bold shadow-[0_10px_22px_rgba(232,67,45,0.35)] transition active:scale-95`}
          >
            Browse Menu
          </button>
        </div>
      </div>
    );
  }

  const sortedOrders = [...data.orders].reverse();
  const inProgressOrders = sortedOrders.filter((o) => o.status !== 'COMPLETED' && o.status !== 'CANCELLED');
  const servedOrders = sortedOrders.filter((o) => o.status === 'COMPLETED' || o.status === 'CANCELLED');

  function renderOrderCard(order: (typeof sortedOrders)[number], isLast: boolean) {
    const config = STATUS_CONFIG[order.status as StatusKey] ?? STATUS_CONFIG.PENDING;
    const isTerminal = order.status === 'COMPLETED' || order.status === 'CANCELLED';
    const isReady = order.status === 'READY';
    const stepIndex = PROGRESS_ORDER.indexOf(order.status as StatusKey);
    const mins = minutesAgo(order.createdAt);

    return (
      <div key={order.id} className="flex gap-3 sm:gap-4">
        {/* Timeline marker */}
        <div className="flex flex-col items-center shrink-0 pt-4">
          <div
            className={`h-6 w-6 rounded-full flex items-center justify-center ${config.dot} ${
              isReady ? 'ring-4 ring-emerald-500/25 motion-safe:animate-pulse' : ''
            }`}
          >
            {(isReady || isTerminal) && (
              <svg className="h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="none">
                <path
                  d="M5 13l4 4L19 7"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </div>
          {!isLast && <span className="w-0.5 flex-1 bg-foreground/15 mt-1 rounded-full" />}
        </div>

        {/* Card */}
        <div
          className={`flex-1 min-w-0 p-3 sm:p-5 space-y-2 mb-3 sm:mb-4 ${CARD} ${config.borderColor} ${
            isTerminal ? 'opacity-80' : ''
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-display text-lg sm:text-2xl font-black leading-tight">
              Order #{order.id}
            </h3>
            <span
              className={`text-xs sm:text-sm font-bold px-2.5 py-1 rounded-full shrink-0 ${config.badgeBg} ${config.badgeText}`}
            >
              {config.label}
            </span>
          </div>

          <p className="text-xs sm:text-sm text-muted-foreground">Ordered {formatTime(order.createdAt)}</p>

          {isReady && (
            <p className="inline-block rounded-full bg-emerald-100 px-3 py-1 text-xs sm:text-sm font-bold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
              ✅ Ready to serve
            </p>
          )}

          {!isTerminal && (
            <div className="flex gap-1.5 pt-1">
              {PROGRESS_ORDER.map((step, idx) => (
                <div key={step} className="flex-1">
                  <span
                    className={`block h-1.5 rounded-full ${
                      idx <= stepIndex ? config.barColor : 'bg-foreground/10'
                    }`}
                  />
                  <span
                    className={`mt-1 block text-[10px] sm:text-xs ${
                      idx === stepIndex ? 'font-bold text-foreground' : 'text-muted-foreground'
                    }`}
                  >
                    {STEP_LABELS[idx]}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="pt-2 space-y-1.5 border-t border-dashed border-foreground/15">
            {order.OrderItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between text-sm sm:text-base">
                <span>
                  {item.quantity}× {item.Product?.name}
                </span>
                <span className="font-bold">{money(item.subtotal)}</span>
              </div>
            ))}
          </div>

          {order.status === 'PENDING' && mins > 0 && (
            <p className="text-xs sm:text-sm text-muted-foreground pt-1">⏱ About {mins} min</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fff6e8] dark:bg-[#1b110c]">
      <div className="w-full max-w-2xl lg:max-w-5xl mx-auto p-4 sm:p-6 pb-28 lg:pb-10 overflow-x-hidden">
        {/* Hero header */}
        <section className="relative overflow-hidden rounded-3xl sm:rounded-[28px] bg-gradient-to-br from-[#e8432d] via-[#ff8a3d] to-[#ffb627] px-4 pb-4 pt-4 text-white sm:px-8 sm:pb-8 sm:pt-6">
          <div className="pointer-events-none absolute -right-12 -top-14 h-44 w-44 rounded-full bg-white/15" />
          <div className="pointer-events-none absolute -bottom-12 -left-8 h-28 w-28 rounded-full bg-white/15" />

          <div className="relative z-10 flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => navigate(`/menu?table=${tableToken ?? ''}`)}
              aria-label="Back to menu"
              className="grid h-9 w-9 sm:h-11 sm:w-11 shrink-0 place-items-center rounded-full bg-white text-[#e8432d] shadow-sm transition active:scale-95"
            >
              <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
            <span className="rounded-full bg-white/25 px-3 py-1 text-xs sm:text-sm font-semibold backdrop-blur">
              🪑 Dine-in
            </span>
          </div>
          <h1 className="relative z-10 mt-2 sm:mt-4 font-display text-2xl sm:text-5xl font-black leading-tight tracking-tight text-white">
            Table {data.tableNumber}
          </h1>
          <p className="relative z-10 text-sm sm:text-lg text-white/90">
            {sortedOrders.length} {sortedOrders.length === 1 ? 'order' : 'orders'} this visit
          </p>

          <div
            aria-hidden="true"
            className="pointer-events-none absolute bottom-2 right-3 z-10 flex gap-0.5 text-3xl sm:bottom-4 sm:right-8 sm:text-6xl drop-shadow-lg"
          >
            <span className="motion-safe:animate-[bob_3.2s_ease-in-out_infinite]">🍛</span>
            <span className="motion-safe:animate-[bob_3.2s_ease-in-out_0.5s_infinite]">🍜</span>
          </div>
        </section>

        <div className="mt-5 sm:mt-8 lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-8 lg:items-start">
          {/* LEFT: orders timeline */}
          <div className="space-y-5 sm:space-y-6">
            {inProgressOrders.length > 0 && (
              <div>
                <p className="text-xs font-bold tracking-widest text-muted-foreground mb-3">
                  IN PROGRESS
                </p>
                {inProgressOrders.map((order, idx) =>
                  renderOrderCard(order, idx === inProgressOrders.length - 1 && servedOrders.length === 0)
                )}
              </div>
            )}

            {servedOrders.length > 0 && (
              <div>
                <p className="text-xs font-bold tracking-widest text-muted-foreground mb-3">
                  SERVED
                </p>
                {servedOrders.map((order, idx) => renderOrderCard(order, idx === servedOrders.length - 1))}
              </div>
            )}
          </div>

          {/* RIGHT (desktop only): bill */}
          <aside className={`hidden lg:block sticky top-6 p-6 ${CARD}`}>
            <p className="text-sm text-muted-foreground">Total bill</p>
            <p className="mt-1 font-display text-5xl font-black tracking-tight">
              {money(data.total)}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {sortedOrders.length} {sortedOrders.length === 1 ? 'order' : 'orders'} this visit
            </p>
            <button
              onClick={() => navigate(`/menu?table=${tableToken ?? ''}`)}
              className={`mt-6 w-full h-14 rounded-2xl ${BRAND} text-white text-[17px] font-bold shadow-[0_12px_28px_rgba(232,67,45,0.45)] transition active:scale-[.99]`}
            >
              Order more
            </button>
          </aside>
        </div>

        {/* Sticky bottom bar (phone and tablet) */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-gradient-to-t from-[#fff6e8] via-[#fff6e8]/95 to-transparent dark:from-[#1b110c] dark:via-[#1b110c]/95 px-4 pt-6 pb-[calc(0.75rem+env(safe-area-inset-bottom))] w-full box-border">
          <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">Total bill</p>
              <p className="font-display text-xl sm:text-3xl font-black tracking-tight">
                {money(data.total)}
              </p>
            </div>
            <button
              onClick={() => navigate(`/menu?table=${tableToken ?? ''}`)}
              className={`h-11 sm:h-14 px-6 sm:px-10 rounded-xl sm:rounded-2xl ${BRAND} text-white text-sm sm:text-base font-bold shadow-[0_12px_28px_rgba(232,67,45,0.45)] transition active:scale-95`}
            >
              Order more
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}