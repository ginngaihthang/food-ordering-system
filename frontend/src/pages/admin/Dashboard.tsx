import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchDashboard, type DashboardResult, type LiveOrderSummary } from '@/api/dashboard';
import { getSocket } from '@/lib/socket';

const TABLE_STATUS_STYLE: Record<string, string> = {
  FREE: 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300',
  RECEIVED: 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300',
  PREPARING: 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300',
  READY: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300',
};

const TABLE_STATUS_LABEL: Record<string, string> = {
  FREE: 'Free',
  RECEIVED: 'Received',
  PREPARING: 'Preparing',
  READY: 'Ready',
};

/* ---------- UI-only helpers ---------- */

// Colour of the "vs yesterday" line. Stays quiet (grey) until there is an order today,
// so an empty morning does not show a scary red "100% down".
function deltaClass(value: number, quiet: boolean) {
  if (quiet) return 'text-muted-foreground';
  return value >= 0 ? 'text-emerald-600' : 'text-red-500';
}

function LiveOrderCard({
  order,
  colorClass,
  accentClass,
}: {
  order: LiveOrderSummary;
  colorClass: string;
  accentClass: string;
}) {
  return (
    <div className={`rounded-xl border-l-4 px-4 py-3 ${colorClass} ${accentClass}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="font-bold">
          #{order.id}{' '}
          <span className="font-medium text-muted-foreground">
            {order.tableNumber ? `Table ${order.tableNumber}` : `Pickup ${order.pickupNumber}`}
          </span>
        </span>
        <span className="rounded-full bg-background/70 px-2.5 py-0.5 text-sm font-semibold shrink-0">
          {order.minutesAgo}m
        </span>
      </div>
      <p className="text-sm text-muted-foreground mt-1">{order.itemsSummary}</p>
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardResult | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const result = await fetchDashboard();
        if (cancelled) return;
        setData(result);
      } catch (err) {
        console.error('Failed to load dashboard:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    const socket = getSocket();
    socket.emit('join_admin_room');

    socket.on('new_order', load);
    socket.on('order_updated', load);

    return () => {
      cancelled = true;
      socket.off('new_order', load);
      socket.off('order_updated', load);
    };
  }, []);

  if (loading || !data) {
    return (
      <div className="space-y-5 sm:space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  const maxRevenue = Math.max(...data.revenueLast7Days.map((d) => d.revenue), 1);
  const maxTopItem = Math.max(...data.topItems.map((i) => i.count), 1);
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  // UI only: no orders yet today, so comparisons are not meaningful
  const quiet = data.ordersToday === 0;

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Today, {today}</p>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-emerald-100 dark:bg-emerald-500/20 px-3.5 py-1.5 text-sm text-emerald-700 dark:text-emerald-300 font-semibold">
          <span className="h-2 w-2 rounded-full bg-emerald-500 motion-safe:animate-pulse" />
          Live
        </div>
      </div>

      {/* Stat cards: 2 across on a portrait tablet, 4 across when there is room */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-2xl border bg-card p-4 sm:p-5">
          <p className="text-sm text-muted-foreground">Revenue today</p>
          <p className="text-2xl sm:text-3xl font-bold tracking-tight mt-1">
            ${data.revenueToday.toFixed(2)}
          </p>
          <p className={`text-sm mt-1 ${deltaClass(data.revenueChangePct, quiet)}`}>
            {data.revenueChangePct >= 0 ? '▲' : '▼'} {Math.abs(data.revenueChangePct)}% vs yesterday
          </p>
        </div>

        <div className="rounded-2xl border bg-card p-4 sm:p-5">
          <p className="text-sm text-muted-foreground">Orders</p>
          <p className="text-2xl sm:text-3xl font-bold tracking-tight mt-1">{data.ordersToday}</p>
          <p className={`text-sm mt-1 ${deltaClass(data.ordersDiff, quiet)}`}>
            {data.ordersDiff >= 0 ? '▲' : '▼'} {Math.abs(data.ordersDiff)}{' '}
            {data.ordersDiff >= 0 ? 'more' : 'fewer'} than yesterday
          </p>
        </div>

        <div className="rounded-2xl border bg-card p-4 sm:p-5">
          <p className="text-sm text-muted-foreground">Avg. order</p>
          <p className="text-2xl sm:text-3xl font-bold tracking-tight mt-1">
            ${data.avgOrderToday.toFixed(2)}
          </p>
          <p className={`text-sm mt-1 ${deltaClass(data.avgOrderChangePct, quiet)}`}>
            {data.avgOrderChangePct >= 0 ? '▲' : '▼'} {Math.abs(data.avgOrderChangePct)}% vs yesterday
          </p>
        </div>

        <div className="rounded-2xl border bg-card p-4 sm:p-5">
          <p className="text-sm text-muted-foreground">Active tables</p>
          <p className="text-2xl sm:text-3xl font-bold tracking-tight mt-1">
            {data.activeTables} / {data.totalTables}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {data.readyCount} orders ready to serve
          </p>
        </div>
      </div>

      {/* Live orders */}
      <div className="rounded-2xl border bg-card p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-bold text-lg">Live orders</h2>
          <button
            onClick={() => navigate('/admin/order-history')}
            className="h-11 px-4 -mr-2 rounded-xl text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground active:scale-95"
          >
            View all history →
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 font-semibold">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
              Received
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-sm">
                {data.liveOrders.received.length}
              </span>
            </div>
            <div className="space-y-2.5">
              {data.liveOrders.received.map((o) => (
                <LiveOrderCard
                  key={o.id}
                  order={o}
                  colorClass="bg-amber-50 dark:bg-amber-500/10"
                  accentClass="border-amber-500"
                />
              ))}
              {data.liveOrders.received.length === 0 && (
                <p className="rounded-xl border border-dashed py-6 text-center text-sm text-muted-foreground">
                  No orders
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center gap-2 font-semibold">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
              Preparing
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-sm">
                {data.liveOrders.preparing.length}
              </span>
            </div>
            <div className="space-y-2.5">
              {data.liveOrders.preparing.map((o) => (
                <LiveOrderCard
                  key={o.id}
                  order={o}
                  colorClass="bg-blue-50 dark:bg-blue-500/10"
                  accentClass="border-blue-500"
                />
              ))}
              {data.liveOrders.preparing.length === 0 && (
                <p className="rounded-xl border border-dashed py-6 text-center text-sm text-muted-foreground">
                  No orders
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center gap-2 font-semibold">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              Ready
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-sm">
                {data.liveOrders.ready.length}
              </span>
            </div>
            <div className="space-y-2.5">
              {data.liveOrders.ready.map((o) => (
                <LiveOrderCard
                  key={o.id}
                  order={o}
                  colorClass="bg-emerald-50 dark:bg-emerald-500/10"
                  accentClass="border-emerald-500"
                />
              ))}
              {data.liveOrders.ready.length === 0 && (
                <p className="rounded-xl border border-dashed py-6 text-center text-sm text-muted-foreground">
                  No orders
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Revenue chart + Top items */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4 sm:gap-6">
        <div className="rounded-2xl border bg-card p-4 sm:p-5">
          <h2 className="font-bold text-lg mb-4">Revenue · last 7 days</h2>

          {/* Fixed height; every column fills it, so the bar percentages have a real height to work with */}
          <div className="flex items-stretch justify-between gap-2 sm:gap-3 h-52">
            {data.revenueLast7Days.map((day, idx) => {
              const isToday = idx === data.revenueLast7Days.length - 1;
              const heightPct = (day.revenue / maxRevenue) * 100;
              return (
                <div key={day.date} className="flex-1 min-w-0 flex flex-col items-center gap-2">
                  <span className="text-xs sm:text-sm font-semibold">${day.revenue.toFixed(0)}</span>
                  <div className="flex-1 w-full flex items-end justify-center">
                    <div
                      className={`w-full max-w-[48px] rounded-t-xl rounded-b-sm ${
                        isToday ? 'bg-foreground' : 'bg-muted-foreground/25'
                      }`}
                      style={{ height: `${Math.max(heightPct, 4)}%` }}
                    />
                  </div>
                  <span
                    className={`text-xs sm:text-sm ${
                      isToday ? 'font-bold' : 'text-muted-foreground'
                    }`}
                  >
                    {day.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-4 sm:p-5">
          <h2 className="font-bold text-lg mb-4">Top items today</h2>
          <div className="space-y-1">
            {data.topItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">No orders yet today.</p>
            ) : (
              data.topItems.map((item) => (
                <div key={item.name} className="flex items-center gap-3 py-2">
                  <span className="text-sm sm:text-base w-24 sm:w-28 shrink-0 truncate">
                    {item.name}
                  </span>
                  <div className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-foreground rounded-full"
                      style={{ width: `${(item.count / maxTopItem) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm sm:text-base font-bold w-6 text-right">{item.count}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Tables grid */}
      <div className="rounded-2xl border bg-card p-4 sm:p-5">
        <h2 className="font-bold text-lg mb-4">Tables</h2>
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {data.tablesGrid.map((table) => (
            <div
              key={table.tableNumber}
              className={`flex min-h-[88px] flex-col items-center justify-center rounded-2xl p-3 text-center ${TABLE_STATUS_STYLE[table.status]}`}
            >
              <p className="text-2xl font-extrabold">{table.tableNumber}</p>
              <p className="text-sm font-medium">{TABLE_STATUS_LABEL[table.status]}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}