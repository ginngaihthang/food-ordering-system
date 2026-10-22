import { MoreHorizontal, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSettings } from '@/context/SettingsContext';
import { formatDuration, getTableBadge, isTableInUse } from '@/lib/tables';
import type { RestaurantTable } from '@/types/table';

interface TableCardProps {
  table: RestaurantTable;
  now: number;
  onViewBill: (table: RestaurantTable) => void;
  onViewQr: (table: RestaurantTable) => void;
  onMore: (table: RestaurantTable) => void;
}

export function TableCard({ table, now, onViewBill, onViewQr, onMore }: TableCardProps) {
  const { money } = useSettings();
  const session = table.activeSession ?? null;
  const inUse = isTableInUse(table);
  const paid = session?.paymentStatus === 'PAID';
  const { label, badge, accent } = getTableBadge(table);

  return (
    <article
      className={`flex min-h-[13rem] flex-col rounded-3xl border bg-card p-5 shadow-sm ${
        inUse ? `border-t-4 ${accent}` : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-2xl font-black tracking-tight">Table {table.tableNumber}</h3>
        <span
          className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold tracking-widest ${badge}`}
        >
          {label}
        </span>
      </div>

      <p className="mt-1 text-muted-foreground">
        {session
          ? `${formatDuration(session.startedAt, now)} · ${session.orderCount} ${
              session.orderCount === 1 ? 'order' : 'orders'
            }`
          : inUse
            ? 'In use'
            : 'Free'}
      </p>

      {session && (
        <div className="mt-2">
          <p className="text-3xl font-black tracking-tight">{money(session.total)}</p>
          {paid && (
            <p className="text-sm font-medium text-emerald-700">
              Paid · {session.paymentMethod === 'ONLINE' ? 'Online' : 'Cash'}
            </p>
          )}
        </div>
      )}

      <div className="mt-auto flex items-center gap-2 pt-5">
        {inUse && (
          <Button
            type="button"
            variant={paid ? 'outline' : 'default'}
            className="h-12 flex-1 whitespace-nowrap rounded-2xl px-3 text-[15px] font-bold"
            onClick={() => onViewBill(table)}
          >
            View bill
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          className="h-12 flex-1 gap-2 rounded-2xl px-3 text-[15px] font-bold"
          onClick={() => onViewQr(table)}
        >
          <QrCode className="h-4 w-4" />
          QR
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-12 w-12 shrink-0 rounded-2xl"
          aria-label={`More actions for table ${table.tableNumber}`}
          onClick={() => onMore(table)}
        >
          <MoreHorizontal className="h-5 w-5" />
        </Button>
      </div>
    </article>
  );
}