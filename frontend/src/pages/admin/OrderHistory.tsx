import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  fetchOrderHistory,
  fetchOrderHistoryWeek,
  type OrderHistoryResult,
  type WeekDay,
} from '@/api/orderHistory';
import { OrderPagination } from '@/components/orders/OrderPagination';

const ITEM_PER_PAGE = 10;

const STATUS_BADGE_STYLE: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  PREPARING: 'bg-blue-100 text-blue-800',
  READY: 'bg-emerald-100 text-emerald-800',
  COMPLETED: 'bg-gray-100 text-gray-600',
  CANCELLED: 'bg-red-100 text-red-800',
};

const FILTER_TABS = [
  { key: 'ALL', label: 'All' },
  { key: 'PENDING', label: 'Received' },
  { key: 'PREPARING', label: 'Preparing' },
  { key: 'READY', label: 'Ready' },
  { key: 'COMPLETED', label: 'Served' },
  { key: 'CANCELLED', label: 'Cancelled' },
];

// Local calendar date as YYYY-MM-DD (toISOString would give the UTC date)
function toDateStr(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function todayStr() {
  return toDateStr(new Date());
}

function formatHeaderDate(dateStr: string) {
  // Plain dates are parsed as local time so the weekday doesn't shift
  const d = dateStr.length === 10 ? new Date(`${dateStr}T00:00:00`) : new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

interface LoadedHistory {
  date: string; // the date this data belongs to
  history: OrderHistoryResult | null;
  week: WeekDay[];
}

export default function OrderHistory() {
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [result, setResult] = useState<LoadedHistory | null>(null);
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Loading whenever the data on screen isn't for the selected date
  const loading = result?.date !== selectedDate;
  const data = result?.history ?? null;
  const weekDays = result?.week ?? [];

  // Go back to page 1 and collapse any open order when the date, filter or search changes
  const resetKey = `${selectedDate}|${activeFilter}|${search}`;
  const [prevResetKey, setPrevResetKey] = useState(resetKey);
  if (prevResetKey !== resetKey) {
    setPrevResetKey(resetKey);
    setCurrentPage(1);
    setExpandedOrderId(null);
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [history, week] = await Promise.all([
          fetchOrderHistory(selectedDate),
          fetchOrderHistoryWeek(selectedDate),
        ]);
        if (!cancelled) setResult({ date: selectedDate, history, week: week.days });
      } catch (err) {
        console.error('Failed to load order history:', err);
        if (!cancelled) setResult({ date: selectedDate, history: null, week: [] });
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [selectedDate]);

  function shiftDate(days: number) {
    const d = new Date(`${selectedDate}T00:00:00`);
    d.setDate(d.getDate() + days);
    setSelectedDate(toDateStr(d));
  }

  const filteredOrders = (data?.orders ?? []).filter((order) => {
    const matchesFilter = activeFilter === 'ALL' || order.status === activeFilter;
    const matchesSearch =
      !search ||
      order.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      (order.tableNumber && `table ${order.tableNumber}`.includes(search.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / ITEM_PER_PAGE));
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * ITEM_PER_PAGE,
    currentPage * ITEM_PER_PAGE
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-7 gap-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!data) {
    return <div className="p-8 text-center text-red-600">Could not load order history.</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold">Order History</h2>
          <p className="text-muted-foreground">
            {formatHeaderDate(data.date)} · {data.totalOrders} orders
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => shiftDate(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-40"
          />
          <Button variant="outline" size="icon" onClick={() => shiftDate(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Week strip */}
      <div className="grid grid-cols-7 gap-3">
        {weekDays.map((day) => {
          const isSelected = day.date === selectedDate;
          const isToday = day.date === todayStr();
          return (
            <button
              key={day.date}
              onClick={() => setSelectedDate(day.date)}
              className={`rounded-xl p-4 text-left transition-colors ${
                isSelected ? 'bg-foreground text-background' : 'bg-card border hover:bg-muted'
              }`}
            >
              <p
                className={`text-sm ${
                  isSelected ? 'text-background/70' : 'text-muted-foreground'
                }`}
              >
                {isToday ? 'Today' : day.label}
              </p>
              <p className="font-bold mt-1">${day.revenue.toFixed(2)}</p>
            </button>
          );
        })}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {[
          { label: 'Revenue', value: `$${data.revenue.toFixed(2)}` },
          { label: 'Orders', value: data.totalOrders },
          { label: 'Avg. order', value: `$${data.avgOrder.toFixed(2)}` },
          { label: 'Cancelled', value: data.cancelledCount },
          { label: 'Peak hour', value: data.peakHour },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border bg-card p-4">
            <p className="text-sm text-muted-foreground">{stat.label}</p>
            <p className="text-2xl font-bold mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs + search */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex flex-wrap gap-2">
          {FILTER_TABS.map((tab) => {
            const count =
              tab.key === 'ALL'
                ? data.totalOrders
                : data.statusCounts[
                    tab.key === 'PENDING'
                      ? 'RECEIVED'
                      : tab.key === 'COMPLETED'
                        ? 'SERVED'
                        : tab.key
                  ] ?? 0;
            const isActive = activeFilter === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveFilter(tab.key)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-foreground text-background'
                    : 'bg-muted text-muted-foreground hover:bg-muted/70'
                }`}
              >
                {tab.label} {count}
              </button>
            );
          })}
        </div>

        <Input
          placeholder="Search order # or table..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
      </div>

      {/* Orders table */}
      <div className="rounded-xl border overflow-hidden">
        <div className="grid grid-cols-[100px_80px_80px_1fr_100px_80px] gap-4 px-4 py-3 text-sm font-medium text-muted-foreground border-b bg-muted/30">
          <span>Order</span>
          <span>Time</span>
          <span>Table</span>
          <span>Items</span>
          <span>Status</span>
          <span className="text-right">Total</span>
        </div>

        {paginatedOrders.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground text-sm">No orders found.</div>
        ) : (
          paginatedOrders.map((order) => {
            const isExpanded = expandedOrderId === order.id;
            return (
              <div key={order.id} className="border-b last:border-b-0">
                <button
                  onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                  className="w-full grid grid-cols-[100px_80px_80px_1fr_100px_80px] gap-4 px-4 py-4 text-sm text-left hover:bg-muted/30 transition-colors"
                >
                  <span className="font-bold">{order.orderNumber}</span>
                  <span className="text-muted-foreground">
                    {new Date(order.time).toLocaleTimeString([], {
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </span>
                  <span>{order.tableNumber ? `Table ${order.tableNumber}` : 'Takeaway'}</span>
                  <span className="truncate text-muted-foreground">{order.itemsSummary}</span>
                  <span>
                    <span
                      className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                        STATUS_BADGE_STYLE[order.status]
                      }`}
                    >
                      {order.statusLabel}
                    </span>
                  </span>
                  <span className="text-right font-bold">${order.total.toFixed(2)}</span>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 bg-muted/20 space-y-1">
                    {order.items.map((item, idx) => (
                      <div
                        key={idx}
                        className="grid grid-cols-[1fr_100px] gap-4 text-sm text-muted-foreground pl-[180px]"
                      >
                        <span>
                          {item.quantity}× {item.name}
                        </span>
                        <span className="text-right">${item.subtotal.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <OrderPagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />
    </div>
  );
}