import type { RestaurantTable } from '@/types/table';

export function isTableInUse(table: RestaurantTable): boolean {
  return Boolean(table.activeSession) || table.status === 'OCCUPIED';
}

export function formatDuration(startedAt: string, now: number): string {
  const minutes = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 60000));
  if (minutes < 90) return `${minutes} min`;
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`;
}

export function getTableBadge(table: RestaurantTable) {
  if (table.activeSession?.paymentStatus === 'PAID') {
    return { label: 'PAID', badge: 'bg-emerald-100 text-emerald-800', accent: 'border-t-emerald-600' };
  }
  if (isTableInUse(table)) {
    return { label: 'OCCUPIED', badge: 'bg-amber-100 text-amber-800', accent: 'border-t-amber-600' };
  }
  return { label: 'AVAILABLE', badge: 'bg-muted text-muted-foreground', accent: '' };
}