import { useEffect, useState } from 'react';
import { QrCode, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useSettings } from '@/context/SettingsContext';
import { usePermissions } from '@/hooks/usePermissions';
import type { RestaurantTable } from '@/types/table';

interface TableListTableProps {
  tables: RestaurantTable[];
  onViewQr: (table: RestaurantTable) => void;
  onViewBill: (table: RestaurantTable) => void;
  onDelete: (id: number) => void;
}

function formatDuration(startedAt: string): string {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 60000));
  if (minutes < 90) return `${minutes} min`;
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`;
}

function getBadge(table: RestaurantTable) {
  if (table.activeSession?.paymentStatus === 'PAID') {
    return { label: 'PAID', className: 'bg-emerald-100 text-emerald-800' };
  }
  if (table.activeSession || table.status === 'OCCUPIED') {
    return { label: 'OCCUPIED', className: 'bg-amber-100 text-amber-800' };
  }
  return { label: 'AVAILABLE', className: 'bg-muted text-muted-foreground' };
}

export function TableListTable({ tables, onViewQr, onViewBill, onDelete }: TableListTableProps) {
  const { money } = useSettings();
  const { canDelete } = usePermissions();
  const [, setTick] = useState(0);

  // Re-render every 30 seconds so "65 min" keeps counting
  useEffect(() => {
    const timer = window.setInterval(() => setTick((n) => n + 1), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  if (tables.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed py-12 text-center text-muted-foreground">
        No tables found.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tables.map((table) => {
        const session = table.activeSession ?? null;
        const badge = getBadge(table);
        const inUse = session !== null || table.status === 'OCCUPIED';
        const paid = session?.paymentStatus === 'PAID';

        return (
          <div
            key={table.id}
            className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-3 rounded-3xl border bg-card px-5 py-4 shadow-sm sm:grid-cols-[minmax(0,1fr)_9.5rem_minmax(0,1fr)_auto] sm:px-6"
          >
            {/* Table name and how long it has been open */}
            <div className="min-w-0">
              <p className="truncate text-xl font-bold">Table {table.tableNumber}</p>
              <p className="text-sm text-muted-foreground">
                {session
                  ? `${formatDuration(session.startedAt)} · ${session.orderCount} ${
                      session.orderCount === 1 ? 'order' : 'orders'
                    }`
                  : inUse
                    ? 'In use'
                    : 'Free'}
              </p>
            </div>

            {/* Status */}
            <div className="sm:justify-self-start">
              <span
                className={`inline-block rounded-full px-3.5 py-1.5 text-xs font-bold tracking-wide ${badge.className}`}
              >
                {badge.label}
              </span>
            </div>

            {/* Total */}
            <div className="col-span-2 sm:col-span-1">
              {session ? (
                <>
                  <p className="text-xl font-bold">{money(session.total)}</p>
                  <p className="text-sm text-muted-foreground">
                    {paid
                      ? `Paid · ${session.paymentMethod === 'ONLINE' ? 'Online' : 'Cash'}`
                      : session.orderCount === 0
                        ? 'No orders yet'
                        : 'Unpaid'}
                  </p>
                </>
              ) : (
                <p className="text-muted-foreground">—</p>
              )}
            </div>

            {/* Actions */}
            <div className="col-span-2 flex items-center justify-end gap-2 sm:col-span-1">
              <Button
                variant="outline"
                className="gap-2 rounded-full"
                onClick={() => onViewQr(table)}
              >
                <QrCode className="h-4 w-4" />
                QR
              </Button>

              {inUse && (
                <Button
                  variant={paid ? 'outline' : 'default'}
                  className="rounded-full"
                  onClick={() => onViewBill(table)}
                >
                  View bill
                </Button>
              )}

              {canDelete && (
                <span title={inUse ? "Can't delete a table that is in use" : 'Delete table'}>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={inUse}
                    onClick={() => onDelete(table.id)}
                    aria-label={`Delete table ${table.tableNumber}`}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}