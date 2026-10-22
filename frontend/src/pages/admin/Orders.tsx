import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bell, BellOff, BellRing } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { apiClient } from '@/api/client';
import { getSocket } from '@/lib/socket';
import { useNewOrderAlarm } from '@/hooks/useNewOrderAlarm';
import { useCancelOrder } from '@/hooks/useCancelOrder';
import { CancelOrderDialog } from '@/components/orders/CancelOrderDialog';
import { canCancelOrder } from '@/lib/orderRules';
import type { OrderResult } from '@/api/orders';
import { useWakeLock } from '@/hooks/useWakeLock';

// getOrders also returns the table (and its payment status) through TableSession
type LiveOrder = OrderResult & {
  TableSession?: {
    paymentStatus?: 'UNPAID' | 'PAID';
    RestaurantTable?: { tableNumber: number } | null;
  } | null;
};

const COLUMNS = [
  { key: 'PENDING', title: 'New', dot: 'bg-amber-600', accent: 'border-l-amber-600', empty: 'No new orders.' },
  { key: 'PREPARING', title: 'Preparing', dot: 'bg-blue-600', accent: 'border-l-blue-600', empty: 'Nothing being prepared.' },
  { key: 'READY', title: 'Ready for pickup', dot: 'bg-emerald-700', accent: 'border-l-emerald-700', empty: 'No orders waiting.' },
] as const;

const NEXT_STATUS: Record<string, string> = {
  PENDING: 'PREPARING',
  PREPARING: 'READY',
  READY: 'COMPLETED',
};

const ACTION_LABEL: Record<string, string> = {
  PENDING: 'Accept',
  PREPARING: 'Ready',
  READY: 'Hand over',
};

// UI only: short names for the tabs shown on a portrait tablet or phone
const TAB_LABEL: Record<string, string> = {
  PENDING: 'New',
  PREPARING: 'Preparing',
  READY: 'Ready',
};

function orderTotal(order: LiveOrder): number {
  return (order.OrderItems ?? []).reduce((sum, item) => sum + Number(item.subtotal), 0);
}

function minutesAgo(dateStr: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000));
}

function agePillClass(mins: number): string {
  if (mins >= 10) return 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300';
  if (mins >= 6) return 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300';
  return 'bg-muted text-muted-foreground';
}

function itemsSummary(order: LiveOrder): string {
  const items = order.OrderItems ?? [];
  const shown = items
    .slice(0, 2)
    .map((i) => `${i.quantity}× ${i.Product?.name ?? 'Item'}`)
    .join(', ');
  const extra = items.length - 2;
  return extra > 0 ? `${shown} +${extra} more` : shown;
}

function orderLabel(order: LiveOrder): string {
  const tableNumber = order.TableSession?.RestaurantTable?.tableNumber;
  if (order.orderType === 'DINE_IN') {
    return tableNumber ? `Table ${tableNumber}` : 'Dine-in';
  }
  return order.pickupNumber ? `Pickup ${order.pickupNumber}` : 'Takeaway';
}

export default function Orders() {
  const [orders, setOrders] = useState<LiveOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedPaused, setFeedPaused] = useState(false);
  const [handedOverCount, setHandedOverCount] = useState(0);
  const [, setTick] = useState(0);

  // UI only: which column is shown on a portrait tablet or phone (large screens show all three)
  const [activeTab, setActiveTab] = useState<string>('PENDING');

  const { enabled, ringing, newCount, enable, disable, acknowledge } =
    useNewOrderAlarm(feedPaused);
  const wakeLock = useWakeLock(true);

  // Cancel flow: the hook opens the dialog, calls the API, and reports back here on success
  const { requestCancel, dialogProps } = useCancelOrder({
    onCancelled: (cancelled) =>
      setOrders((prev) =>
        prev.map((o) => (o.id === cancelled.id ? { ...o, status: 'CANCELLED' as const } : o))
      ),
  });

  // Ref so the socket handler always sees the latest paused value
  const feedPausedRef = useRef(false);
  useEffect(() => {
    feedPausedRef.current = feedPaused;
  }, [feedPaused]);

  // Used for refreshes after the first load (socket events, resume, accept-all failure)
  const loadOrders = useCallback(async () => {
    try {
      const res = await apiClient.get('/api/orders');
      setOrders(res.data);
    } catch (err) {
      console.error('Failed to load orders:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    let cancelled = false;

    apiClient
      .get('/api/orders')
      .then((res) => {
        if (!cancelled) setOrders(res.data);
      })
      .catch((err) => console.error('Failed to load orders:', err))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Live updates
  useEffect(() => {
    // The alarm hook joins the admin room, so this only handles list updates
    const socket = getSocket();

    function handleNewOrder() {
      if (feedPausedRef.current) return;
      loadOrders(); // reload so the new order includes its table info
    }

    function handleOrderUpdated(updated: LiveOrder) {
      // merge so we keep TableSession, which the socket payload doesn't include
      setOrders((prev) => prev.map((o) => (o.id === updated.id ? { ...o, ...updated } : o)));
    }

    function handleReconnect() {
      if (!feedPausedRef.current) loadOrders();
    }

    // A tablet that was asleep or on another tab catches up when you return to it
    function handleVisibility() {
      if (document.visibilityState === 'visible' && !feedPausedRef.current) loadOrders();
    }

    socket.on('new_order', handleNewOrder);
    socket.on('order_updated', handleOrderUpdated);
    socket.io.on('reconnect', handleReconnect);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      socket.off('new_order', handleNewOrder);
      socket.off('order_updated', handleOrderUpdated);
      socket.io.off('reconnect', handleReconnect);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [loadOrders]);

  // Re-render every 30s so the "10m" age pills stay current
  useEffect(() => {
    const timer = setInterval(() => setTick((n) => n + 1), 30000);
    return () => clearInterval(timer);
  }, []);

  function toggleFeed() {
    const next = !feedPaused;
    setFeedPaused(next);
    if (!next) loadOrders(); // catch up on anything missed while paused
  }

  async function advanceStatus(order: LiveOrder) {
    const newStatus = NEXT_STATUS[order.status];
    if (!newStatus) return;

    const previousStatus = order.status;

    setOrders((prev) =>
      prev.map((o) =>
        o.id === order.id ? { ...o, status: newStatus as OrderResult['status'] } : o
      )
    );

    try {
      await apiClient.patch(`/api/orders/${order.id}/status`, { status: newStatus });
      if (newStatus === 'COMPLETED') setHandedOverCount((c) => c + 1);
    } catch (err) {
      console.error('Failed to update order status:', err);
      alert('Failed to update order status');
      setOrders((prev) =>
        prev.map((o) => (o.id === order.id ? { ...o, status: previousStatus } : o))
      );
    }
  }

  async function acceptAll() {
    const pending = orders.filter((o) => o.status === 'PENDING');
    if (pending.length === 0) return;

    setOrders((prev) =>
      prev.map((o) => (o.status === 'PENDING' ? { ...o, status: 'PREPARING' } : o))
    );
    acknowledge(); // accepting everything also silences the alarm

    try {
      await Promise.all(
        pending.map((o) =>
          apiClient.patch(`/api/orders/${o.id}/status`, { status: 'PREPARING' })
        )
      );
    } catch (err) {
      console.error('Accept all failed:', err);
      alert('Some orders failed to update');
      loadOrders();
    }
  }

  const openOrders = useMemo(
    () => orders.filter((o) => ['PENDING', 'PREPARING', 'READY'].includes(o.status)),
    [orders]
  );

  const averageWaitMinutes =
    openOrders.length === 0
      ? 0
      : Math.round(
          openOrders.reduce((sum, o) => sum + minutesAgo(o.createdAt), 0) / openOrders.length
        );

  const columnOrders = (statusKey: string) =>
    orders
      .filter((o) => o.status === statusKey)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-96 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-5 lg:h-[calc(100dvh-3rem)]">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-x-6 gap-y-3 shrink-0">
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Live orders</h2>
          <div className="flex items-center gap-1.5 text-sm font-medium">
            <span
              className={`h-2 w-2 rounded-full ${
                feedPaused ? 'bg-muted-foreground' : 'bg-emerald-500'
              }`}
            />
            <span className={feedPaused ? 'text-muted-foreground' : 'text-emerald-600'}>
              {feedPaused ? 'Feed paused' : 'Receiving orders'}
            </span>
            {wakeLock.active && (
              <span className="hidden text-xs text-muted-foreground md:inline">Screen stays on</span>
            )}
            {!wakeLock.supported && (
              <span className="hidden text-xs text-muted-foreground md:inline">
                Turn off auto-lock in the tablet settings
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
          {/* Stats with dividers */}
          <div className="flex items-center divide-x">
            <div className="pr-4 sm:pr-5">
              <p className="text-xl sm:text-2xl font-bold leading-tight tabular-nums">{openOrders.length}</p>
              <p className="text-xs text-muted-foreground">Open</p>
            </div>
            <div className="px-4 sm:px-5">
              <p className="text-xl sm:text-2xl font-bold leading-tight tabular-nums">{averageWaitMinutes}m</p>
              <p className="text-xs text-muted-foreground">Avg wait</p>
            </div>
            <div className="pl-4 sm:pl-5">
              <p className="text-xl sm:text-2xl font-bold leading-tight tabular-nums">{handedOverCount}</p>
              <p className="text-xs text-muted-foreground">Handed over</p>
            </div>
          </div>

          {/* Sound button: ringing / on / off */}
          {ringing ? (
            <Button
              onClick={acknowledge}
              className="h-12 gap-2 rounded-xl px-5 text-base font-semibold bg-red-700 text-white hover:bg-red-800 ring-4 ring-red-200 animate-pulse"
            >
              <BellRing className="h-5 w-5" />
              {newCount} new {newCount === 1 ? 'order' : 'orders'}
            </Button>
          ) : enabled ? (
            <Button
              onClick={disable}
              className="h-12 gap-2 rounded-xl px-5 text-base font-semibold"
              title="Click to turn sound off"
            >
              <Bell className="h-5 w-5" />
              Sound on
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={enable}
              className="h-12 gap-2 rounded-xl px-5 text-base font-semibold"
            >
              <BellOff className="h-5 w-5" />
              Enable sound
            </Button>
          )}

          <Button
            variant="outline"
            onClick={toggleFeed}
            className="h-12 rounded-xl px-5 text-base font-semibold"
          >
            {feedPaused ? 'Resume feed' : 'Pause feed'}
          </Button>
        </div>
      </div>

      <Separator className="shrink-0" />

      {/* Banner when sound is off */}
      {!enabled && (
        <div className="shrink-0 flex items-center justify-between gap-3 flex-wrap rounded-2xl border border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10 px-4 sm:px-5 py-3">
          <p className="font-semibold text-amber-800 dark:text-amber-300">
            Sound is off. New orders won&apos;t ring.
          </p>
          <Button onClick={enable} className="h-12 rounded-xl px-5 text-base font-semibold">
            Enable sound
          </Button>
        </div>
      )}

      {/* Tabs for a portrait tablet or phone (large screens show all three columns) */}
      <div className="lg:hidden flex gap-2 shrink-0">
        {COLUMNS.map((col) => {
          const count = columnOrders(col.key).length;
          const on = activeTab === col.key;
          return (
            <button
              key={col.key}
              onClick={() => setActiveTab(col.key)}
              className={`h-12 flex-1 rounded-full border text-base font-semibold transition active:scale-95 ${
                on ? 'bg-foreground text-background border-foreground' : 'bg-card'
              }`}
            >
              <span className={`mr-2 inline-block h-2.5 w-2.5 rounded-full ${col.dot}`} />
              {TAB_LABEL[col.key]}
              <span
                className={`ml-2 rounded-full px-2 py-0.5 text-sm ${
                  on ? 'bg-background/20' : 'bg-muted'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Kanban board: each column scrolls on its own on large screens */}
      <div className="grid grid-cols-1 lg:grid-cols-3 lg:grid-rows-1 gap-4 lg:flex-1 lg:min-h-0">
        {COLUMNS.map((col) => {
          const colOrders = columnOrders(col.key);
          return (
            <div
              key={col.key}
              className={`${
                activeTab === col.key ? 'flex' : 'hidden lg:flex'
              } flex-col min-h-0 lg:max-h-none rounded-2xl bg-muted/60 overflow-hidden`}
            >
              {/* Pinned column header */}
              <div className="flex items-center justify-between px-4 py-3 shrink-0">
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${col.dot}`} />
                  <h3 className="font-bold text-base sm:text-lg">{col.title}</h3>
                  <span className="px-2.5 py-0.5 rounded-full bg-background text-sm font-semibold tabular-nums">
                    {colOrders.length}
                  </span>
                </div>

                {col.key === 'PENDING' && colOrders.length > 0 && (
                  <button
                    onClick={acceptAll}
                    className="h-11 px-5 rounded-xl bg-background text-sm font-semibold hover:bg-background/70 transition active:scale-95"
                  >
                    Accept all
                  </button>
                )}
              </div>

              {/* Scrollable card list */}
              <div className="flex-1 min-h-0 overflow-y-auto px-3 pb-3 space-y-3">
                {colOrders.length === 0 ? (
                  <div className="rounded-2xl border border-dashed p-8 text-center text-sm sm:text-base text-muted-foreground">
                    {col.empty}
                  </div>
                ) : (
                  colOrders.map((order) => {
                    const mins = minutesAgo(order.createdAt);
                    return (
                      <div
                        key={order.id}
                        className={`rounded-2xl border-l-4 ${col.accent} bg-card p-4 space-y-2 shadow-sm`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold truncate text-base sm:text-lg">
                            <span className="font-bold">#{order.id}</span>{' '}
                            <span className="text-muted-foreground font-normal">
                              {orderLabel(order)}
                            </span>
                          </p>
                          <span
                            className={`text-sm font-semibold px-3 py-1 rounded-full shrink-0 tabular-nums ${agePillClass(mins)}`}
                          >
                            {mins}m
                          </span>
                        </div>

                        <p className="text-sm sm:text-base text-muted-foreground">
                          {itemsSummary(order)}
                        </p>

                        {order.paymentStatus === 'PAID' && order.paymentMethod === 'ONLINE' && (
                          <span className="inline-block rounded-full bg-emerald-100 dark:bg-emerald-500/20 px-3 py-1 text-xs sm:text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                            Paid online
                          </span>
                        )}

                        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 pt-1">
          <span className="text-xl font-bold tabular-nums">
                            ${orderTotal(order).toFixed(2)}
                          </span>

                          <div className="flex flex-1 items-center justify-end gap-2">
                            {canCancelOrder(order) && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-11 rounded-xl px-3 text-base text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-500/10"
                                onClick={() => requestCancel(order)}
                              >
                                Cancel
                              </Button>
                            )}
                            <Button
                              size="sm"
                              className="h-12 rounded-xl px-5 text-base font-semibold active:scale-95"
                              onClick={() => advanceStatus(order)}
                            >
                              {ACTION_LABEL[order.status]}
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Confirmation dialog for cancelling an order */}
      <CancelOrderDialog {...dialogProps} />
    </div>
  );
}