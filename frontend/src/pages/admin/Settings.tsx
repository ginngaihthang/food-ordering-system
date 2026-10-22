import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { RestaurantTab } from '@/components/settings/RestaurantTab';
import { OrdersTab } from '@/components/settings/OrdersTab';
import { PaymentsTab } from '@/components/settings/PaymentsTab';
import { SecurityTab } from '@/components/settings/SecurityTab';
import { SystemTab } from '@/components/settings/SystemTab';
import { useSettings } from '@/context/SettingsContext';
import { usePermissions } from '@/hooks/usePermissions';
import { useSaveStatus } from '@/hooks/useSaveStatus';
import { useSocketStatus } from '@/hooks/useSocketStatus';
import type { SaveSettings } from '@/types/settings';

const ALL_TABS = [
  { key: 'restaurant', label: 'Restaurant', adminOnly: true },
  { key: 'orders', label: 'Orders', adminOnly: true },
  { key: 'security', label: 'Users & Security', adminOnly: false },
  { key: 'payments', label: 'Payments', adminOnly: true },
  { key: 'system', label: 'System', adminOnly: true },
] as const;

export default function Settings() {
  const { settings, loading, updateSettings } = useSettings();
  const { isAdmin } = usePermissions();
  const live = useSocketStatus();
  const { status, error, run } = useSaveStatus();
  const [searchParams, setSearchParams] = useSearchParams();

  // Staff only see the account tab
  const tabs = useMemo(() => ALL_TABS.filter((tab) => isAdmin || !tab.adminOnly), [isAdmin]);
  const active = (tabs.find((tab) => tab.key === searchParams.get('tab')) ?? tabs[0])?.key;

  const save: SaveSettings = (patch) => run(() => updateSettings(patch));

  let subtitle = 'Manage your account.';
  let subtitleClass = 'text-muted-foreground';
  if (isAdmin) {
    if (status === 'saving') subtitle = 'Saving...';
    else if (status === 'saved') {
      subtitle = 'Saved ✓';
      subtitleClass = 'text-emerald-600';
    } else if (status === 'error') {
      subtitle = error;
      subtitleClass = 'text-red-600';
    } else subtitle = 'Changes save automatically.';
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Settings</h2>
          <p className={`mt-1 ${subtitleClass}`}>{subtitle}</p>
        </div>

        <div
          className={`flex items-center gap-1.5 text-sm font-medium ${
            live ? 'text-emerald-600' : 'text-red-600'
          }`}
        >
          <span className={`h-2 w-2 rounded-full ${live ? 'bg-emerald-500' : 'bg-red-500'}`} />
          {live ? 'Live' : 'Offline'}
        </div>
      </div>

      {tabs.length > 1 && (
        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setSearchParams({ tab: tab.key }, { replace: true })}
              className={`shrink-0 whitespace-nowrap rounded-full border px-5 py-2.5 text-sm font-medium transition-colors ${
                active === tab.key
                  ? 'border-foreground bg-foreground text-background'
                  : 'bg-card hover:bg-muted'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {loading && active !== 'security' ? (
        <Skeleton className="h-64 w-full rounded-2xl" />
      ) : (
        <>
          {active === 'restaurant' && <RestaurantTab settings={settings} save={save} />}
          {active === 'orders' && <OrdersTab settings={settings} save={save} />}
          {active === 'security' && <SecurityTab />}
          {active === 'payments' && <PaymentsTab settings={settings} save={save} />}
          {active === 'system' && <SystemTab />}
        </>
      )}
    </div>
  );
}