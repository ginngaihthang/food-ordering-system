import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  fetchTakeawayOrders,
  fetchTakeawayWeek,
  type OrderResult,
  type TakeawayWeekDay,
} from '@/api/orders';
import { payOrder } from '@/api/payment';
import { getSocket } from '@/lib/socket';
import { TakeawayPagination } from '@/components/takeaway/TakeawayPagination';

const ITEMS_PER_PAGE = 10;

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Received',
  PREPARING: 'Preparing',
  READY: 'Ready',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

type FilterKey = 'ALL' | 'UNPAID' | 'PAID';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'UNPAID', label: 'Unpaid' },
  { key: 'PAID', label: 'Paid' },
];

// Local-date helpers (toISOString() returns the UTC date, which can be yesterday)
function toDateStr(d: Date): string {
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

function fromDateStr(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y!, m! - 1, d!);
}

function formatHeaderDate(s: string): string {
  return fromDateStr(s).toLocaleDateString('en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

function isUnpaid(order: OrderResult): boolean {
  return order.paymentStatus !== 'PAID' && order.status !== 'CANCELLED';
}

export default function TakeawayOrders() {
  const [selectedDate, setSelectedDate] = useState(() => toDateStr(new Date()));
  const [orders, setOrders] = useState<OrderResult[]>([]);
  const [weekDays, setWeekDays] = useState<TakeawayWeekDay[]>([]);
  const [loadedDate, setLoadedDate] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>('UNPAID');
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');

  const requestIdRef = useRef(0);
  const today = toDateStr(new Date());

  // Loading whenever the data on screen isn't for the selected date
  const loading = loadedDate !== selectedDate;

  // Go back to page 1 when the date, filter or search changes
  const resetKey = `${selectedDate}|${filter}|${search}`;
  const [prevResetKey, setPrevResetKey] = useState(resetKey);
  if (prevResetKey !== resetKey) {
    setPrevResetKey(resetKey);
    setCurrentPage(1);
  }

  // Refresh without showing the skeleton (socket events, after a payment)
  const load = useCallback(async () => {
    // Ignore responses from older requests (e.g. when clicking through dates quickly)
    const requestId = ++requestIdRef.current;
    try {
      const [data, week] = await Promise.all([
        fetchTakeawayOrders(selectedDate),
        fetchTakeawayWeek(selectedDate),
      ]);
      if (requestId !== requestIdRef.current) return;
      setOrders(data);
      setWeekDays(week);
      setLoadedDate(selectedDate);
    } catch (err) {
      console.error('Failed to refresh takeaway orders:', err);
    }
  }, [selectedDate]);

  // Load whenever the selected date changes
  useEffect(() => {
    let cancelled = false;
    const requestId = ++requestIdRef.current;
    const stale = () => cancelled || requestId !== requestIdRef.current;

    async function loadDate() {
      try {
        const [data, week] = await Promise.all([
          fetchTakeawayOrders(selectedDate),
          fetchTakeawayWeek(selectedDate),
        ]);
        if (stale()) return;
        setOrders(data);
        setWeekDays(week);
      } catch (err) {
        console.error('Failed to load takeaway orders:', err);
        if (stale()) return;
        setOrders([]);
      }
      setLoadedDate(selectedDate); // ends the loading state, even after an error
    }

    loadDate();

    return () => {
      cancelled = true;
    };
  }, [selectedDate]);

  // Live updates
  useEffect(() => {
    const socket = getSocket();
    socket.emit('join_admin_room');

    function refresh() {
      load();
    }
    socket.on('new_order', refresh);
    socket.on('order_updated', refresh);

    return () => {
      socket.off('new_order', refresh);
      socket.off('order_updated', refresh);
    };
  }, [load]);

  function shiftDate(days: number) {
    const d = fromDateStr(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(toDateStr(d));
  }

  async function handlePay(orderId: number, method: 'CASH' | 'ONLINE') {
    try {
      await payOrder(orderId, method);
      load();
    } catch {
      alert('Failed to record payment');
    }
  }

  function openReceipt(orderId: number) {
    window.open(`/admin/receipt/${orderId}?type=order`, '_blank');
  }

  const counts: Record<FilterKey, number> = {
    ALL: orders.length,
    UNPAID: orders.filter(isUnpaid).length,
    PAID: orders.filter((o) => o.paymentStatus === 'PAID').length,
  };

  const searchTerm = search.toLowerCase().trim();

  const filteredOrders = orders.filter((order) => {
    if (
      searchTerm &&
      !String(order.id).includes(searchTerm) &&
      !String(order.pickupNumber ?? '').toLowerCase().includes(searchTerm)
    ) {
      return false;
    }
    if (filter === 'UNPAID') return isUnpaid(order);
    if (filter === 'PAID') return order.paymentStatus === 'PAID';
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / ITEMS_PER_PAGE));
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="space-y-6">
      {/* Header + date navigator */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold">Takeaway Orders</h2>
          <p className="text-muted-foreground">
            {formatHeaderDate(selectedDate)} · {orders.length}{' '}
            {orders.length === 1 ? 'order' : 'orders'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => shiftDate(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
            className="w-40"
          />
          <Button variant="outline" size="icon" onClick={() => shiftDate(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 7-day strip */}
      {loading && weekDays.length === 0 ? (
        <div className="grid grid-cols-7 gap-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-2 sm:gap-3">
          {weekDays.map((day) => {
            const isSelected = day.date === selectedDate;
            const isToday = day.date === today;
            return (
              <button
                key={day.date}
                onClick={() => setSelectedDate(day.date)}
                className={`rounded-xl p-3 sm:p-4 text-left transition-colors ${
                  isSelected ? 'bg-foreground text-background' : 'bg-card border hover:bg-muted'
                }`}
              >
                <p
                  className={`text-sm ${
                    isSelected ? 'text-background/70' : 'text-muted-foreground'
                  }`}
                >
                  {isToday ? 'Today' : formatHeaderDate(day.date)}
                </p>
                <p className="font-bold mt-1">${day.revenue.toFixed(2)}</p>
              </button>
            );
          })}
        </div>
      )}

      {/* Filter pills with counts + search */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                filter === f.key
                  ? 'bg-foreground text-background'
                  : 'bg-muted text-muted-foreground hover:bg-muted/70'
              }`}
            >
              {f.label} {counts[f.key]}
            </button>
          ))}
        </div>

        <Input
          placeholder="Search order # or pickup #..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
      </div>

      {/* Orders */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
          No {filter !== 'ALL' ? filter.toLowerCase() + ' ' : ''}takeaway orders on this day.
        </div>
      ) : (
        <div className="space-y-3">
          {paginatedOrders.map((order) => {
            const total = order.OrderItems.reduce((sum, i) => sum + Number(i.subtotal), 0);
            const itemsSummary = order.OrderItems.map(
              (i) => `${i.quantity}× ${i.Product?.name}`
            ).join(', ');

            return (
              <div key={order.id} className="rounded-xl border bg-card p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold">
                      Order #{order.id}
                      {order.pickupNumber && ` · Pickup #${order.pickupNumber}`}
                    </p>
                    <p className="text-sm text-muted-foreground">{itemsSummary}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(order.createdAt).toLocaleTimeString([], {
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <Badge
                    variant={order.status === 'CANCELLED' ? 'destructive' : 'default'}
                    className="shrink-0"
                  >
                    {STATUS_LABELS[order.status]}
                  </Badge>
                </div>

                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="font-bold text-lg">${total.toFixed(2)}</span>

                  {order.status === 'CANCELLED' && order.paymentStatus === 'PAID' ? (
                    <span className="text-sm font-medium text-amber-700">Refunded</span>
                  ) : order.paymentStatus === 'PAID' ? (
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-emerald-700 font-medium">
                        Paid · {order.paymentMethod}
                      </span>
                      <Button size="sm" variant="outline" onClick={() => openReceipt(order.id)}>
                        Print Receipt
                      </Button>
                    </div>
                  ) : order.status === 'CANCELLED' ? (
                    <span className="text-sm text-muted-foreground">No payment needed</span>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handlePay(order.id, 'CASH')}
                      >
                        Mark Paid — Cash
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handlePay(order.id, 'ONLINE')}
                      >
                        Mark Paid — Online
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <TakeawayPagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  );
}